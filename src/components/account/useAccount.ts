"use client";

import { advertiserById, DEMO_ADVERTISER_ID, planById } from "@/lib/data";
import type { Bi } from "@/lib/i18n";
import { uid, useStore, type ChangeEntry, type DemoState, type Invoice, type NotificationLog, type OrgRole } from "@/lib/store";

export const roleName: Record<OrgRole, Bi> = {
  owner: { en: "Owner", ar: "المالك" },
  manager: { en: "Manager", ar: "مدير" },
  agent: { en: "Agent", ar: "وكيل" },
  readonly: { en: "Read-only", ar: "قراءة فقط" },
};

/** FR-ACC-02 role permissions for organisation users. */
export function permissionsFor(role: OrgRole) {
  return {
    edit: role !== "readonly",
    seeAll: role !== "agent",
    assign: role === "owner" || role === "manager",
    approvePublish: role === "owner" || role === "manager",
    billing: role === "owner",
    team: role === "owner",
    connections: role === "owner",
  };
}
export type Permissions = ReturnType<typeof permissionsFor>;

export const permissionRows: { key: keyof Permissions; label: Bi }[] = [
  { key: "edit", label: { en: "Create & edit listings", ar: "إنشاء وتعديل الإعلانات" } },
  { key: "seeAll", label: { en: "See all organisation listings & leads", ar: "رؤية كل إعلانات وعملاء المؤسسة" } },
  { key: "assign", label: { en: "Assign agents and leads", ar: "إسناد الوكلاء والعملاء" } },
  { key: "approvePublish", label: { en: "Approve publishing", ar: "اعتماد النشر" } },
  { key: "billing", label: { en: "Billing & invoices", ar: "الفوترة والفواتير" } },
  { key: "team", label: { en: "Manage team", ar: "إدارة الفريق" } },
  { key: "connections", label: { en: "Portal connections", ar: "ربط البوابات" } },
];

/** Invoices carry the paying advertiser (seeded invoices belong to the demo agency). */
export type OwnedInvoice = Invoice & { advertiserId?: string };
export const invoiceOwner = (inv: Invoice) => (inv as OwnedInvoice).advertiserId ?? DEMO_ADVERTISER_ID;

/** Current demo session: who is signed in, their plan, role and permissions. */
export function useAccount() {
  const { state } = useStore();
  const session = state.session;
  const adv = advertiserById(session.advertiserId);
  const isDemoAgency = adv.id === DEMO_ADVERTISER_ID;
  // The demo agency's subscription lives in state.subscription; other accounts use advertiser.planId.
  const planId = isDemoAgency ? state.subscription.planId : adv.planId;
  const plan = planById(planId);
  const members = state.team.filter((m) => m.orgId === adv.orgId);
  const member = members.find((m) => m.id === session.memberId);
  const role = session.role;
  const can = permissionsFor(role);
  const aiUsed = state.aiUsage.filter((u) => u.orgId === adv.orgId).reduce((s, u) => s + u.credits, 0);
  const owned = state.listings.filter((l) => l.advertiserId === adv.id);
  const mine = can.seeAll ? owned : owned.filter((l) => l.assignedAgentId === session.memberId);
  const active = owned.filter((l) => ["live", "pending", "paused"].includes(l.status)).length;
  const invoices = state.invoices.filter((i) => invoiceOwner(i) === adv.id);
  const actorName = member ? `${member.name} (${adv.name.en})` : adv.name.en;
  return { session, adv, isDemoAgency, planId, plan, members, member, role, can, aiUsed, owned, mine, active, invoices, actorName };
}

export function changeEntry(listingId: string, actor: string, field: string, from?: unknown, to?: unknown): ChangeEntry {
  return {
    id: uid("CH"),
    listingId,
    at: new Date().toISOString(),
    actor,
    field,
    from: from === undefined ? undefined : String(from),
    to: to === undefined ? undefined : String(to),
  };
}

export function notification(n: Omit<NotificationLog, "id" | "at" | "status">): NotificationLog {
  return { ...n, id: uid("N"), at: new Date().toISOString(), status: "sent" };
}

/** Switch the demo session to an advertiser, picking its owner seat when one exists. */
export function sessionFor(s: DemoState, advertiserId: string) {
  const adv = s.advertisers.find((a) => a.id === advertiserId);
  const owner = s.team.find((m) => m.orgId === adv?.orgId && m.role === "owner");
  return { advertiserId, memberId: owner?.id ?? `owner-${advertiserId}`, role: "owner" as OrgRole };
}
