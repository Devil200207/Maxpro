"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, Ban, CircleAlert, CircleCheck, ExternalLink, FileText, Flag, IdCard, MessageSquareWarning, RefreshCw, TriangleAlert, X } from "lucide-react";
import { advertiserById, DEMO_NOW, planById, typeName, zoneById, type Listing } from "@/lib/data";
import { priceLabel, timeAgo } from "@/lib/format";
import type { Bi } from "@/lib/i18n";
import { autoChecks, rejectionReasons, type CheckResult } from "@/lib/moderation";
import { uid, useStore, type ComplianceItem, type DemoState, type ListingReport, type NotificationLog, type Verification as VerificationRec } from "@/lib/store";
import { changeEntry } from "@/components/account/useAccount";
import { StageBadge } from "@/lib/stage";
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
    update((s) => ({
      ...s,
      changeLog: [changeEntry(l.id, MODERATOR, "status", "pending", "live"), ...s.changeLog],
      reports: s.reports.map((r) => (r.listingId === l.id && r.status === "resubmitted" && !r.resolvedAt ? { ...r, resolvedAt: new Date().toISOString() } : r)),
    }));
    notify(update, { channel: "whatsapp", to: adv.phone, template: "listing_approved" });
    toast(t(`${l.id} approved and live`, `تمت الموافقة على ${l.id} ونشره`));
  };

  const reject = (l: Listing, mode: "rejected" | "draft") => {
    const adv = advertiserById(l.advertiserId);
    const r = reasons.length ? reasons : ["photos"];
    setListingStatus(l.id, mode, MODERATOR, "moderator", `${mode === "draft" ? "changes requested" : "rejected"}: ${r.join(",")}`);
    update((s) => ({ ...s, changeLog: [changeEntry(l.id, MODERATOR, "status", "pending", mode), ...s.changeLog] }));
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
        req={["FR-LST-05", "FR-LST-06", "UAT C3"]}
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
          const resubmitted = state.reports.find((r) => r.listingId === l.id && r.status === "resubmitted" && !r.resolvedAt);
          return (
            <Card key={l.id} className={cn("overflow-hidden", resubmitted && "ring-2 ring-violet-200")}>
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
                        {resubmitted && (
                          <Badge tone="violet">
                            <RefreshCw className="h-3 w-3" />
                            {t("Resubmitted after report", "أُعيد إرساله بعد بلاغ")} · {p(resubmitted.reason)}
                          </Badge>
                        )}
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

                  {!adv.verified && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                      {t("Advertiser is not verified yet — verify their documents before publishing.", "المعلن غير موثق بعد — وثّق مستنداته قبل النشر.")}
                    </div>
                  )}
                  {resubmitted?.moderatorNote && <p className="mt-2 text-xs text-violet-800">“{resubmitted.moderatorNote}”</p>}
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

// ---------------- Reports (UAT C6) ----------------

const reportPresets: Bi[] = [
  { en: "Listing is no longer available", ar: "الإعلان لم يعد متاحاً" },
  { en: "Price does not match — please correct", ar: "السعر غير مطابق — يرجى التصحيح" },
  { en: "Photos are not of this property", ar: "الصور لا تخص هذا العقار" },
  { en: "Misleading description", ar: "وصف مضلل" },
];

export function Reports() {
  const { lang, t, p, href } = useLang();
  const { state, update } = useStore();
  const now = useNow(30000);
  const [acting, setActing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"open" | "all">("open");

  const list = [...state.reports].sort((a, b) => b.at.localeCompare(a.at)).filter((r) => filter === "all" || r.status === "open" || (r.status === "resubmitted" && !r.resolvedAt));

  const act = (r: ListingReport, kind: "paused" | "rejected" | "asked_fix" | "dismiss" | "unavailable") => {
    const l = state.listings.find((x) => x.id === r.listingId);
    if (!l) return;
    const adv = advertiserById(l.advertiserId);
    const at = new Date().toISOString();
    const msg = note.trim() || (kind === "dismiss" ? "" : p(r.reason));
    const nextStatus = kind === "paused" ? "paused" : kind === "rejected" ? "rejected" : kind === "unavailable" ? (l.purpose === "rent" ? "rented" : "sold") : l.status;
    update((s) => ({
      ...s,
      listings: s.listings.map((x) => (x.id === l.id ? { ...x, status: nextStatus } : x)),
      reports: s.reports.map((x) =>
        x.id === r.id
          ? {
              ...x,
              status: kind === "dismiss" ? "dismissed" : "actioned",
              action: kind === "paused" || kind === "rejected" || kind === "asked_fix" ? kind : undefined,
              moderatorNote: msg || undefined,
              resolvedAt: kind === "dismiss" || kind === "unavailable" ? at : undefined,
            }
          : x,
      ),
      changeLog: nextStatus !== l.status ? [changeEntry(l.id, MODERATOR, "status", l.status, nextStatus), ...s.changeLog] : s.changeLog,
      notifications:
        kind === "dismiss"
          ? s.notifications
          : [
              { id: uid("N"), at, channel: "whatsapp" as const, to: adv.phone, template: "listing_action_required", status: "sent" as const },
              { id: uid("N"), at, channel: "email" as const, to: `${adv.id.replace("adv-", "")}@example.qa`, template: "listing_action_required", status: "sent" as const },
              ...s.notifications,
            ],
      audit: [{ id: uid("A"), at, actor: MODERATOR, role: "moderator" as const, action: kind === "dismiss" ? "report.dismissed" : `report.${kind}`, target: r.id, detail: `listing=${l.id}${msg ? `; ${msg}` : ""}` }, ...s.audit],
    }));
    toast(kind === "dismiss" ? t("Report dismissed", "تم تجاهل البلاغ") : t("Action taken — advertiser notified by WhatsApp and email", "تم الإجراء — أُشعر المعلن بواتساب والبريد"));
    setActing(null);
    setNote("");
  };

  const statusBadge = (r: ListingReport) => {
    if (r.status === "open") return <Badge tone="red">{t("Open", "مفتوح")}</Badge>;
    if (r.status === "dismissed") return <Badge>{t("Dismissed", "متجاهل")}</Badge>;
    if (r.status === "resubmitted") return <Badge tone="violet">{r.resolvedAt ? t("Fixed & re-approved", "صُحح وأُعيد اعتماده") : t("Resubmitted — in queue", "أُعيد إرساله — في القائمة")}</Badge>;
    return <Badge tone="amber">{r.action === "paused" ? t("Paused · awaiting fix", "متوقف · بانتظار التصحيح") : r.action === "rejected" ? t("Rejected · awaiting fix", "مرفوض · بانتظار التصحيح") : r.action === "asked_fix" ? t("Fix requested", "طُلب التصحيح") : t("Resolved", "تمت المعالجة")}</Badge>;
  };

  return (
    <div>
      <SectionHead
        title={t("Reported listings", "الإعلانات المُبلغ عنها")}
        desc={t("Seeker reports land here. Pause or reject with a reason (or ask for a fix); the advertiser is notified, fixes and resubmits — the listing returns to the moderation queue.", "تصل بلاغات الباحثين هنا. أوقف أو ارفض مع ذكر السبب (أو اطلب التصحيح)؛ يُشعر المعلن فيصحح ويعيد الإرسال — ويعود الإعلان لقائمة المراجعة.")}
        req={["FR-LST-09", "UAT C6"]}
        actions={
          <div className="flex gap-1 rounded-lg bg-stone-100 p-0.5 text-xs font-semibold">
            {(["open", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("rounded-md px-3 py-1", filter === f ? "bg-white shadow-sm" : "text-stone-500")}>
                {f === "open" ? t("Needs attention", "يحتاج إجراء") : t("All reports", "كل البلاغات")}
              </button>
            ))}
          </div>
        }
      />
      {list.length === 0 && (
        <Card className="grid place-items-center p-12 text-center">
          <CircleCheck className="h-10 w-10 text-emerald-500" />
          <p className="mt-3 font-semibold text-stone-800">{t("No reports need attention", "لا توجد بلاغات بحاجة لإجراء")}</p>
        </Card>
      )}
      <div className="space-y-3">
        {list.map((r) => {
          const l = state.listings.find((x) => x.id === r.listingId);
          if (!l) return null;
          const open = r.status === "open";
          return (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                  {l.media[0] && <Image src={l.media[0].src} alt="" fill sizes="80px" className="object-cover" />}
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
                    {statusBadge(r)}
                  </div>
                  <div className="mt-1 truncate text-sm font-medium text-stone-800">{p(l.title)}</div>
                  <div className="text-xs text-stone-500">
                    {r.id} · {r.reporter}
                    {r.note && <> · “{r.note}”</>} · {now ? timeAgo(r.at, lang) : ""}
                  </div>
                  {r.moderatorNote && <div className="mt-1 text-xs text-stone-600">{t("Moderator note", "ملاحظة المشرف")}: {r.moderatorNote}</div>}
                </div>
                {open && acting !== r.id && (
                  <button onClick={() => setActing(r.id)} className={cn(btn.primary, "py-1.5 text-xs")}>
                    {t("Review report", "مراجعة البلاغ")}
                  </button>
                )}
              </div>
              {open && acting === r.id && (
                <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="text-xs font-semibold text-stone-700">{t("Reason shown to the advertiser", "السبب الذي سيظهر للمعلن")}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {reportPresets.map((pr) => (
                      <button key={pr.en} onClick={() => setNote(p(pr))} className="rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-600 hover:border-brand-500">
                        {p(pr)}
                      </button>
                    ))}
                  </div>
                  <input className={cn(input, "mt-2")} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Write a reason…", "اكتب السبب…")} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => act(r, "paused")} className={cn(btn.secondary, "py-1.5 text-xs")}>
                      {t("Pause listing", "إيقاف الإعلان")}
                    </button>
                    <button onClick={() => act(r, "rejected")} className={cn(btn.danger, "py-1.5 text-xs")}>
                      {t("Reject listing", "رفض الإعلان")}
                    </button>
                    <button onClick={() => act(r, "asked_fix")} className={cn(btn.secondary, "py-1.5 text-xs")}>
                      <MessageSquareWarning className="h-3.5 w-3.5" />
                      {t("Ask advertiser to fix", "اطلب التصحيح")}
                    </button>
                    <button onClick={() => act(r, "unavailable")} className={cn(btn.secondary, "py-1.5 text-xs")}>
                      {l.purpose === "rent" ? t("Mark rented", "تعليم كمؤجر") : t("Mark sold", "تعليم كمباع")}
                    </button>
                    <button onClick={() => act(r, "dismiss")} className={cn(btn.ghost, "py-1.5 text-xs")}>
                      {t("Dismiss", "تجاهل")}
                    </button>
                    <button onClick={() => setActing(null)} className={cn(btn.ghost, "py-1.5 text-xs")}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Verification (UAT C3) ----------------

export function Verification() {
  const { lang, t, p } = useLang();
  const { state, update } = useStore();
  const now = useNow(60000);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [show, setShow] = useState<"pending" | "all">("pending");
  const list = [...state.verifications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).filter((v) => show === "all" || v.status === "pending");

  const decide = (v: VerificationRec, d: "approved" | "rejected") => {
    const adv = advertiserById(v.advertiserId);
    const at = new Date().toISOString();
    const reason = reasons[v.id]?.trim() || undefined;
    if (d === "rejected" && !reason) return toast(t("Add a reason so the advertiser knows what to fix", "أضف سبباً ليعرف المعلن ما يجب تصحيحه"));
    update((s) => ({
      ...s,
      verifications: s.verifications.map((x) => (x.id === v.id ? { ...x, status: d, decidedAt: at, decidedBy: MODERATOR, reason } : x)),
      advertisers: s.advertisers.map((a) => (a.id === v.advertiserId ? { ...a, verified: d === "approved" } : a)),
      notifications: [
        { id: uid("N"), at, channel: "email" as const, to: `${adv.id.replace("adv-", "")}@example.qa`, template: d === "approved" ? "verification_approved" : "verification_rejected", status: "sent" as const },
        { id: uid("N"), at, channel: "whatsapp" as const, to: adv.phone, template: d === "approved" ? "verification_approved" : "verification_rejected", status: "sent" as const },
        ...s.notifications,
      ],
      audit: [{ id: uid("A"), at, actor: MODERATOR, role: "moderator" as const, action: d === "approved" ? "advertiser.verified" : "advertiser.verification_rejected", target: adv.id, detail: v.licence ? `licence=${v.licence}` : "QID" }, ...s.audit],
    }));
    toast(d === "approved" ? t(`${adv.name.en} verified — badge granted`, `تم توثيق ${adv.name.ar} — مُنحت الشارة`) : t("Verification rejected — advertiser notified", "رُفض التوثيق — تم إشعار المعلن"));
  };

  return (
    <div>
      <SectionHead
        title={t("Advertiser verification", "توثيق المعلنين")}
        desc={t("Individuals upload a Qatar ID; agencies upload a commercial registration and real-estate licence. Approval grants the verified badge everywhere and unlocks publishing.", "يرفع الأفراد البطاقة الشخصية، وترفع الوكالات السجل التجاري ورخصة الوساطة. الموافقة تمنح شارة التوثيق في كل مكان وتفتح النشر.")}
        req={["FR-ACC-03", "UAT C3"]}
        actions={
          <div className="flex gap-1 rounded-lg bg-stone-100 p-0.5 text-xs font-semibold">
            {(["pending", "all"] as const).map((f) => (
              <button key={f} onClick={() => setShow(f)} className={cn("rounded-md px-3 py-1", show === f ? "bg-white shadow-sm" : "text-stone-500")}>
                {f === "pending" ? t("Pending", "قيد الانتظار") : t("All", "الكل")}
              </button>
            ))}
          </div>
        }
      />
      {list.length === 0 && (
        <Card className="grid place-items-center p-12 text-center">
          <CircleCheck className="h-10 w-10 text-emerald-500" />
          <p className="mt-3 font-semibold text-stone-800">{t("No verifications waiting", "لا توجد طلبات توثيق")}</p>
          <p className="text-sm text-stone-500">{t("Register a new advertiser at /register to see one arrive here live.", "سجّل معلناً جديداً من /register لترى الطلب يصل هنا مباشرة.")}</p>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {list.map((v) => {
          const a = advertiserById(v.advertiserId);
          return (
            <Card key={v.id} className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full text-sm font-bold text-white" style={{ background: a.color }}>
                  {a.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold text-stone-900">
                    {p(a.name)}
                    {a.verified && <BadgeCheck className="h-4 w-4 text-sky-600" />}
                  </div>
                  <div className="text-xs text-stone-500">
                    {a.kind === "agency" ? t("Agency", "وكالة") : t("Individual owner", "مالك فرد")} · {p(planById(a.planId).name)} · {t("submitted", "أُرسل")} {now ? timeAgo(v.submittedAt, lang) : ""} · <span className="font-mono">{v.id}</span>
                  </div>
                </div>
                {v.status === "pending" ? (
                  <Badge tone="amber">{t("Awaiting review", "بانتظار المراجعة")}</Badge>
                ) : (
                  <Badge tone={v.status === "approved" ? "blue" : "red"}>{v.status === "approved" ? t("Verified", "موثق") : t("Rejected", "مرفوض")}</Badge>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {v.docs.map((doc) => {
                  const isId = /id/i.test(doc.type);
                  return (
                    <div key={doc.name} className="overflow-hidden rounded-xl border border-stone-200">
                      <div className={cn("relative h-20 p-2", isId ? "bg-gradient-to-br from-brand-700 to-brand-900" : "bg-gradient-to-br from-stone-100 to-stone-200")}>
                        {isId ? (
                          <>
                            <IdCard className="h-5 w-5 text-accent-400" />
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
                            </div>
                            <div className="absolute bottom-2 end-2 grid h-6 w-6 place-items-center rounded-full border-2 border-brand-500/50 text-[6px] font-bold text-brand-600">MOCI</div>
                          </>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="text-[11px] font-semibold text-stone-800">{doc.type}</div>
                        <div className="truncate font-mono text-[10px] text-stone-500" dir="ltr">
                          {doc.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                {v.licence
                  ? t(`Licence ${v.licence} — check against the Real Estate Regulatory Authority register.`, `الرخصة ${v.licence} — تحقق منها في سجل هيئة تنظيم العقارات.`)
                  : t("Name on QID must match the account holder.", "يجب أن يطابق الاسم في البطاقة صاحب الحساب.")}
              </div>

              {v.status === "pending" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => decide(v, "approved")} className={cn(btn.primary, "py-1.5 text-xs")}>
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {t("Approve & grant badge", "موافقة ومنح الشارة")}
                  </button>
                  <button onClick={() => decide(v, "rejected")} className={cn(btn.secondary, "py-1.5 text-xs")}>
                    {t("Reject", "رفض")}
                  </button>
                  <input
                    className={cn(input, "min-w-0 flex-1 py-1.5 text-xs")}
                    value={reasons[v.id] ?? ""}
                    onChange={(e) => setReasons((s) => ({ ...s, [v.id]: e.target.value }))}
                    placeholder={t("Reason / note to advertiser (required to reject)", "السبب / ملاحظة للمعلن (مطلوب للرفض)")}
                  />
                </div>
              ) : (
                <p className="mt-3 text-xs text-stone-500">
                  {v.decidedBy} · {v.decidedAt && (now ? timeAgo(v.decidedAt, lang) : "")}
                  {v.reason && <> · “{v.reason}”</>}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Compliance (CMP-01, admin view) ----------------

function complianceStatus(c: ComplianceItem): ComplianceItem["status"] {
  if (!c.expiresAt) return c.status;
  const days = (new Date(c.expiresAt).getTime() - DEMO_NOW) / 86400000;
  return days < 0 ? "expired" : days <= 30 ? "expiring" : "valid";
}

export function ComplianceAdmin() {
  const { lang, t, p } = useLang();
  const { state, update } = useStore();
  const rows = state.compliance.map((c) => ({ c, st: complianceStatus(c), org: state.advertisers.find((a) => a.orgId === c.orgId) }));
  const order = { expired: 0, missing: 1, expiring: 2, valid: 3 };
  rows.sort((a, b) => order[a.st] - order[b.st]);
  const tone = { valid: "green", expiring: "amber", expired: "red", missing: "stone" } as const;

  const remind = (c: ComplianceItem) => {
    const adv = state.advertisers.find((a) => a.orgId === c.orgId);
    if (!adv) return;
    notify(update, { channel: "email", to: `${adv.id.replace("adv-", "")}@example.qa`, template: "compliance_document_reminder" });
    toast(t("Reminder sent", "تم إرسال التذكير"));
  };

  return (
    <div>
      <SectionHead
        title={t("Compliance checklist", "قائمة الامتثال")}
        desc={t("Configurable document checklist per organisation with expiry reminders. These are software reminders only — never presented as government or legal approval.", "قائمة مستندات قابلة للضبط لكل مؤسسة مع تذكير بالانتهاء. هذه تذكيرات برمجية فقط — ولا تُقدَّم كموافقة حكومية أو قانونية.")}
        req={["CMP-01"]}
        actions={<StageBadge s="S1" />}
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{t("Organisation", "المؤسسة")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("Document", "المستند")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("Number", "الرقم")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("Expires", "ينتهي")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("Status", "الحالة")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map(({ c, st, org }) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-stone-800">{org ? p(org.name) : c.orgId}</td>
                  <td className="px-4 py-3">{p(c.label)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.number ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString(lang === "ar" ? "ar-QA-u-nu-latn" : "en-GB") : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={tone[st]}>{st}</Badge>
                  </td>
                  <td className="px-4 py-3 text-end">
                    {st !== "valid" && (
                      <button onClick={() => remind(c)} className="text-xs font-semibold text-brand-600 hover:underline">
                        {t("Send reminder", "إرسال تذكير")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
