"use client";

import Link from "next/link";
import { BadgeCheck, Clock, ShieldAlert, UserCog, UserPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { StageBadge } from "@/lib/stage";
import { Badge, cn, ReqTag } from "@/components/ui";
import { roleName, sessionFor, useAccount } from "./useAccount";

/**
 * Demo sign-in bar for the advertiser portal: which account is signed in and,
 * for agencies, which team member (and therefore which role) is acting (FR-ACC-02).
 */
export function AccountBar() {
  const { t, p, href } = useLang();
  const { state, update } = useStore();
  const { adv, members, session } = useAccount();

  const switchAccount = (id: string) => update((s) => ({ ...s, session: sessionFor(s, id) }));
  const switchMember = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (m) update((s) => ({ ...s, session: { ...s.session, memberId: m.id, role: m.role } }));
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-2.5 text-sm">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
        <UserCog className="h-4 w-4" />
        {t("Demo sign-in", "تسجيل دخول تجريبي")}
      </span>
      <label className="flex items-center gap-2">
        <span className="text-stone-500">{t("Account", "الحساب")}</span>
        <select value={adv.id} onChange={(e) => switchAccount(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm font-medium">
          {state.advertisers.map((a) => (
            <option key={a.id} value={a.id}>
              {p(a.name)} {a.verified ? "✓" : `· ${t("unverified", "غير موثق")}`}
            </option>
          ))}
        </select>
      </label>
      {adv.kind === "agency" && members.length > 0 && (
        <label className="flex items-center gap-2">
          <span className="text-stone-500">{t("Acting as", "بصفة")}</span>
          <select value={session.memberId} onChange={(e) => switchMember(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm font-medium">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {p(roleName[m.role])}
              </option>
            ))}
          </select>
        </label>
      )}
      <Badge tone={session.role === "owner" ? "brand" : session.role === "readonly" ? "stone" : "violet"}>{p(roleName[session.role])}</Badge>
      <span className="ms-auto flex items-center gap-2">
        <ReqTag id="FR-ACC-02" />
        <Link href={href("/register")} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
          <UserPlus className="h-3.5 w-3.5" />
          {t("Register a new advertiser", "تسجيل معلن جديد")}
        </Link>
      </span>
    </div>
  );
}

/** Shown while the signed-in advertiser is not yet verified (C3: verification before publishing). */
export function VerificationBanner() {
  const { t, href } = useLang();
  const { state } = useStore();
  const { adv } = useAccount();
  if (adv.verified) return null;
  const v = state.verifications.find((x) => x.advertiserId === adv.id);
  const rejected = v?.status === "rejected";
  return (
    <div className={cn("mb-5 flex flex-wrap items-start gap-3 rounded-2xl border p-4 text-sm", rejected ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900")}>
      {rejected ? <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /> : <Clock className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 font-semibold">
          {rejected ? t("Verification rejected", "رُفض التوثيق") : t("Verification pending", "التوثيق قيد المراجعة")}
          <StageBadge s="S1" />
          <ReqTag id="FR-ACC-03" />
        </div>
        <p className="mt-0.5">
          {rejected
            ? `${t("Reason", "السبب")}: ${v?.reason ?? "—"}. ${t("Upload corrected documents to try again.", "ارفع مستندات مصححة للمحاولة مجدداً.")}`
            : t(
                "You can explore the portal, choose a plan and save listing drafts. Submitting listings for publication unlocks once a moderator approves your documents.",
                "يمكنك استكشاف البوابة واختيار باقة وحفظ مسودات الإعلانات. يُفتح إرسال الإعلانات للنشر بعد موافقة المشرف على مستنداتك.",
              )}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>✓ {t("Draft listings", "مسودات الإعلانات")}</span>
          <span>✓ {t("Choose & pay for a plan", "اختيار ودفع الباقة")}</span>
          <span>✗ {t("Submit for publication", "الإرسال للنشر")}</span>
          <span>✗ {t("Verified badge", "شارة التوثيق")}</span>
        </div>
      </div>
      <Link href={href("/admin?tab=verification")} target="_blank" className="shrink-0 text-xs font-semibold underline">
        {t("Demo: approve as moderator →", "عرض: الموافقة كمشرف ←")}
      </Link>
    </div>
  );
}

export function VerifiedMark({ className }: { className?: string }) {
  return <BadgeCheck className={cn("inline h-5 w-5 text-sky-600", className)} />;
}
