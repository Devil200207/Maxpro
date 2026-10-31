"use client";

/**
 * Mock portal "servers" (HUB-11). They keep their own record of items they hold
 * (in localStorage, separate from AqarPro data) so duplicate prevention can be shown:
 * Portal B accepts the first submission but the response times out; the retry with the
 * same idempotency key is matched to the item it already holds instead of creating a second one.
 */

export interface RemoteItem {
  externalId: string;
  /** Canonical identity = listing id + creation time (listing ids can be reused after a demo reset). */
  canonicalKey: string;
  listingId: string;
  idempotencyKeys: string[];
  version: number;
  status: "active" | "removed";
  createdAt: string;
}

type Registry = Record<string, RemoteItem[]>;

const KEY = "aqarpro-mock-portals";

function load(): Registry {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Registry;
  } catch {
    return {};
  }
}
function save(r: Registry) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {}
}

export function remoteItems(portalId: string, canonicalKey?: string) {
  const items = load()[portalId] ?? [];
  return canonicalKey ? items.filter((i) => i.canonicalKey === canonicalKey) : items;
}

export type PortalResponse =
  | { kind: "created"; code: number; externalId: string; ms: number }
  | { kind: "updated"; code: number; externalId: string; ms: number }
  | { kind: "existing"; code: number; externalId: string; ms: number }
  | { kind: "removed"; code: number; externalId: string; ms: number }
  | { kind: "timeout"; ms: number }
  | { kind: "error"; code: number; message: string; ms: number };

export interface SubmitArgs {
  portalId: string;
  action: "create" | "update" | "unpublish" | "status";
  listingId: string;
  canonicalKey: string;
  idempotencyKey: string;
  version: number;
  externalId?: string;
  attempt: number;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newId = (portalId: string) => `${portalId === "portal-a" ? "PA" : "PB"}-${Math.floor(100000 + Math.random() * 899999)}`;

/** Simulated network call to the portal. Latency is short so the demo stays snappy. */
export async function submitToPortal(a: SubmitArgs): Promise<PortalResponse> {
  const isB = a.portalId === "portal-b";
  const latency = isB ? 1400 : 900;
  const reg = load();
  const items = reg[a.portalId] ?? (reg[a.portalId] = []);
  const byKey = items.find((i) => i.idempotencyKeys.includes(a.idempotencyKey));
  const byCanonical = items.find((i) => i.canonicalKey === a.canonicalKey && i.status === "active");

  if (a.action === "unpublish") {
    await wait(latency);
    if (isB) return { kind: "error", code: 501, message: "Unpublish is not supported by this portal", ms: latency };
    const it = items.find((i) => i.externalId === a.externalId);
    if (it) it.status = "removed";
    save(reg);
    return { kind: "removed", code: 200, externalId: a.externalId ?? "", ms: latency };
  }

  if (a.action === "status") {
    await wait(500);
    const it = byKey ?? byCanonical ?? items.find((i) => i.externalId === a.externalId);
    if (!it) return { kind: "error", code: 404, message: "Item not found on portal", ms: 500 };
    return { kind: "existing", code: 200, externalId: it.externalId, ms: 500 };
  }

  // create / update
  if (byKey) {
    // Same request seen before (e.g. the earlier attempt timed out after the portal accepted it).
    await wait(latency);
    return { kind: "existing", code: 409, externalId: byKey.externalId, ms: latency };
  }

  if (a.action === "update" && (a.externalId || byCanonical)) {
    const it = items.find((i) => i.externalId === a.externalId) ?? byCanonical;
    if (it) {
      it.version = a.version;
      it.idempotencyKeys.push(a.idempotencyKey);
    }
    save(reg);
    await wait(latency);
    return { kind: "updated", code: 200, externalId: a.externalId ?? it!.externalId, ms: latency };
  }

  if (byCanonical) {
    // Create for a listing the portal already holds → external ID management, never a second item.
    byCanonical.idempotencyKeys.push(a.idempotencyKey);
    byCanonical.version = a.version;
    save(reg);
    await wait(latency);
    return { kind: "existing", code: 409, externalId: byCanonical.externalId, ms: latency };
  }

  const item: RemoteItem = {
    externalId: newId(a.portalId),
    canonicalKey: a.canonicalKey,
    listingId: a.listingId,
    idempotencyKeys: [a.idempotencyKey],
    version: a.version,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  items.push(item);
  save(reg);

  // Portal B: the feed accepts the very first submission but the response never arrives.
  if (isB && a.attempt === 1) {
    await wait(3000);
    return { kind: "timeout", ms: 3000 };
  }
  await wait(latency);
  return { kind: "created", code: 201, externalId: item.externalId, ms: latency };
}

/** Lead retrieval (Portal A only — Portal B has no lead API). */
export async function fetchPortalLeads(portalId: string, listingId: string) {
  await wait(800);
  if (portalId !== "portal-a") return [];
  return [
    { name: "Khalid Al-Sulaiti", phone: "+974 5533 7710", message: `Portal A enquiry on ${listingId}: is it still available next month?` },
    { name: "Maria Santos", phone: "+974 3390 2214", message: `Portal A enquiry on ${listingId}: can I bring a small dog?` },
  ];
}
