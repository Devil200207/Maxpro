"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, Ban, CircleAlert, CircleCheck, ExternalLink, FileText, Flag, IdCard, MessageSquareWarning, RefreshCw, TriangleAlert, X } from "lucide-react";
import { advertiserById, advertisers, DEMO_NOW, planById, typeName, zoneById, type Advertiser, type Listing } from "@/lib/data";
import { priceLabel, timeAgo } from "@/lib/format";
import type { Bi } from "@/lib/i18n";
import { autoChecks, rejectionReasons, type CheckResult } from "@/lib/moderation";
import { uid, useStore, type DemoState, type NotificationLog } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { toast } from "@/components/Toaster";
import { Badge, btn, Card, cn, input } from "@/components/ui";
import { useNow } from "@/components/inbox/channel";
import { SectionHead } from "./shared";

const MODERATOR = "Khalid (Moderator)";

export function notify(update: (fn: (s: DemoState) => DemoState) => void, n: Omit<NotificationLog, "id" | "at" | "status">) {
  update((s) => ({ ...s, notifications: [{ ...n, id: uid("N"), at: new Date().toISOString(), status: "sent" }, ...s.notifications] }));
}

function CheckChip({ c }: { c: CheckResult }) {
  const { p } = useLang();
  const Icon = c.level === "block" ? Ban : c.level === "warn" ? TriangleAlert : CircleCheck;
  return (
    <li
      className={cn(
        "flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs",
        c.level === "block" && "bg-red-50 text-red-800",
        c.level === "warn" && "bg-amber-50 text-amber-900",
        c.level === "ok" && "bg-emerald-50 text-emerald-800",
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        <b className="font-semibold">{p(c.label)}</b>
        {c.detail && <span className="block opacity-80">{p(c.detail)}</span>}
      </span>
    </li>
  );
}

// ---------------- Moderation queue ----------------

export function ModerationQueue() {
  const { lang, t, p, href } = useLang();
  const { state, update, setListingStatus } = useStore();
  const now = useNow(30000);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);

  const pending = state.listings.filter((l) => l.status === "pending").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const decided = state.audit.filter((a) => a.role === "moderator" && a.action.startsWith("listing.")).slice(0, 6);

  const approve = (l: Listing, checks: CheckResult[]) => {
    const adv = advertiserById(l.advertiserId);
    const override = checks.some((c) => c.level === "block");
    setListingStatus(l.id, "live", MODERATOR, "moderator", override ? "approved with override" : `checks=${checks.map((c) => c.id).join(",")}`);
    notify(update, { channel: "whatsapp", to: adv.phone, template: "listing_approved" });
    toast(t(`${l.id} approved and live`, `تمت الموافقة على ${l.id} ونشره`));
  };

  const reject = (l: Listing, mode: "rejected" | "draft") => {
    const adv = advertiserById(l.advertiserId);
    const r = reasons.length ? reasons : ["photos"];
    setListingStatus(l.id, mode, MODERATOR, "moderator", `${mode === "draft" ? "changes requested" : "rejected"}: ${r.join(",")}`);
    notify(update, { channel: "email", to: `${adv.id.replace("adv-", "")}@example.qa`, template: mode === "draft" ? "listing_changes_requested" : "listing_rejected" });
    notify(update, { channel: "inapp", to: p(adv.name), template: mode === "draft" ? "listing_changes_requested" : "listing_rejected" });
    toast(mode === "draft" ? t("Changes requested — advertiser notified", "طُلبت تعديلات — تم إشعار المعلن") : t("Listing rejected — advertiser notified", "رُفض الإعلان — تم إشعار المعلن"));
    setRejecting(null);
    setReasons([]);
  };

  return (
    <div>
      <SectionHead
        title={t("Moderation queue", "قائمة المراجعة")}
        desc={t(
          "Automatic checks run on submission; moderators confirm, reject with a reason, or request changes. Advertisers are notified instantly.",
          "تُجرى فحوصات تلقائية عند الإرسال، ثم يوافق المراجع أو يرفض مع ذكر السبب أو يطلب تعديلات. يُشعَر المعلن فوراً.",
        )}
        req={["FR-LST-05", "FR-LST-06"]}
      />

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-900">
        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
        {t(
          "Live updates — open the advertiser portal in another tab and submit a listing: it appears here instantly.",
          "تحديث مباشر — افتح بوابة المعلن في تبويب آخر وأرسل إعلاناً: سيظهر هنا فوراً.",
        )}
        <Link href={href("/advertiser/new")} target="_blank" className="ms-auto shrink-0 font-semibold underline">
          {t("Open advertiser portal", "فتح بوابة المعلن")}
        </Link>
      </div>

      {pending.length === 0 && (
        <Card className="grid place-items-center p-12 text-center">
          <CircleCheck className="h-10 w-10 text-emerald-500" />
          <p className="mt-3 font-semibold text-stone-800">{t("Queue is clear", "لا توجد إعلانات بانتظار المراجعة")}</p>
          <p className="text-sm text-stone-500">{t("New submissions will appear here automatically.", "ستظهر الإعلانات الجديدة هنا تلقائياً.")}</p>
        </Card>
      )}

      <div className="space-y-4">
        {pending.map((l) => {
          const adv = advertiserById(l.advertiserId);
          const checks = autoChecks(l, state.listings);
          const blocking = checks.some((c) => c.level === "block");
          const cover = l.media.find((m) => m.cat === "exterior") ?? l.media[0];
          return (
            <Card key={l.id} className="overflow-hidden">
              <div className="grid grid-cols-1 gap-0 md:grid-cols-[220px_1fr]">
                <div className="relative aspect-[4/3] bg-stone-100 md:aspect-auto">
                  {cover && <Image src={cover.src} alt={p(l.title)} fill sizes="220px" className="object-cover" />}
                  <span className="absolute start-2 top-2 rounded bg-white/90 px-1.5 py-0.5 font-mono text-[10px] font-bold">{l.id}</span>
                  <span className="absolute bottom-2 start-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {l.media.length} {t("files", "ملفات")} · {t("source", "المصدر")}: {l.source}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-stone-900">{p(l.title)}</h3>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {priceLabel(l.price, l.purpose, lang)} · {p(typeName(l.type))} · {p(zoneById(l.zoneId).name)} · {l.beds} {t("bd", "غرف")} · {l.area} {t("sqm", "م²")}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold text-white" style={{ background: adv.color }}>
                          {adv.initials}
                        </span>
                        <span className="font-medium text-stone-700">{p(adv.name)}</span>
                        {adv.verified ? (
                          <Badge tone="blue">
                            <BadgeCheck className="h-3 w-3" />
                            {t("Verified", "موثق")}
                          </Badge>
                        ) : (
                          <Badge tone="amber">{t("Unverified advertiser", "معلن غير موثق")}</Badge>
                        )}
                        <Badge>{p(planById(adv.planId).name)}</Badge>
                        <span className="text-stone-400">{now ? timeAgo(l.createdAt, lang) : ""}</span>
                      </div>
                    </div>
                    <Link href={href(`/listing/${l.id}`)} target="_blank" className={cn(btn.ghost, "py-1 text-xs")}>
                      {t("Preview", "معاينة")} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-stone-600" dir="auto">
                    {p(l.description)}
                  </p>

                  <div className="mt-3">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-400">{t("Automatic checks", "الفحوصات التلقائية")}</div>
                    <ul className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
                      {checks.map((c) => (
                        <CheckChip key={c.id} c={c} />
                      ))}
                    </ul>
                  </div>

                  {rejecting === l.id ? (
                    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <div className="text-xs font-semibold text-stone-700">{t("Select reason(s) — shown to the advertiser", "اختر السبب — سيظهر للمعلن")}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {rejectionReasons.map((r) => {
                          const on = reasons.includes(r.id);
                          return (
                            <button
                              key={r.id}
                              onClick={() => setReasons((s) => (on ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                              className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-stone-300 bg-white text-stone-600")}
                            >
                              {p(r.label)}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => reject(l, "draft")} className={cn(btn.secondary, "py-1.5 text-xs")}>
                          {t("Request changes", "طلب تعديلات")}
                        </button>
                        <button onClick={() => reject(l, "rejected")} className={cn(btn.danger, "py-1.5 text-xs")}>
                          {t("Reject listing", "رفض الإعلان")}
                        </button>
                        <button onClick={() => setRejecting(null)} className={cn(btn.ghost, "py-1.5 text-xs")}>
                          {t("Cancel", "إلغاء")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button onClick={() => approve(l, checks)} className={cn(blocking ? btn.secondary : btn.primary, "py-1.5 text-xs")}>
                        <CircleCheck className="h-3.5 w-3.5" />
                        {blocking ? t("Approve (override)", "موافقة (تجاوز)") : t("Approve & publish", "موافقة ونشر")}
                      </button>
                      <button
                        onClick={() => {
                          setRejecting(l.id);
                          setReasons(checks.filter((c) => c.level !== "ok" && rejectionReasons.some((r) => r.id === c.id)).map((c) => c.id));
                        }}
                        className={cn(blocking ? btn.primary : btn.secondary, "py-1.5 text-xs")}
                      >
                        <X className="h-3.5 w-3.5" />
                        {t("Reject / request changes", "رفض / طلب تعديلات")}
                      </button>
                      {blocking && <span className="text-xs text-red-700">{t("Blocking issue found — rejection recommended", "توجد مشكلة مانعة — يوصى بالرفض")}</span>}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {decided.length > 0 && (
        <Card className="mt-6 p-4">
          <h3 className="text-sm font-semibold text-stone-900">{t("Recent decisions", "القرارات الأخيرة")}</h3>
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {decided.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-mono text-xs text-brand-700">{a.target}</span>
                <span className="font-mono text-xs text-stone-700">{a.action}</span>
                {a.detail && <span className="text-xs text-stone-500">{a.detail}</span>}
                <span className="ms-auto text-xs text-stone-400">{now ? timeAgo(a.at, lang) : ""}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ---------------- Reports ----------------

interface Report {
  id: string;
  listingId: string;
  reason: Bi;
  reporter: string;
  note?: string;
  at: string;
}

const seedReports: Report[] = [
  { id: "R-31", listingId: "MP-10246", reason: { en: "Already rented", ar: "تم تأجيره بالفعل" }, reporter: "Visitor (web)", note: "Called the broker — said it was rented last week.", at: new Date(DEMO_NOW - 90 * 60000).toISOString() },
  { id: "R-32", listingId: "MP-10238", reason: { en: "Wrong price", ar: "سعر خاطئ" }, reporter: "Registered user · Hana M.", note: "Owner quoted QAR 7,500 on the phone, not 6,800.", at: new Date(DEMO_NOW - 300 * 60000).toISOString() },
];

export function Reports() {
  const { lang, t, p, href } = useLang();
  const { state, update, audit, setListingStatus } = useStore();
  const now = useNow(30000);
  const [resolved, setResolved] = useState<Record<string, string>>({});

  // Reports raised from the listing page are recorded in the audit trail.
  const fromAudit: Report[] = state.audit
    .filter((a) => /report/i.test(a.action) && a.target && !a.action.includes("resolved") && !a.action.includes("dismissed"))
    .map((a) => ({
      id: a.id,
      listingId: a.target!,
      reason: { en: a.detail ?? "Reported by user", ar: a.detail ?? "بلاغ من مستخدم" },
      reporter: a.actor,
      at: a.at,
    }));
  const reports = [...fromAudit, ...seedReports];

  const act = (r: Report, kind: "rented" | "fix" | "dismiss") => {
    const l = state.listings.find((x) => x.id === r.listingId);
    if (!l) return;
    const adv = advertiserById(l.advertiserId);
    if (kind === "rented") setListingStatus(l.id, l.purpose === "rent" ? "rented" : "sold", MODERATOR, "moderator", `report ${r.id}`);
    if (kind !== "dismiss") notify(update, { channel: "whatsapp", to: adv.phone, template: kind === "rented" ? "listing_marked_unavailable" : "listing_report_fix_request" });
    audit({ actor: MODERATOR, role: "moderator", action: kind === "dismiss" ? "report.dismissed" : "report.resolved", target: r.id, detail: `listing=${l.id}; action=${kind}` });
    setResolved((s) => ({ ...s, [r.id]: kind }));
    toast(kind === "dismiss" ? t("Report dismissed", "تم تجاهل البلاغ") : t("Report resolved — advertiser notified", "تمت معالجة البلاغ — تم إشعار المعلن"));
  };

  return (
    <div>
      <SectionHead
        title={t("Reported listings", "الإعلانات المُبلغ عنها")}
        desc={t("Reports from visitors and registered users. Every action notifies the advertiser and is written to the audit trail.", "بلاغات الزوار والمستخدمين. كل إجراء يُشعر المعلن ويُسجل في سجل التدقيق.")}
        req={["FR-LST-09"]}
      />
      <div className="space-y-3">
        {reports.map((r) => {
          const l = state.listings.find((x) => x.id === r.listingId);
          if (!l) return null;
          const done = resolved[r.id];
          return (
            <Card key={r.id} className={cn("flex flex-wrap items-center gap-4 p-4", done && "opacity-60")}>
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                <Image src={l.media[0].src} alt="" fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="red">
                    <Flag className="h-3 w-3" />
                    {p(r.reason)}
                  </Badge>
                  <Link href={href(`/listing/${l.id}`)} target="_blank" className="font-mono text-xs font-semibold text-brand-700 hover:underline">
                    {l.id}
                  </Link>
                  <Badge>{l.status}</Badge>
                </div>
                <div className="mt-1 truncate text-sm font-medium text-stone-800">{p(l.title)}</div>
                <div className="text-xs text-stone-500">
                  {r.reporter}
                  {r.note && <> · “{r.note}”</>} · {now ? timeAgo(r.at, lang) : ""}
                </div>
              </div>
              {done ? (
                <Badge tone="green">
                  <CircleCheck className="h-3 w-3" />
                  {done === "dismiss" ? t("Dismissed", "تم التجاهل") : t("Resolved", "تمت المعالجة")}
                </Badge>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => act(r, "rented")} className={cn(btn.primary, "py-1.5 text-xs")}>
                    {l.purpose === "rent" ? t("Mark rented", "تعليم كمؤجر") : t("Mark sold", "تعليم كمباع")}
                  </button>
                  <button onClick={() => act(r, "fix")} className={cn(btn.secondary, "py-1.5 text-xs")}>
                    <MessageSquareWarning className="h-3.5 w-3.5" />
                    {t("Ask advertiser to fix", "اطلب التصحيح من المعلن")}
                  </button>
                  <button onClick={() => act(r, "dismiss")} className={cn(btn.ghost, "py-1.5 text-xs")}>
                    {t("Dismiss", "تجاهل")}
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Verification ----------------

const docs: Record<string, { en: string; ar: string; kind: "id" | "doc"; ref: string }[]> = {
  "adv-omar": [
    { en: "Qatar ID — front", ar: "البطاقة الشخصية — الأمام", kind: "id", ref: "QID 289•••••412" },
    { en: "Qatar ID — back", ar: "البطاقة الشخصية — الخلف", kind: "id", ref: "Expiry 2029-03-14" },
  ],
  "adv-gulfkey": [
    { en: "Commercial registration", ar: "السجل التجاري", kind: "doc", ref: "CR 178•••" },
    { en: "Real-estate brokerage licence", ar: "رخصة الوساطة العقارية", kind: "doc", ref: "RE-2026-2210" },
    { en: "Authorised signatory QID", ar: "بطاقة المفوض بالتوقيع", kind: "id", ref: "QID 284•••••903" },
  ],
};

export function Verification() {
  const { lang, t, p } = useLang();
  const { audit, update } = useStore();
  const now = useNow(60000);
  const [decisions, setDecisions] = useState<Record<string, "approved" | "rejected">>({});
  const queue = advertisers.filter((a) => !a.verified);

  const decide = (a: Advertiser, d: "approved" | "rejected") => {
    setDecisions((s) => ({ ...s, [a.id]: d }));
    audit({ actor: MODERATOR, role: "moderator", action: d === "approved" ? "advertiser.verified" : "advertiser.verification_rejected", target: a.id, detail: a.licence ? `licence=${a.licence}` : "QID" });
    notify(update, { channel: "email", to: `${a.id.replace("adv-", "")}@example.qa`, template: d === "approved" ? "verification_approved" : "verification_rejected" });
    toast(d === "approved" ? t(`${a.name.en} verified — badge granted`, `تم توثيق ${a.name.ar}`) : t("Verification rejected", "تم رفض التوثيق"));
  };

  return (
    <div>
      <SectionHead
        title={t("Advertiser verification", "توثيق المعلنين")}
        desc={t("Individuals upload a Qatar ID; agencies upload a commercial registration and real-estate licence. Approval grants the verified badge.", "يرفع الأفراد البطاقة الشخصية، وترفع الوكالات السجل التجاري ورخصة الوساطة. الموافقة تمنح شارة التوثيق.")}
        req={["FR-ACC-03"]}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {queue.map((a) => {
          const d = decisions[a.id];
          return (
            <Card key={a.id} className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full text-sm font-bold text-white" style={{ background: a.color }}>
                  {a.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold text-stone-900">
                    {p(a.name)}
                    {d === "approved" && <BadgeCheck className="h-4 w-4 text-sky-600" />}
                  </div>
                  <div className="text-xs text-stone-500">
                    {a.kind === "agency" ? t("Agency", "وكالة") : t("Individual owner", "مالك فرد")} · {p(planById(a.planId).name)} · {t("joined", "انضم")} {now ? timeAgo(a.memberSince, lang) : ""}
                  </div>
                </div>
                {d ? (
                  <Badge tone={d === "approved" ? "blue" : "red"}>{d === "approved" ? t("Verified", "موثق") : t("Rejected", "مرفوض")}</Badge>
                ) : (
                  <Badge tone="amber">{t("Awaiting review", "بانتظار المراجعة")}</Badge>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {docs[a.id]?.map((doc) => (
                  <div key={doc.en} className="overflow-hidden rounded-xl border border-stone-200">
                    <div className={cn("relative h-20 p-2", doc.kind === "id" ? "bg-gradient-to-br from-brand-700 to-brand-900" : "bg-gradient-to-br from-stone-100 to-stone-200")}>
                      {doc.kind === "id" ? (
                        <>
                          <IdCard className="h-5 w-5 text-gold-400" />
                          <div className="mt-1.5 h-1.5 w-16 rounded bg-white/40" />
                          <div className="mt-1 h-1.5 w-10 rounded bg-white/25" />
                          <div className="absolute bottom-2 end-2 h-8 w-7 rounded bg-white/30" />
                        </>
                      ) : (
                        <>
                          <FileText className="h-5 w-5 text-stone-500" />
                          <div className="mt-1.5 space-y-1">
                            <div className="h-1 w-20 rounded bg-stone-400/50" />
                            <div className="h-1 w-16 rounded bg-stone-400/40" />
                            <div className="h-1 w-18 rounded bg-stone-400/40" />
                          </div>
                          <div className="absolute bottom-2 end-2 grid h-6 w-6 place-items-center rounded-full border-2 border-brand-500/50 text-[6px] font-bold text-brand-600">MOCI</div>
                        </>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-[11px] font-semibold text-stone-800">{t(doc.en, doc.ar)}</div>
                      <div className="font-mono text-[10px] text-stone-500" dir="ltr">
                        {doc.ref}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                {a.licence
                  ? t(`Licence ${a.licence} — check against the Real Estate Regulatory Authority register.`, `الرخصة ${a.licence} — تحقق منها في سجل هيئة تنظيم العقارات.`)
                  : t("Name on QID must match the account holder.", "يجب أن يطابق الاسم في البطاقة صاحب الحساب.")}
              </div>

              {!d && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => decide(a, "approved")} className={cn(btn.primary, "py-1.5 text-xs")}>
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {t("Approve & grant badge", "موافقة ومنح الشارة")}
                  </button>
                  <button onClick={() => decide(a, "rejected")} className={cn(btn.secondary, "py-1.5 text-xs")}>
                    {t("Reject", "رفض")}
                  </button>
                  <input className={cn(input, "hidden py-1.5 text-xs sm:block")} placeholder={t("Note to advertiser (optional)", "ملاحظة للمعلن (اختياري)")} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
