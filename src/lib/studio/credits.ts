"use client";

import { advertiserById, planById } from "../data";
import { uid, useStore, type AiUsageEntry } from "../store";

/** Credit cost per AI action — each intake method is priced separately (AIS-01). */
export const AI_COST = {
  text: 2,
  document: 5,
  voice: 4,
  photoTag: 1,
  write: 3,
  check: 1,
} as const;

const WINDOW_MS = 30 * 86400000;

/** AI usage metering against the plan's monthly credits, enforced before every call (AIS-05, BIL-09). */
export function useAiCredits() {
  const { state, update } = useStore();
  const adv = advertiserById(state.session.advertiserId);
  const quota = planById(adv.planId).quotas.aiCredits;
  const cutoff = Date.parse(state.subscription.renewsAt) - WINDOW_MS;
  const used = state.aiUsage
    .filter((u) => u.orgId === adv.orgId && Date.parse(u.at) >= cutoff)
    .reduce((n, u) => n + u.credits, 0);
  const remaining = Math.max(0, quota - used);
  return {
    orgId: adv.orgId,
    quota,
    used,
    remaining,
    /** Returns false (and records nothing) when the plan has no credits left. */
    charge(feature: AiUsageEntry["feature"], credits: number, detail?: string) {
      if (credits > remaining) return false;
      update((s) => ({
        ...s,
        aiUsage: [{ id: uid("AI"), orgId: adv.orgId, at: new Date().toISOString(), feature, credits, detail }, ...s.aiUsage],
      }));
      return true;
    },
  };
}
