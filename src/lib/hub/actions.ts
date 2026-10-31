import type { Listing } from "../data";
import { uid, type AuditEntry, type DemoState, type PortalListing, type PublishJob } from "../store";
import { buildPayload, idempotencyKey, payloadHash, validateForPortal, type FixableField } from "./engine";

/** Pure state transforms for the Hub, applied through useStore().update(). */

const now = () => new Date().toISOString();

type Actor = { name: string; role: AuditEntry["role"] };

function auditEntry(actor: Actor, action: string, target: string, detail?: string): AuditEntry {
  return { id: uid("A"), at: now(), actor: actor.name, role: actor.role, action, target, detail };
}

/**
 * Build (or rebuild) the portal-specific versions of a canonical listing (FR-LST-12).
 * A new payload version is created only when the mapped payload actually changed.
 */
export function prepareVersions(s: DemoState, listingId: string, portalIds: string[], actor: Actor): DemoState {
  const l = s.listings.find((x) => x.id === listingId);
  if (!l) return s;
  let portalListings = [...s.portalListings];
  const audit: AuditEntry[] = [];
  for (const portalId of portalIds) {
    const payload = buildPayload(l, portalId);
    const issues = validateForPortal(l, portalId);
    const existing = portalListings.find((p) => p.listingId === listingId && p.portalId === portalId);
    const changed = !existing?.payload || payloadHash(existing.payload) !== payloadHash(payload);
    const busy = existing && ["queued", "publishing"].includes(existing.status);
    if (busy) continue;
    const version = existing ? (changed ? existing.payloadVersion + 1 : existing.payloadVersion) : 1;
    const status: PortalListing["status"] = issues.length
      ? "needs_fix"
      : existing && !changed && existing.status !== "needs_fix"
        ? existing.status
        : "draft";
    const next: PortalListing = {
      id: existing?.id ?? uid("PL"),
      orgId: l.orgId,
      listingId,
      portalId,
      status,
      externalId: existing?.externalId,
      payload,
      payloadVersion: version,
      issues,
      lastSyncAt: existing?.lastSyncAt,
      lastKnownStatus: existing?.lastKnownStatus,
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };
    portalListings = existing ? portalListings.map((p) => (p.id === existing.id ? next : p)) : [...portalListings, next];
    audit.push(
      auditEntry(actor, issues.length ? "hub.validation_failed" : "hub.version_built", listingId, `${portalId} v${version}${issues.length ? ` · ${issues.map((i) => i.field).join(", ")}` : ""}`),
    );
  }
  return { ...s, portalListings, audit: [...audit.reverse(), ...s.audit] };
}

/** Fix a field flagged by a portal. The fix lands on the canonical record, then versions are rebuilt. */
export function fixField(s: DemoState, listingId: string, field: FixableField, value: string, actor: Actor): DemoState {
  const l = s.listings.find((x) => x.id === listingId);
  if (!l) return s;
  let next: Listing = l;
  let from = "";
  if (field === "floor") {
    from = l.floor === undefined ? "" : String(l.floor);
    next = { ...l, floor: Number(value) };
  } else if (field === "permitNo") {
    from = l.permitNo ?? "";
    next = { ...l, permitNo: value.trim().toUpperCase() };
  } else if (field === "titleEn") {
    from = l.title.en;
    next = { ...l, title: { ...l.title, en: value } };
  } else {
    from = l.title.ar;
    next = { ...l, title: { ...l.title, ar: value } };
  }
  const withListing: DemoState = {
    ...s,
    listings: s.listings.map((x) => (x.id === listingId ? next : x)),
    changeLog: [{ id: uid("CH"), listingId, at: now(), actor: actor.name, field, from, to: value }, ...s.changeLog],
  };
  const portalIds = s.portalListings.filter((p) => p.listingId === listingId).map((p) => p.portalId);
  return prepareVersions(withListing, listingId, portalIds, actor);
}

/** Agent asks a manager to approve publishing (status "ready" = awaiting approval). */
export function requestApproval(s: DemoState, plIds: string[], actor: Actor): DemoState {
  return {
    ...s,
    portalListings: s.portalListings.map((p) => (plIds.includes(p.id) && p.status === "draft" ? { ...p, status: "ready", updatedAt: now() } : p)),
    audit: [auditEntry(actor, "hub.approval_requested", plIds.join(","), `${plIds.length} destination(s)`), ...s.audit],
  };
}

/** Approve publishing and enqueue one durable job per destination (HUB-05). */
export function approveAndQueue(s: DemoState, plIds: string[], actor: Actor): DemoState {
  const jobs: PublishJob[] = [];
  const portalListings = s.portalListings.map((p) => {
    if (!plIds.includes(p.id) || p.issues.length || !["draft", "ready", "failed", "timeout", "published"].includes(p.status)) return p;
    jobs.push({
      id: uid("J"),
      orgId: p.orgId,
      portalListingId: p.id,
      portalId: p.portalId,
      listingId: p.listingId,
      action: p.externalId ? "update" : "create",
      status: "queued",
      idempotencyKey: idempotencyKey(p.listingId, p.portalId, p.payloadVersion),
      attempt: 1,
      maxAttempts: 5,
      createdAt: now(),
      updatedAt: now(),
      log: [{ at: now(), level: "info", msg: `Approved by ${actor.name} · queued ${p.externalId ? "update" : "create"} (payload v${p.payloadVersion})` }],
    });
    return { ...p, status: "queued" as const, updatedAt: now() };
  });
  return {
    ...s,
    portalListings,
    publishJobs: [...jobs, ...s.publishJobs],
    audit: [auditEntry(actor, "hub.publish_approved", plIds.join(","), `${jobs.length} job(s) queued`), ...s.audit],
  };
}

/** Queue an unpublish job — only where the portal declares the capability (HUB-06). */
export function queueUnpublish(s: DemoState, plId: string, actor: Actor): DemoState {
  const p = s.portalListings.find((x) => x.id === plId);
  if (!p?.externalId) return s;
  const job: PublishJob = {
    id: uid("J"),
    orgId: p.orgId,
    portalListingId: p.id,
    portalId: p.portalId,
    listingId: p.listingId,
    action: "unpublish",
    status: "queued",
    idempotencyKey: `${idempotencyKey(p.listingId, p.portalId, p.payloadVersion)}-unpublish`,
    attempt: 1,
    maxAttempts: 3,
    createdAt: now(),
    updatedAt: now(),
    log: [{ at: now(), level: "info", msg: `Unpublish requested by ${actor.name}` }],
  };
  return {
    ...s,
    portalListings: s.portalListings.map((x) => (x.id === plId ? { ...x, status: "queued", updatedAt: now() } : x)),
    publishJobs: [job, ...s.publishJobs],
    audit: [auditEntry(actor, "hub.unpublish_requested", p.listingId, p.portalId), ...s.audit],
  };
}

/** Manual reprocess of a failed / stuck job (HUB-07). Keeps the same idempotency key. */
export function reprocessJob(s: DemoState, jobId: string, actor: Actor): DemoState {
  return {
    ...s,
    publishJobs: s.publishJobs.map((j) =>
      j.id === jobId
        ? { ...j, status: "queued", attempt: Math.min(j.attempt + 1, j.maxAttempts), updatedAt: now(), log: [...j.log, { at: now(), level: "info", msg: `Manual reprocess by ${actor.name} (same idempotency key)` }] }
        : j,
    ),
    audit: [auditEntry(actor, "hub.job_reprocessed", jobId), ...s.audit],
  };
}

export function cancelJob(s: DemoState, jobId: string, actor: Actor): DemoState {
  const j = s.publishJobs.find((x) => x.id === jobId);
  return {
    ...s,
    publishJobs: s.publishJobs.map((x) => (x.id === jobId ? { ...x, status: "cancelled", updatedAt: now(), log: [...x.log, { at: now(), level: "warn", msg: `Cancelled by ${actor.name}` }] } : x)),
    portalListings: s.portalListings.map((p) => (j && p.id === j.portalListingId && p.status === "queued" ? { ...p, status: p.externalId ? "published" : "draft" } : p)),
    audit: [auditEntry(actor, "hub.job_cancelled", jobId), ...s.audit],
  };
}
