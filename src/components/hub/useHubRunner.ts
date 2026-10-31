"use client";

import { useEffect } from "react";
import { submitToPortal, type PortalResponse } from "@/lib/hub/mockPortals";
import { portalById } from "@/lib/portals";
import { uid, useStore, type DemoState, type PublishJob } from "@/lib/store";

/**
 * Client-side stand-in for the durable background worker (HUB-05). Jobs live in the
 * store (so they survive reloads); in-flight work and backoff timers live here.
 * A job found "running" with no worker attached (e.g. after a reload) is shown as
 * "unknown — reconcile" instead of being silently re-sent (NFR-REL-01).
 */

const inFlight = new Set<string>();
const scheduled = new Set<string>();
const PER_PORTAL_CONCURRENCY = 2;
let latestUpdate: ((fn: (s: DemoState) => DemoState) => void) | null = null;

export const isInterrupted = (j: PublishJob) => j.status === "running" && !inFlight.has(j.id);

const now = () => new Date().toISOString();

function patchJob(s: DemoState, id: string, patch: Partial<PublishJob>, log?: PublishJob["log"][number]): DemoState {
  return {
    ...s,
    publishJobs: s.publishJobs.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: now(), log: log ? [...j.log, log] : j.log } : j)),
  };
}

function applyResult(s: DemoState, job: PublishJob, res: PortalResponse): DemoState {
  const portal = portalById(job.portalId);
  const ts = now();
  const hubAudit = (action: string, detail: string) => ({ id: uid("A"), at: ts, actor: "Integration Hub", role: "system" as const, action, target: job.listingId, detail });
  if (res.kind === "created" || res.kind === "updated" || res.kind === "existing" || res.kind === "removed") {
    const msg =
      res.kind === "created"
        ? `${res.code} Created → ${res.externalId} (${res.ms} ms)`
        : res.kind === "updated"
          ? `${res.code} OK → ${res.externalId} updated (${res.ms} ms)`
          : res.kind === "removed"
            ? `${res.code} OK → ${res.externalId} unpublished`
            : `${res.code} — portal already holds ${res.externalId} for this listing / idempotency key → linked to the existing item, no duplicate created`;
    const next = patchJob(s, job.id, { status: "succeeded" }, { at: ts, level: "info", msg });
    return {
      ...next,
      portalListings: next.portalListings.map((p) =>
        p.id === job.portalListingId
          ? {
              ...p,
              status: res.kind === "removed" ? "unpublished" : "published",
              externalId: res.externalId,
              lastSyncAt: ts,
              lastKnownStatus: res.kind === "removed" ? "removed" : "active",
              updatedAt: ts,
            }
          : p,
      ),
      audit: [hubAudit(res.kind === "removed" ? "hub.unpublished" : "hub.published", `${portal.name.en} ${res.externalId}${res.kind === "existing" ? " (deduplicated)" : ""}`), ...next.audit],
    };
  }
  if (res.kind === "timeout") {
    const next = patchJob(
      s,
      job.id,
      { status: "timeout" },
      { at: ts, level: "warn", msg: `No response after ${(res.ms / 1000).toFixed(1)} s — outcome unknown (the portal may already have accepted it)` },
    );
    return {
      ...next,
      portalListings: next.portalListings.map((p) => (p.id === job.portalListingId ? { ...p, status: "timeout", updatedAt: ts } : p)),
      audit: [hubAudit("hub.publish_timeout", `${portal.name.en} attempt ${job.attempt}`), ...next.audit],
    };
  }
  const next = patchJob(s, job.id, { status: "failed" }, { at: ts, level: "error", msg: `${res.code} ${res.message}` });
  return {
    ...next,
    portalListings: next.portalListings.map((p) => (p.id === job.portalListingId ? { ...p, status: p.externalId ? "published" : "failed", updatedAt: ts } : p)),
    audit: [hubAudit("hub.publish_failed", `${portal.name.en}: ${res.message}`), ...next.audit],
  };
}

async function run(job: PublishJob, state: DemoState) {
  const update = latestUpdate;
  if (!update) return;
  const pl = state.portalListings.find((p) => p.id === job.portalListingId);
  const listing = state.listings.find((l) => l.id === job.listingId);
  if (!pl || !listing) return;
  inFlight.add(job.id);
  const portal = portalById(job.portalId);
  const verb = job.action === "create" ? "POST /listings" : job.action === "update" ? `PUT /listings/${pl.externalId ?? "?"}` : job.action === "unpublish" ? `DELETE /listings/${pl.externalId}` : "GET status";
  update((s) => {
    const next = patchJob(s, job.id, { status: "running" }, { at: now(), level: "info", msg: `Attempt ${job.attempt}/${job.maxAttempts}: ${portal.name.en} ${verb} · Idempotency-Key ${job.idempotencyKey}` });
    return { ...next, portalListings: next.portalListings.map((p) => (p.id === job.portalListingId ? { ...p, status: "publishing" } : p)) };
  });
  let res: PortalResponse;
  try {
    res = await submitToPortal({
      portalId: job.portalId,
      action: job.action,
      listingId: job.listingId,
      canonicalKey: `${listing.id}@${listing.createdAt}`,
      idempotencyKey: job.idempotencyKey,
      version: pl.payloadVersion,
      externalId: pl.externalId,
      attempt: job.attempt,
    });
  } catch (e) {
    res = { kind: "error", code: 500, message: String(e), ms: 0 };
  }
  (latestUpdate ?? update)((s) => applyResult(s, job, res));
  inFlight.delete(job.id);
}

function scheduleRetry(job: PublishJob) {
  if (scheduled.has(job.id)) return;
  scheduled.add(job.id);
  const delay = 1500 * job.attempt; // demo-friendly exponential-ish backoff
  setTimeout(() => {
    scheduled.delete(job.id);
    latestUpdate?.((s) => {
      const j = s.publishJobs.find((x) => x.id === job.id);
      if (!j || j.status !== "timeout") return s;
      return patchJob(
        s,
        job.id,
        { status: "retrying", attempt: j.attempt + 1 },
        { at: now(), level: "info", msg: `Retry ${j.attempt + 1} after ${(delay / 1000).toFixed(1)} s backoff — same idempotency key ${j.idempotencyKey}` },
      );
    });
  }, delay);
}

/** Mount wherever publishing can happen. Several mounts in one tab share the same worker state. */
export function useHubRunner() {
  const { state, update, ready } = useStore();
  useEffect(() => {
    latestUpdate = update;
  }, [update]);
  useEffect(() => {
    if (!ready) return;
    latestUpdate = update;
    const running = (portalId: string) => state.publishJobs.filter((j) => j.portalId === portalId && inFlight.has(j.id)).length;
    for (const j of [...state.publishJobs].reverse()) {
      if ((j.status === "queued" || j.status === "retrying") && !inFlight.has(j.id)) {
        if (running(j.portalId) >= PER_PORTAL_CONCURRENCY) continue; // HUB-10 rate limiting
        void run(j, state);
      } else if (j.status === "timeout" && j.attempt < j.maxAttempts && !inFlight.has(j.id)) {
        scheduleRetry(j);
      }
    }
  }, [state, update, ready]);
}

/** Reconcile an interrupted job: ask the portal whether it holds the item before re-sending. */
export async function reconcileJob(job: PublishJob, state: DemoState, update: (fn: (s: DemoState) => DemoState) => void) {
  const pl = state.portalListings.find((p) => p.id === job.portalListingId);
  const listing = state.listings.find((l) => l.id === job.listingId);
  if (!pl || !listing) return;
  inFlight.add(job.id);
  const res = await submitToPortal({
    portalId: job.portalId,
    action: "status",
    listingId: job.listingId,
    canonicalKey: `${listing.id}@${listing.createdAt}`,
    idempotencyKey: job.idempotencyKey,
    version: pl.payloadVersion,
    externalId: pl.externalId,
    attempt: job.attempt,
  });
  inFlight.delete(job.id);
  if (res.kind === "existing" && job.action !== "unpublish") {
    update((s) =>
      applyResult(
        patchJob(s, job.id, {}, { at: now(), level: "info", msg: `Reconcile: status check found ${res.externalId} on the portal` }),
        job,
        { ...res, code: 200 },
      ),
    );
  } else {
    update((s) => patchJob(s, job.id, { status: "queued" }, { at: now(), level: "info", msg: "Reconcile: portal does not hold the item → safely re-queued with the same idempotency key" }));
  }
}
