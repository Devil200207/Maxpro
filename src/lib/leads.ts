import { advertiserById, planById } from "./data";
import { uid, type AiUsageEntry, type Channel, type DemoState, type Lead, type NotificationLog } from "./store";

/**
 * Central lead pipeline (LED-01..06). Every channel — web form, WhatsApp, AI chat, Meta,
 * portals — goes through createLead so duplicate detection, assignment, scoring and
 * routing behave the same way everywhere.
 */

export type LeadSource = Channel | "portal";

export const leadSourceOf = (l: Lead): LeadSource => (l.portalId ? "portal" : l.channel);

const digits = (p?: string) => (p ?? "").replace(/\D/g, "").slice(-8);

export interface NewLeadInput {
  listingId?: string;
  advertiserId: string;
  name: string;
  phone?: string;
  channel: Channel;
  message: string;
  source?: string;
  portalId?: string;
  score?: number;
  /** Signals for the scoring heuristic. */
  signals?: { turns?: number; listings?: number; viewing?: boolean; budgetStated?: boolean; financing?: boolean };
  actor?: string;
}

/** Lead-quality heuristic (WP-SUP-05 / LED-04 basic): 0–100. */
export function scoreLead(i: NewLeadInput): number {
  const s = i.signals ?? {};
  let v = 40;
  if (digits(i.phone).length === 8) v += 15;
  if (i.listingId) v += 8;
  v += Math.min(16, (s.turns ?? 0) * 4);
  if ((s.listings ?? 0) > 1) v += 4;
  if (s.viewing || /viewing|معاينة|visit/i.test(i.message)) v += 12;
  if (s.budgetStated || /budget|qar|ر\.ق|\d{4,}/i.test(i.message)) v += 5;
  if (s.financing || /cash|pre-?approved|mortgage/i.test(i.message)) v += 6;
  if (i.channel === "meta") v += 3;
  return Math.max(10, Math.min(98, v));
}

/** LED-03: same phone for the same advertiser, or same name on the same listing. */
export function findDuplicate(leads: Lead[], i: { advertiserId: string; phone?: string; name: string; listingId?: string; id?: string }) {
  const p = digits(i.phone);
  return leads.find(
    (l) =>
      l.id !== i.id &&
      !l.duplicateOf &&
      l.advertiserId === i.advertiserId &&
      ((p.length >= 7 && digits(l.phone) === p) ||
        (!!i.listingId && l.listingId === i.listingId && l.name.trim().toLowerCase() === i.name.trim().toLowerCase())),
  );
}

/** Assignment rule: listing's assigned agent, else the org agent with the fewest open leads. */
export function pickAssignee(state: DemoState, advertiserId: string, listingId?: string): string | undefined {
  const listing = listingId ? state.listings.find((l) => l.id === listingId) : undefined;
  if (listing?.assignedAgentId) return listing.assignedAgentId;
  const orgId = advertiserById(advertiserId).orgId;
  const agents = (state.team ?? []).filter((m) => m.orgId === orgId && m.role === "agent" && m.status === "active");
  if (!agents.length) return undefined;
  const load = (id: string) => state.leads.filter((l) => l.assignee === id && l.status !== "closed" && !l.duplicateOf).length;
  return [...agents].sort((a, b) => load(a.id) - load(b.id))[0].id;
}

/** FR-WAP-08 plan rules: which channels a new lead is delivered on. */
export function routingChannels(advertiserId: string): NotificationLog["channel"][] {
  const plan = planById(advertiserById(advertiserId).planId);
  return plan.features.whatsappLeads && plan.id !== "starter" ? ["whatsapp", "email", "inapp"] : ["email", "inapp"];
}

export interface CreateLeadResult {
  state: DemoState;
  lead: Lead;
  merged: boolean;
  channels: NotificationLog["channel"][];
}

/** Adds a lead (or merges it into an existing duplicate) and routes it to the advertiser. */
export function createLead(state: DemoState, input: NewLeadInput): CreateLeadResult {
  const now = new Date().toISOString();
  const adv = advertiserById(input.advertiserId);
  const channels = routingChannels(input.advertiserId);
  const score = input.score ?? scoreLead(input);
  const dup = findDuplicate(state.leads, input);
  const notifications: NotificationLog[] = channels.map((c) => ({
    id: uid("N"),
    at: now,
    channel: c,
    to: c === "email" ? `leads@${adv.orgId.replace("org-", "")}.qa` : c === "inapp" ? "Agency dashboard" : adv.phone,
    template: dup ? "lead_repeat_enquiry" : "new_lead_routed",
    status: "sent",
  }));

  if (dup) {
    const lead: Lead = {
      ...dup,
      score: Math.max(dup.score ?? 0, score),
      status: dup.status === "closed" ? "new" : dup.status,
      notes: [
        ...(dup.notes ?? []),
        { id: uid("N"), at: now, by: "System", text: `Repeat enquiry via ${input.source ?? input.channel}: ${input.message.slice(0, 160)}` },
      ],
    };
    return {
      lead,
      merged: true,
      channels,
      state: {
        ...state,
        leads: state.leads.map((l) => (l.id === dup.id ? lead : l)),
        notifications: [...notifications, ...state.notifications],
        audit: [
          { id: uid("A"), at: now, actor: input.actor ?? "System", role: "system", action: "lead.duplicate_merged", target: dup.id, detail: `channel=${input.channel}` },
          ...state.audit,
        ],
      },
    };
  }

  const lead: Lead = {
    id: uid("L"),
    listingId: input.listingId,
    advertiserId: input.advertiserId,
    name: input.name,
    phone: input.phone,
    channel: input.channel,
    message: input.message,
    createdAt: now,
    status: "new",
    score,
    source: input.source,
    portalId: input.portalId,
    assignee: pickAssignee(state, input.advertiserId, input.listingId),
    tasks: [{ id: uid("T"), title: "First response to new lead", due: new Date(Date.now() + 2 * 3600000).toISOString(), done: false }],
    notes: [],
  };
  return {
    lead,
    merged: false,
    channels,
    state: {
      ...state,
      leads: [lead, ...state.leads],
      notifications: [...notifications, ...state.notifications],
      audit: [
        {
          id: uid("A"),
          at: now,
          actor: input.actor ?? "System",
          role: input.channel === "ai" ? "ai" : "system",
          action: "lead.created",
          target: lead.id,
          detail: `listing=${input.listingId ?? "-"} score=${score} routed=${channels.join("+")}${lead.assignee ? ` assignee=${lead.assignee}` : ""}`,
        },
        ...state.audit,
      ],
    },
  };
}

// ---------- AI credits (AIS-05 / BIL-09) ----------

export function aiCreditsFor(state: DemoState, orgId: string) {
  const adv = (state.advertisers ?? []).find((a) => a.orgId === orgId);
  const quota = adv ? planById(adv.planId).quotas.aiCredits : 0;
  const used = (state.aiUsage ?? []).filter((u) => u.orgId === orgId).reduce((s, u) => s + u.credits, 0);
  return { quota, used, left: Math.max(0, quota - used) };
}

export function addAiUsage(state: DemoState, orgId: string, feature: AiUsageEntry["feature"], credits: number, detail?: string): DemoState {
  return { ...state, aiUsage: [{ id: uid("AI"), orgId, at: new Date().toISOString(), feature, credits, detail }, ...(state.aiUsage ?? [])] };
}

// ---------- Reporting helpers (LED-06) ----------

export function responseMinutes(l: Lead) {
  if (!l.firstResponseAt) return undefined;
  return Math.max(0, Math.round((new Date(l.firstResponseAt).getTime() - new Date(l.createdAt).getTime()) / 60000));
}

export const isOverdue = (l: Lead, now: number) => (l.tasks ?? []).some((t) => !t.done && new Date(t.due).getTime() < now);
