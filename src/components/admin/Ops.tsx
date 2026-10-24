"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, Bot, CircleCheck, Download, ExternalLink, Lock, Mail, MessageCircle, Search, ShieldCheck, Smartphone, ThumbsDown, ThumbsUp, UserRound } from "lucide-react";
import { kb } from "@/lib/kb";
import { num, qar, timeAgo } from "@/lib/format";
import type { Bi } from "@/lib/i18n";
import { useStore, type AuditEntry, type NotificationLog } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { toast } from "@/components/Toaster";
import { Badge, btn, Card, cn, input } from "@/components/ui";
import { downloadCsv, useNow } from "@/components/inbox/channel";
import { SectionHead } from "./shared";
import { Toggle } from "./Config";
import { roleCls } from "./Overview";

// ---------------- Notifications ----------------

const chIcon: Record<NotificationLog["channel"], typeof Mail> = { email: Mail, sms: Smartphone, whatsapp: MessageCircle, inapp: Bell };
const statusTone: Record<NotificationLog["status"], "stone" | "blue" | "green" | "red" | "wa"> = { queued: "stone", sent: "blue", delivered: "green", read: "wa", failed: "red" };

interface Template {
  id: string;
  channel: NotificationLog["channel"];
  name: string;
  waApproval?: "approved" | "pending" | "rejected";
  body: Bi;
}

const seedTemplates: Template[] = [
  { id: "listing_approved", channel: "whatsapp", name: "Listing approved", waApproval: "approved", body: { en: "Good news {{name}}! Your listing {{listing_id}} is now live on MaxPro. View it: {{url}}", ar: "خبر سار {{name}}! إعلانك {{listing_id}} أصبح منشوراً على ماكس برو. شاهده: {{url}}" } },
  { id: "new_match", channel: "whatsapp", name: "New match alert", waApproval: "approved", body: { en: "A new property matches your saved search “{{search}}”: {{title}} — {{price}}. Reply STOP to unsubscribe.", ar: "عقار جديد يطابق بحثك المحفوظ “{{search}}”: {{title}} — {{price}}. أرسل STOP لإلغاء الاشتراك." } },
  { id: "price_drop", channel: "whatsapp", name: "Price drop", waApproval: "pending", body: { en: "Price dropped on {{title}}: now {{price}}. Reply STOP to unsubscribe.", ar: "انخفض سعر {{title}}: الآن {{price}}. أرسل STOP لإلغاء الاشتراك." } },
  { id: "listing_rejected", channel: "email", name: "Listing rejected", body: { en: "Hi {{name}}, your listing {{listing_id}} needs changes: {{reasons}}. Edit and resubmit from your dashboard.", ar: "مرحباً {{name}}، إعلانك {{listing_id}} يحتاج تعديلات: {{reasons}}. عدّله وأعد إرساله من لوحة التحكم." } },
  { id: "otp_login", channel: "sms", name: "Login OTP", body: { en: "Your MaxPro code is {{otp}}. It expires in 5 minutes.", ar: "رمز ماكس برو الخاص بك هو {{otp}}. صالح لمدة 5 دقائق." } },
  { id: "lead_forwarded", channel: "inapp", name: "New lead", body: { en: "New lead for {{listing_id}} from {{customer}} via {{channel}}.", ar: "عميل جديد لـ {{listing_id}} من {{customer}} عبر {{channel}}." } },
];

const sampleVars: Record<string, string> = {
  name: "Pearl Gate Realty",
  listing_id: "MP-10231",
  url: "maxpro.qa/l/MP-10231",
  search: "2BR Pearl < 13k",
  title: "Sea-view 2BR, Porto Arabia",
  price: "QAR 12,500",
  reasons: "missing kitchen photo",
  otp: "482 913",
  customer: "James C.",
  channel: "WhatsApp",
};

export function Notifications() {
  const { lang, t, isAr } = useLang();
  const { state, audit } = useStore();
  const now = useNow(30000);
  const [templates, setTemplates] = useState(seedTemplates);
  const [sel, setSel] = useState(seedTemplates[0].id);
  const tpl = templates.find((x) => x.id === sel)!;
  const render = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => sampleVars[k] ?? `{{${k}}}`);

  return (
    <div>
      <SectionHead
        title={t("Notification engine", "محرك الإشعارات")}
        desc={t("Email, SMS/OTP, WhatsApp and in-app messages from editable bilingual templates, with a delivery log.", "رسائل البريد والرسائل النصية وواتساب والإشعارات الداخلية من قوالب ثنائية اللغة مع سجل تسليم.")}
        req={["FR-ADM-04", "FR-WAP-05"]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-stone-100 px-4 py-3 text-sm font-semibold text-stone-900">{t("Templates", "القوالب")}</div>
          <ul className="divide-y divide-stone-100">
            {templates.map((x) => {
              const Icon = chIcon[x.channel];
              return (
                <li key={x.id}>
                  <button onClick={() => setSel(x.id)} className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-stone-50", sel === x.id && "bg-brand-50/60")}>
                    <Icon className="h-4 w-4 text-stone-500" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-stone-800">{x.name}</div>
                      <div className="font-mono text-[10px] text-stone-400">{x.id}</div>
                    </div>
                    {x.waApproval && (
                      <Badge tone={x.waApproval === "approved" ? "green" : x.waApproval === "pending" ? "amber" : "red"} className="text-[10px]">
                        Meta: {x.waApproval}
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-stone-900">{tpl.name}</div>
            <Badge>{tpl.channel}</Badge>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {(["en", "ar"] as const).map((l) => (
              <label key={l} className="text-xs font-medium text-stone-500">
                {l === "en" ? "English" : "العربية"}
                <textarea
                  value={tpl.body[l]}
                  dir={l === "ar" ? "rtl" : "ltr"}
                  onChange={(e) => setTemplates((xs) => xs.map((x) => (x.id === tpl.id ? { ...x, body: { ...x.body, [l]: e.target.value } } : x)))}
                  rows={4}
                  className={cn(input, "mt-1 font-mono text-xs")}
                />
              </label>
            ))}
          </div>
          <div className="mt-3 text-xs font-medium text-stone-500">{t("Preview", "معاينة")}</div>
          <div className={cn("mt-1 rounded-xl p-3", tpl.channel === "whatsapp" ? "bg-wa-chat" : "bg-stone-50")}>
            <div className="max-w-sm rounded-lg bg-white px-3 py-2 text-sm text-stone-800 shadow-sm" dir={isAr ? "rtl" : "ltr"}>
              {render(tpl.body[lang])}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                audit({ actor: "Admin", role: "admin", action: "template.updated", target: tpl.id, detail: tpl.channel === "whatsapp" ? "resubmitted for Meta approval" : undefined });
                if (tpl.channel === "whatsapp") setTemplates((xs) => xs.map((x) => (x.id === tpl.id ? { ...x, waApproval: "pending" } : x)));
                toast(tpl.channel === "whatsapp" ? t("Saved — submitted to Meta for approval", "تم الحفظ — أُرسل إلى ميتا للموافقة") : t("Template saved", "تم حفظ القالب"));
              }}
              className={cn(btn.primary, "py-1.5 text-xs")}
            >
              {t("Save template", "حفظ القالب")}
            </button>
            {tpl.channel === "whatsapp" && (
              <span className="text-[11px] text-stone-500">{t("WhatsApp templates are needed outside the 24-hour window and require Meta approval.", "قوالب واتساب مطلوبة خارج نافذة 24 ساعة وتحتاج موافقة ميتا.")}</span>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4 overflow-x-auto">
        <div className="border-b border-stone-100 px-4 py-3 text-sm font-semibold text-stone-900">{t("Delivery log", "سجل التسليم")}</div>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              {[t("Time", "الوقت"), t("Channel", "القناة"), t("Recipient", "المستلم"), t("Template", "القالب"), t("Status", "الحالة")].map((h) => (
                <th key={h} className="px-4 py-2 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {state.notifications.map((n) => {
              const Icon = chIcon[n.channel];
              return (
                <tr key={n.id}>
                  <td className="px-4 py-2 text-xs text-stone-500">{now ? timeAgo(n.at, lang) : ""}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5 text-xs capitalize text-stone-700">
                      <Icon className="h-3.5 w-3.5" />
                      {n.channel}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-stone-700" dir="ltr">
                    {n.to}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-stone-700">{n.template}</td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone[n.status]}>{n.status}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------------- AI console ----------------

export function AiConsole() {
  const { lang, t, p, href } = useLang();
  const { state, audit } = useStore();
  const now = useNow(30000);
  const [ratings, setRatings] = useState<Record<string, "up" | "down">>({});
  const [guards, setGuards] = useState({ disclaimer: true, pii: true, discrimination: true, injection: true });
  const [rate, setRate] = useState(20);
  const [retention, setRetention] = useState(90);

  const transcripts = state.conversations.filter((c) => c.channel === "ai" || c.messages.some((m) => m.from === "bot"));

  const rate1 = (id: string, v: "up" | "down") => {
    setRatings((r) => ({ ...r, [id]: v }));
    audit({ actor: "Admin", role: "admin", action: "ai.transcript.rated", target: id, detail: v });
  };

  const evals = [
    { label: t("Listing-fact hallucination", "اختلاق معلومات الإعلانات"), value: "0.6%", target: "≤ 1%", ok: true },
    { label: t("Response latency p95", "زمن الاستجابة p95"), value: "4.2 s", target: "≤ 6 s", ok: true },
    { label: t("Correct human handover", "دقة التحويل للموظف"), value: "96%", target: "≥ 95%", ok: true },
    { label: t("Prompt-injection red-team", "اختبار حقن الأوامر"), value: "0 / 25", target: t("0 succeed", "0 ناجحة"), ok: true },
    { label: t("Arabic answers in Arabic", "الرد بالعربية على العربية"), value: "100%", target: "100%", ok: true },
  ];

  const spent = 1420;
  const cap = 3000;

  return (
    <div>
      <SectionHead
        title={t("AI console", "وحدة الذكاء الاصطناعي")}
        desc={t(
          "Transcript review, evaluation results, cost monitoring, knowledge base and guardrails for the support and marketing agents.",
          "مراجعة المحادثات ونتائج التقييم ومراقبة التكلفة وقاعدة المعرفة وضوابط وكلاء الدعم والتسويق.",
        )}
        req={["WP-SUP-08", "WP-SUP-10", "WP-SUP-07"]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-stone-900">{t("Evaluation — release gate", "التقييم — بوابة الإطلاق")}</h3>
            <Badge tone="amber">{t("Sample figures", "أرقام تجريبية")}</Badge>
          </div>
          <p className="mt-1 text-xs text-stone-500">{t("100 Arabic & English test conversations · run before every release", "100 محادثة اختبار بالعربية والإنجليزية · تُشغّل قبل كل إصدار")}</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {evals.map((e) => (
              <div key={e.label} className="rounded-xl border border-stone-200 p-3">
                <div className="text-xs text-stone-500">{e.label}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold tabular-nums text-stone-900">{e.value}</span>
                  <span className="text-[11px] text-stone-400">{t("target", "الهدف")} {e.target}</span>
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <CircleCheck className="h-3 w-3" /> {t("Pass", "ناجح")}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-stone-900">{t("Cost monitor", "مراقبة التكلفة")}</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("Tokens / day", "الرموز يومياً")}</dt>
              <dd className="font-semibold tabular-nums">1.84M</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("Cost / day", "التكلفة يومياً")}</dt>
              <dd className="font-semibold tabular-nums">{qar(62, lang)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("Per conversation", "لكل محادثة")}</dt>
              <dd className="font-semibold tabular-nums">QAR 0.21</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">{t("Cache hit rate", "نسبة الاستفادة من الذاكرة")}</dt>
              <dd className="font-semibold tabular-nums">68%</dd>
            </div>
          </dl>
          <div className="mt-4 text-xs text-stone-500">
            {t("Monthly cap", "الحد الشهري")} · {qar(spent, lang)} / {qar(cap, lang)}
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${(spent / cap) * 100}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-stone-400">{t("Alert at 80%; assistant falls back to search links at 100%.", "تنبيه عند 80٪؛ يتحول المساعد لروابط البحث عند 100٪.")}</p>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-stone-100 px-4 py-3 text-sm font-semibold text-stone-900">{t("Transcript review", "مراجعة المحادثات")}</div>
          <ul className="divide-y divide-stone-100">
            {transcripts.map((c) => {
              const first = c.messages.find((m) => m.from === "user");
              const handed = c.messages.some((m) => m.from === "system" && /hand/i.test(m.text)) || !!c.handoverReason;
              return (
                <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                  <Bot className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-stone-800">{c.customer.name}</span>
                      <Badge className="text-[10px]">{c.channel}</Badge>
                      {handed ? <Badge tone="amber" className="text-[10px]">{t("Handed over", "حُوّلت لموظف")}</Badge> : <Badge tone="green" className="text-[10px]">{t("Resolved by AI", "حلها الذكاء")}</Badge>}
                      <span className="text-stone-400">{now ? timeAgo(c.updatedAt, lang) : ""}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-stone-600" dir="auto">
                      “{first?.text}”
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {c.messages.length} {t("messages", "رسائل")}
                      {c.listingId && ` · ${c.listingId}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => rate1(c.id, "up")} className={cn("rounded-md p-1.5", ratings[c.id] === "up" ? "bg-emerald-100 text-emerald-700" : "text-stone-400 hover:bg-stone-100")} aria-label="Good">
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => rate1(c.id, "down")} className={cn("rounded-md p-1.5", ratings[c.id] === "down" ? "bg-red-100 text-red-700" : "text-stone-400 hover:bg-stone-100")} aria-label="Bad">
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                    <Link href={href(`/inbox?c=${c.id}`)} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100" aria-label="Open">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-stone-900">{t("Guardrails", "الضوابط")}</h3>
            <div className="mt-3 space-y-3 text-sm">
              {(
                [
                  ["disclaimer", t("Legal / financial advice disclaimers", "تنبيه بعدم تقديم استشارات قانونية أو مالية")],
                  ["pii", t("PII minimisation in logs", "تقليل البيانات الشخصية في السجلات")],
                  ["discrimination", t("Block discriminatory recommendations", "منع التوصيات التمييزية")],
                  ["injection", t("Prompt-injection filter", "مرشح حقن الأوامر")],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <span className="text-stone-700">{label}</span>
                  <Toggle
                    on={guards[k]}
                    onChange={(v) => {
                      setGuards((g) => ({ ...g, [k]: v }));
                      audit({ actor: "Admin", role: "admin", action: "ai.guardrail.updated", target: k, detail: v ? "on" : "off" });
                    }}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-3">
                <span className="text-stone-700">{t("Rate limit (msgs / user / hour)", "الحد (رسائل / مستخدم / ساعة)")}</span>
                <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className={cn(input, "w-20 py-1 text-end")} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-stone-700">{t("Transcript retention (days)", "مدة الاحتفاظ بالمحادثات (أيام)")}</span>
                <input type="number" value={retention} onChange={(e) => setRetention(Number(e.target.value))} className={cn(input, "w-20 py-1 text-end")} />
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-[11px] text-stone-500">
              <ShieldCheck className="me-1 inline h-3 w-3" />
              {t("Provider is configurable (D-03). Tools are read-only listing search + knowledge base; credentials stay server-side.", "مزود النموذج قابل للتغيير (D-03). الأدوات للقراءة فقط؛ المفاتيح على الخادم.")}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold text-stone-900">{t("Knowledge base", "قاعدة المعرفة")}</h3>
            <ul className="mt-2 divide-y divide-stone-100">
              {kb.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-stone-700">{p(a.title)}</span>
                  <Link href={href(a.url)} className="shrink-0 text-xs font-medium text-brand-700 hover:underline">
                    {t("Source page", "صفحة المصدر")}
                  </Link>
                </li>
              ))}
            </ul>
            <button onClick={() => toast(t("Draft article created", "تم إنشاء مسودة مقال"))} className={cn(btn.secondary, "mt-2 w-full py-1.5 text-xs")}>
              {t("New article", "مقال جديد")}
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------- Audit trail ----------------

/** Tamper-evident chain: each row's hash covers its content plus the previous hash. */
function chain(entries: AuditEntry[]) {
  const hashes: Record<string, string> = {};
  let prev = "0000000";
  for (const e of [...entries].reverse()) {
    const s = prev + JSON.stringify([e.id, e.at, e.actor, e.role, e.action, e.target, e.detail]);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    prev = h.toString(16).padStart(8, "0").slice(0, 7);
    hashes[e.id] = prev;
  }
  return hashes;
}

const ROLES: AuditEntry["role"][] = ["admin", "moderator", "agent", "ai", "advertiser", "system"];

export function AuditTrail() {
  const { lang, t } = useLang();
  const { state } = useStore();
  const now = useNow(30000);
  const [roles, setRoles] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const hashes = useMemo(() => chain(state.audit), [state.audit]);

  const rows = state.audit.filter(
    (a) =>
      (!roles.length || roles.includes(a.role)) &&
      (!q || `${a.actor} ${a.action} ${a.target ?? ""} ${a.detail ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  const exportCsv = () => downloadCsv("maxpro-audit.csv", [["id", "time", "actor", "role", "action", "target", "detail", "hash"], ...rows.map((a) => [a.id, a.at, a.actor, a.role, a.action, a.target, a.detail, hashes[a.id]])]);

  return (
    <div>
      <SectionHead
        title={t("Audit trail", "سجل التدقيق")}
        desc={t(
          "Append-only record of admin, moderator, support and AI-agent actions. Entries cannot be edited or deleted; each row is hash-chained to the previous one.",
          "سجل إلحاقي فقط لإجراءات الإدارة والمراجعين والدعم ووكلاء الذكاء. لا يمكن تعديل أو حذف السجلات؛ كل سطر مرتبط بتجزئة السطر السابق.",
        )}
        req={["FR-ADM-05", "WP-MKT-07"]}
        actions={
          <button onClick={exportCsv} className={cn(btn.secondary, "py-1.5 text-xs")}>
            <Download className="h-3.5 w-3.5" />
            {t("Export CSV", "تصدير CSV")}
          </button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {ROLES.map((r) => {
          const on = roles.includes(r);
          return (
            <button
              key={r}
              onClick={() => setRoles((s) => (on ? s.filter((x) => x !== r) : [...s, r]))}
              className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold uppercase", on ? "border-transparent " + roleCls(r) : "border-stone-200 text-stone-500 hover:bg-stone-50")}
            >
              {r}
            </button>
          );
        })}
        <div className="relative ms-auto w-64">
          <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search actions, targets…", "ابحث في الإجراءات…")} className={cn(input, "py-1.5 ps-8 text-xs")} />
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              {[t("Time", "الوقت"), t("Actor", "المنفذ"), t("Role", "الدور"), t("Action", "الإجراء"), t("Target", "الهدف"), t("Detail", "التفاصيل"), "Hash"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-stone-500">{now ? timeAgo(a.at, lang) : ""}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-stone-800">
                    {a.role === "ai" ? <Bot className="h-3.5 w-3.5 text-violet-500" /> : <UserRound className="h-3.5 w-3.5 text-stone-400" />}
                    {a.actor}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", roleCls(a.role))}>{a.role}</span>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-stone-800">{a.action}</td>
                <td className="px-3 py-2 font-mono text-xs text-brand-700">{a.target}</td>
                <td className="max-w-xs truncate px-3 py-2 text-xs text-stone-500" title={a.detail}>
                  {a.detail}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-stone-400">
                  <Lock className="me-1 inline h-2.5 w-2.5" />
                  {hashes[a.id]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-6 text-center text-sm text-stone-400">{t("No entries", "لا توجد سجلات")}</p>}
      </Card>
      <p className="mt-2 text-xs text-stone-400">
        {num(state.audit.length, lang)} {t("entries · retention per policy", "سجل · الاحتفاظ وفق السياسة")}
      </p>
    </div>
  );
}
