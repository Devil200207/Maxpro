"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Apple,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Landmark,
  Lock,
  Megaphone,
  Minus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { Badge, btn, Card, cn, input, ReqTag } from "@/components/ui";
import { Modal } from "@/components/advertiser/Modal";
import { InvoiceView } from "@/components/advertiser/InvoiceView";
import { nextInvoiceId } from "@/components/advertiser/billing";
import { toast } from "@/components/Toaster";
import { DEMO_NOW, planById, planFeatureNames, plans, type Plan } from "@/lib/data";
import { StageBadge, StageGate } from "@/lib/stage";
import { type OwnedInvoice, useAccount } from "@/components/account/useAccount";
import { AccountBar } from "@/components/account/AccountBar";
import { gregorian, num, qar } from "@/lib/format";
import { uid, useStore, type Invoice } from "@/lib/store";
import { track } from "@/lib/tracking";
import { useLang } from "@/lib/useLang";

type Cycle = "monthly" | "annual";
type Method = "card" | "apple" | "debit" | "bank";
type Step = "summary" | "method" | "gateway" | "otp" | "processing" | "done";

const DAY = 86400000;
const priceFor = (p: Plan, c: Cycle) => (p.monthly <= 0 ? p.monthly : c === "annual" ? p.monthly * 10 : p.monthly);

export default function PricingPage() {
  const { lang, t, p, href } = useLang();
  const { state, update } = useStore();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [checkout, setCheckout] = useState<Plan | null>(null);
  const acct = useAccount();
  const sub = useSub();

  const addOns = [
    { icon: Star, name: t("Featured slot", "خانة مميزة"), price: t("QAR 150 / listing / 14 days", "150 ر.ق / إعلان / 14 يوم"), desc: t("Pinned above organic results with a Featured badge.", "يظهر أعلى النتائج مع شارة مميز.") },
    { icon: RefreshCw, name: t("Bump to top", "رفع للأعلى"), price: t("QAR 25 / bump", "25 ر.ق / رفع"), desc: t("Refreshes the listing date so it reappears first.", "يحدّث تاريخ الإعلان ليظهر أولاً.") },
    { icon: Sparkles, name: t("Homepage banner", "بانر الصفحة الرئيسية"), price: t("QAR 2,500 / week", "2,500 ر.ق / أسبوع"), desc: t("Scheduled banner with impression and click reporting.", "بانر مجدول مع تقارير المشاهدات والنقرات.") },
    { icon: Megaphone, name: t("Managed Meta campaign", "حملة ميتا مُدارة"), price: t("Ad spend + 20% service fee", "تكلفة الإعلان + 20٪ رسوم خدمة"), desc: t("We build, run and report your Facebook & Instagram campaign. Spend and fee billed as separate lines.", "ننشئ ونشغّل حملتك على فيسبوك وإنستغرام. التكلفة والرسوم بندان منفصلان.") },
  ];

  const faqs = [
    [t("Can I change plans later?", "هل يمكنني تغيير الباقة لاحقاً؟"), t("Yes. Upgrades apply immediately with a prorated credit for unused days; downgrades take effect at the next renewal.", "نعم. الترقية فورية مع رصيد للأيام غير المستخدمة، والتخفيض يسري عند التجديد التالي.")],
    [t("What happens if a payment fails?", "ماذا يحدث إذا فشل الدفع؟"), t("We retry automatically on days 1, 3 and 5 and notify you by email and WhatsApp. Your listings stay live during a 7-day grace period.", "نعيد المحاولة تلقائياً في الأيام 1 و3 و5 ونرسل تنبيهاً بالبريد وواتساب. تبقى إعلاناتك منشورة خلال فترة سماح 7 أيام.")],
    [t("Which payment methods do you accept?", "ما طرق الدفع المتاحة؟"), t("Visa, Mastercard, Apple Pay and QPay debit cards with 3-D Secure, or bank transfer with manual approval.", "فيزا وماستركارد وآبل باي وبطاقات كيو باي مع التحقق 3-D Secure، أو التحويل البنكي بموافقة يدوية.")],
    [t("Do I get an invoice?", "هل أحصل على فاتورة؟"), t("Every payment generates a sequentially numbered bilingual invoice you can download as PDF.", "كل عملية دفع تُصدر فاتورة ثنائية اللغة بترقيم تسلسلي قابلة للتنزيل PDF.")],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <AccountBar />
      <div className="mx-auto max-w-2xl text-center">
        <div className="flex justify-center gap-1.5">
          <ReqTag id="FR-BIL-01" />
          <ReqTag id="WP-ERX-03" />
          <StageBadge s="S1" />
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          {t("Plans that grow with your portfolio", "باقات تنمو مع محفظتك العقارية")}
        </h1>
        <p className="mt-3 text-stone-500">
          {t("Every plan includes WhatsApp leads, a verified badge and the AI assistant. Prices in QAR.", "جميع الباقات تشمل عملاء واتساب وشارة التوثيق والمساعد الذكي. الأسعار بالريال القطري.")}
        </p>

        <div className="mt-6 inline-flex rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
          {(["monthly", "annual"] as Cycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition", cycle === c ? "bg-brand-600 text-white" : "text-stone-600 hover:bg-stone-50")}
            >
              {c === "monthly" ? t("Monthly", "شهري") : t("Annual", "سنوي")}
              {c === "annual" && (
                <span className={cn("ms-2 rounded-full px-1.5 py-0.5 text-[10px]", cycle === c ? "bg-white/20" : "bg-emerald-50 text-emerald-700")}>
                  {t("2 months free", "شهران مجاناً")}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((pl) => {
          const price = priceFor(pl, cycle);
          const current = sub.planId === pl.id && sub.cycle === cycle;
          return (
            <Card key={pl.id} className={cn("relative flex flex-col p-6", pl.highlight && "border-brand-600 ring-2 ring-brand-600")}>
              {pl.highlight && (
                <span className="absolute -top-3 start-6 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                  {t("Most popular", "الأكثر طلباً")}
                </span>
              )}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-stone-900">{p(pl.name)}</h2>
                {sub.planId === pl.id && <Badge tone="green">{t("Your plan", "باقتك")}</Badge>}
              </div>
              <p className="mt-1 min-h-10 text-sm text-stone-500">{p(pl.tagline)}</p>
              <div className="mt-5">
                {price === -1 ? (
                  <div className="text-3xl font-bold text-stone-900">{t("Custom", "حسب الطلب")}</div>
                ) : price === 0 ? (
                  <div className="text-3xl font-bold text-stone-900">{t("Free", "مجاناً")}</div>
                ) : (
                  <div>
                    <span className="text-3xl font-bold text-stone-900">{qar(price, lang)}</span>
                    <span className="text-sm text-stone-500"> / {cycle === "annual" ? t("year", "سنة") : t("month", "شهر")}</span>
                    {cycle === "annual" && (
                      <div className="text-xs text-emerald-700">
                        {t("Equivalent to", "ما يعادل")} {qar(Math.round(price / 12), lang)} / {t("month", "شهر")}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <ul className="mt-5 space-y-2 text-sm text-stone-700">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" />{num(pl.quotas.listings, lang)} {t("live listings", "إعلان منشور")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" />{num(pl.quotas.featuredCredits, lang)} {t("featured credits / month", "رصيد تمييز / شهر")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" />{num(pl.quotas.seats, lang)} {t("team seats", "مستخدم")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" />{num(pl.quotas.bumpsPerMonth, lang)} {t("bumps / month", "رفع / شهر")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" />{num(pl.quotas.aiCredits, lang)} {t("AI credits / month", "رصيد ذكاء / شهر")}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" />{pl.quotas.portals ? `${num(pl.quotas.portals, lang)} ${t("portal connections", "ربط بوابات")}` : t("No portal publishing", "بدون نشر على البوابات")}</li>
              </ul>
              <div className="mt-auto pt-6">
                {price === -1 ? (
                  <button onClick={() => toast(t("Sales team will contact you within 1 working day", "سيتواصل فريق المبيعات معك خلال يوم عمل"))} className={cn(btn.secondary, "w-full")}>
                    <Building2 className="h-4 w-4" />
                    {t("Contact sales", "تواصل مع المبيعات")}
                  </button>
                ) : current || !acct.can.billing ? (
                  <button disabled title={acct.can.billing ? undefined : t("Only the organisation owner can change the plan", "فقط مالك المؤسسة يمكنه تغيير الباقة")} className={cn(btn.secondary, "w-full")}>
                    {current ? t("Current plan", "الباقة الحالية") : t("Owner only", "للمالك فقط")}
                  </button>
                ) : (
                  <button onClick={() => setCheckout(pl)} className={cn(pl.highlight ? btn.primary : btn.secondary, "w-full")}>
                    {price === 0 ? t("Switch to Starter", "التحويل للمبتدئ") : t("Choose plan", "اختر الباقة")}
                    <ArrowRight className="flip-rtl h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Feature matrix */}
      <Card className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="p-4 text-start font-semibold text-stone-900">{t("Compare features", "مقارنة المزايا")}</th>
              {plans.map((pl) => (
                <th key={pl.id} className="p-4 text-center font-semibold text-stone-900">{p(pl.name)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(planFeatureNames).map((f) => (
              <tr key={f} className="border-b border-stone-100 last:border-0">
                <td className="p-4 text-stone-700">{p(planFeatureNames[f])}</td>
                {plans.map((pl) => (
                  <td key={pl.id} className="p-4 text-center">
                    {pl.features[f] ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : <Minus className="mx-auto h-4 w-4 text-stone-300" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-stone-100 px-4 py-3 text-xs text-stone-400">
          {t("Plan quotas, seats and feature flags are configuration, not code — admins can add plan types (e.g. future ERP modules) without a release.", "حدود الباقات والمستخدمين والمزايا إعدادات وليست برمجة — يمكن للإدارة إضافة أنواع باقات جديدة (مثل وحدات ERP مستقبلاً) دون إصدار جديد.")}
        </p>
      </Card>

      {/* Add-ons (Stage 2) */}
      <section className="mt-12">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-stone-900">{t("Pay-per-use add-ons", "إضافات حسب الاستخدام")}</h2>
          <ReqTag id="FR-BIL-05" />
          <StageBadge s="S2" />
        </div>
        <StageGate stage="S2" className="mt-4" label={t("Pay-per-use add-ons are delivered in Stage 2", "الإضافات حسب الاستخدام تُسلَّم في المرحلة الثانية")}>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {addOns.map((a) => (
            <Card key={a.name} className="p-5">
              <a.icon className="h-6 w-6 text-brand-600" />
              <h3 className="mt-3 font-semibold text-stone-900">{a.name}</h3>
              <div className="mt-1 text-sm font-semibold text-brand-700">{a.price}</div>
              <p className="mt-2 text-sm text-stone-500">{a.desc}</p>
            </Card>
          ))}
        </div>
        </StageGate>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-xl font-bold text-stone-900">{t("Billing FAQ", "أسئلة الفوترة")}</h2>
        <div className="mt-4 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
          {faqs.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="cursor-pointer list-none font-medium text-stone-900">{q}</summary>
              <p className="mt-2 text-sm text-stone-600">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-stone-500">
          {t("Already subscribed?", "مشترك بالفعل؟")}{" "}
          <Link href={href("/advertiser?tab=billing")} className="font-semibold text-brand-600 hover:underline">
            {t("Manage billing", "إدارة الفوترة")}
          </Link>
        </p>
      </section>

      {checkout && (
        <Checkout
          plan={checkout}
          cycle={cycle}
          onClose={() => setCheckout(null)}
          state={state}
          update={update}
        />
      )}
    </div>
  );
}

/** The signed-in account's subscription (the demo agency's lives in state.subscription). */
function useSub() {
  const { state } = useStore();
  const { adv, isDemoAgency } = useAccount();
  if (isDemoAgency) return state.subscription;
  return { ...state.subscription, planId: adv.planId, cycle: "monthly" as Cycle, renewsAt: new Date(DEMO_NOW + 30 * DAY).toISOString(), autoRenew: true, featuredUsed: 0, bumpsUsed: 0 };
}

interface CallbackEvent {
  id: string;
  at: string;
  kind: "received" | "verified" | "applied" | "duplicate";
  text: string;
}

function Checkout({
  plan,
  cycle,
  onClose,
  state,
  update,
}: {
  plan: Plan;
  cycle: Cycle;
  onClose: () => void;
  state: ReturnType<typeof useStore>["state"];
  update: ReturnType<typeof useStore>["update"];
}) {
  const { lang, t, p } = useLang();
  const [step, setStep] = useState<Step>("summary");
  const [method, setMethod] = useState<Method>("card");
  const [otp, setOtp] = useState("");
  const acct = useAccount();
  const { adv, isDemoAgency } = acct;
  const [card, setCard] = useState({ number: "4111 1111 1111 1111", name: adv.name.en, exp: "12/28", cvc: "123" });
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [coupon, setCoupon] = useState("");
  const [events, setEvents] = useState<CallbackEvent[]>([]);
  const [eventId, setEventId] = useState("");

  const sub = useSub();
  const current = planById(sub.planId);
  const price = priceFor(plan, cycle);
  const currentPrice = priceFor(current, sub.cycle);
  const isUpgrade = price > 0 && (price > currentPrice || sub.cycle !== cycle);
  const daysLeft = Math.max(0, Math.round((new Date(sub.renewsAt).getTime() - DEMO_NOW) / DAY));
  const periodDays = sub.cycle === "annual" ? 365 : 30;
  const credit = isUpgrade && currentPrice > 0 ? Math.min(price, Math.round((currentPrice * Math.min(daysLeft, periodDays)) / periodDays)) : 0;
  const total = Math.max(0, price - credit);

  const finish = (status: "paid" | "pending") => {
    const id = nextInvoiceId(state.invoices);
    const now = new Date();
    const planLabel = {
      en: `${plan.name.en} plan (${cycle === "annual" ? "annual" : "monthly"})`,
      ar: `باقة ${plan.name.ar} (${cycle === "annual" ? "سنوي" : "شهري"})`,
    };
    const lines: Invoice["lines"] = [{ label: planLabel, amount: price }];
    if (credit > 0)
      lines.push({
        label: { en: `Prorated credit — ${daysLeft} unused days on ${current.name.en}`, ar: `رصيد تناسبي — ${daysLeft} يوماً غير مستخدمة من ${current.name.ar}` },
        amount: -credit,
      });
    const inv: OwnedInvoice = {
      advertiserId: adv.id,
      id,
      at: now.toISOString(),
      description: { en: `${planLabel.en} — ${gregorian(now, "en")}`, ar: `${planLabel.ar} — ${gregorian(now, "ar")}` },
      amount: total,
      status,
      method: method === "bank" ? "bank" : method === "debit" ? "debit" : "card",
      lines,
    };
    const evt = uid("evt");
    update((s) => ({
      ...s,
      invoices: [inv, ...s.invoices],
      advertisers: status === "paid" && !isDemoAgency ? s.advertisers.map((a) => (a.id === adv.id ? { ...a, planId: plan.id } : a)) : s.advertisers,
      subscription:
        status === "paid" && isDemoAgency
          ? {
              ...s.subscription,
              planId: plan.id,
              cycle,
              status: "active",
              startedAt: now.toISOString(),
              renewsAt: new Date(now.getTime() + (cycle === "annual" ? 365 : 30) * DAY).toISOString(),
            }
          : s.subscription,
      notifications: [
        { id: uid("N"), at: now.toISOString(), channel: "email", to: `billing@${adv.id.replace("adv-", "")}.qa`, template: status === "paid" ? "payment_receipt" : "bank_transfer_instructions", status: "sent" },
        { id: uid("N"), at: now.toISOString(), channel: "whatsapp", to: adv.phone, template: status === "paid" ? "subscription_activated" : "invoice_pending", status: "delivered" },
        ...s.notifications,
      ],
      audit: [
        {
          id: uid("A"),
          at: now.toISOString(),
          actor: acct.actorName,
          role: "advertiser",
          action: status === "paid" ? "subscription.changed" : "invoice.pending_bank_transfer",
          target: id,
          detail: `${sub.planId}/${sub.cycle} → ${plan.id}/${cycle}; total QAR ${total}`,
        },
        { id: uid("A"), at: now.toISOString(), actor: "Payment gateway", role: "system", action: "payment.callback", target: id, detail: status === "paid" ? `${evt}; HMAC signature verified; applied once (idempotency key)` : "awaiting manual approval" },
        ...s.audit,
      ],
    }));
    if (status === "paid") {
      track("Subscribe", { plan: plan.id, cycle, value: total, currency: "QAR" });
      track("Purchase", { value: total, currency: "QAR", invoice: id });
    }
    setInvoice(inv);
    setEventId(evt);
    if (status === "paid") {
      const t0 = now.getTime();
      const at = (ms: number) => new Date(t0 + ms).toISOString();
      setEvents([
        { id: uid("E"), at: at(0), kind: "received", text: `POST /webhooks/payments · ${evt} · charge.succeeded · QAR ${total}` },
        { id: uid("E"), at: at(40), kind: "verified", text: `HMAC-SHA256 signature valid · amount and order ${id} match` },
        { id: uid("E"), at: at(90), kind: "applied", text: `Idempotency key ${evt} stored → subscription ${plan.id}/${cycle} activated · invoice ${id} issued (AR/EN)` },
      ]);
    }
    setStep("done");
    toast(status === "paid" ? t("Payment successful — plan activated", "تم الدفع — تم تفعيل الباقة") : t("Invoice issued — awaiting bank transfer", "صدرت الفاتورة — بانتظار التحويل"));
  };

  const pay = () => {
    if (method === "bank") return finish("pending");
    if (method === "apple") {
      setStep("processing");
      setTimeout(() => finish("paid"), 1200);
      return;
    }
    setStep("gateway");
  };

  const methods: { id: Method; icon: typeof CreditCard; label: string; sub: string }[] = [
    { id: "card", icon: CreditCard, label: t("Credit / debit card", "بطاقة ائتمان / خصم"), sub: "Visa · Mastercard · 3-D Secure" },
    { id: "apple", icon: Apple, label: "Apple Pay", sub: t("Face ID / Touch ID", "بصمة الوجه / الإصبع") },
    { id: "debit", icon: Landmark, label: t("QPay debit card", "بطاقة خصم كيو باي"), sub: t("Qatar local debit network", "شبكة الخصم المحلية في قطر") },
    { id: "bank", icon: Building2, label: t("Bank transfer", "تحويل بنكي"), sub: t("Activated after finance approval", "يُفعّل بعد موافقة المالية") },
  ];

  return (
    <Modal open onClose={onClose} title={step === "done" ? t("Invoice", "الفاتورة") : t("Checkout", "إتمام الاشتراك")} wide={step === "done"}>
      {step === "summary" && (
        <div>
          <div className="rounded-xl border border-stone-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-stone-500">{t("New plan", "الباقة الجديدة")}</div>
                <div className="font-semibold">
                  {p(plan.name)} · {cycle === "annual" ? t("Annual", "سنوي") : t("Monthly", "شهري")}
                </div>
              </div>
              <div className="font-semibold">{qar(price, lang)}</div>
            </div>
            {credit > 0 && (
              <div className="mt-3 flex items-center justify-between text-sm text-emerald-700">
                <span>
                  {t("Prorated credit", "رصيد تناسبي")} — {daysLeft} {t("unused days on", "يوماً غير مستخدمة من")} {p(current.name)}
                </span>
                <span>−{qar(credit, lang)}</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between text-sm text-stone-500">
              <span>{t("Tax (not applicable in Qatar)", "الضريبة (غير مطبقة في قطر)")}</span>
              <span>{qar(0, lang)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-lg font-bold">
              <span>{t("Due today", "المستحق اليوم")}</span>
              <span>{qar(total, lang)}</span>
            </div>
          </div>
          <StageGate stage="S2" mode="hide">
            <div className="mt-3 flex items-center gap-2">
              <input className={cn(input, "py-2 text-sm")} value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder={t("Coupon or referral code", "رمز خصم أو إحالة")} />
              <button onClick={() => toast(t("Coupons and referral credits arrive in Stage 2 (FR-BIL-06)", "القسائم وأرصدة الإحالة في المرحلة الثانية"))} className={cn(btn.secondary, "shrink-0 py-2")}>
                {t("Apply", "تطبيق")}
              </button>
              <StageBadge s="S2" />
            </div>
          </StageGate>
          {price === 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              {t("Downgrades take effect at your next renewal. Listings above the Starter quota will be paused, not deleted.", "التخفيض يسري عند التجديد التالي. الإعلانات التي تتجاوز حد المبتدئ ستُوقف مؤقتاً ولن تُحذف.")}
            </p>
          )}
          <p className="mt-3 text-xs text-stone-500">
            {t("Auto-renews", "يتجدد تلقائياً")} {cycle === "annual" ? t("yearly", "سنوياً") : t("monthly", "شهرياً")}. {t("Cancel anytime from Billing.", "يمكنك الإلغاء في أي وقت من صفحة الفوترة.")} <ReqTag id="FR-BIL-04" />
          </p>
          <button
            onClick={() => {
              if (price === 0) {
                update((s) => ({
                  ...s,
                  audit: [{ id: uid("A"), at: new Date().toISOString(), actor: acct.actorName, role: "advertiser", action: "subscription.downgrade_scheduled", target: plan.id, detail: `effective ${s.subscription.renewsAt}` }, ...s.audit],
                }));
                toast(t("Downgrade scheduled for next renewal", "تمت جدولة التخفيض للتجديد القادم"));
                onClose();
              } else setStep("method");
            }}
            className={cn(btn.primary, "mt-5 w-full")}
          >
            {price === 0 ? t("Schedule downgrade", "جدولة التخفيض") : t("Continue to payment", "متابعة الدفع")}
          </button>
        </div>
      )}

      {step === "method" && (
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            {t("Payment method", "طريقة الدفع")} <ReqTag id="FR-BIL-02" />
          </div>
          <div className="mt-3 grid gap-2">
            {methods.map((m) => (
              <label key={m.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition", method === m.id ? "border-brand-600 bg-brand-50" : "border-stone-200 hover:bg-stone-50")}>
                <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-brand-600" />
                <m.icon className="h-5 w-5 text-stone-700" />
                <div>
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="text-xs text-stone-500">{m.sub}</div>
                </div>
              </label>
            ))}
          </div>
          {method === "bank" && (
            <p className="mt-3 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
              {t("We'll issue an invoice with our IBAN. Your plan activates once the finance team approves the transfer in the admin console.", "سنصدر فاتورة برقم الآيبان. تُفعّل الباقة بعد موافقة فريق المالية على التحويل من لوحة الإدارة.")}
            </p>
          )}
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {t("Card data never touches AqarPro — you pay on the gateway's PCI DSS hosted page.", "بيانات البطاقة لا تمر عبر عقار برو — الدفع يتم على صفحة البوابة المستضافة المتوافقة مع PCI DSS.")} <ReqTag id="NFR-SEC-03" />
            </span>
          </div>
          <button onClick={pay} className={cn(btn.primary, "mt-5 w-full")}>
            {method === "bank" ? t("Issue invoice", "إصدار الفاتورة") : `${t("Pay", "ادفع")} ${qar(total, lang)}`}
          </button>
        </div>
      )}

      {step === "gateway" && (
        <div dir="ltr">
          <div className="-mx-5 -mt-5 mb-4 flex items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-2.5 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              https://pay.gateway-qa.example/hpp/7f3a…
            </span>
            <span className="font-semibold">Hosted payment page</span>
          </div>
          <div className="text-sm text-stone-600">
            AqarPro · <span className="font-semibold text-stone-900">{qar(total, "en")}</span>
          </div>
          <div className="mt-4 grid gap-3">
            <input className={input} value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="Card number" inputMode="numeric" />
            <input className={input} value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="Name on card" />
            <div className="grid grid-cols-2 gap-3">
              <input className={input} value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} placeholder="MM/YY" />
              <input className={input} value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} placeholder="CVC" />
            </div>
          </div>
          <button onClick={() => setStep("otp")} className={cn(btn.primary, "mt-5 w-full")}>
            Pay {qar(total, "en")}
          </button>
          <p className="mt-3 text-center text-[11px] text-stone-400">Demo gateway — no real charge. Any card number works.</p>
        </div>
      )}

      {step === "otp" && (
        <div className="text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-brand-600" />
          <h3 className="mt-3 font-semibold">3-D Secure</h3>
          <p className="mt-1 text-sm text-stone-500">
            {t("Enter the 6-digit code sent by your bank to +974 •••• 1122", "أدخل الرمز المكون من 6 أرقام المرسل من البنك إلى ‎+974 •••• 1122")}
          </p>
          <input
            className={cn(input, "mx-auto mt-4 max-w-48 text-center font-mono text-lg tracking-[0.4em]")}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            inputMode="numeric"
            dir="ltr"
            autoFocus
          />
          <button
            disabled={otp.length !== 6}
            onClick={() => {
              setStep("processing");
              setTimeout(() => finish("paid"), 1200);
            }}
            className={cn(btn.primary, "mt-5 w-full")}
          >
            {t("Verify & pay", "تحقق وادفع")}
          </button>
          <p className="mt-2 text-xs text-stone-400">{t("Demo: any 6 digits", "عرض: أي 6 أرقام")}</p>
        </div>
      )}

      {step === "processing" && (
        <div className="py-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
          <p className="mt-4 text-sm text-stone-600">{t("Verifying payment callback…", "جارٍ التحقق من إشعار الدفع…")}</p>
          <p className="mt-1 text-xs text-stone-400">{t("Signature checked · processed exactly once", "تم التحقق من التوقيع · معالجة مرة واحدة فقط")}</p>
        </div>
      )}

      {step === "done" && invoice && (
        <div className="space-y-4">
          {events.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-stone-950 p-3 font-mono text-[11px] text-stone-200" dir="ltr">
              <div className="mb-2 flex items-center justify-between font-sans text-xs">
                <span className="font-semibold text-white">Payment callback log · exactly-once processing</span>
                <span className="rounded border border-dashed border-stone-600 px-1.5 text-[10px] text-stone-400">WP-BIL-08</span>
              </div>
              <ul className="space-y-1">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-2">
                    <span className="text-stone-500">{e.at.slice(11, 23)}</span>
                    <span
                      className={cn(
                        "w-20 shrink-0 font-bold uppercase",
                        e.kind === "duplicate" ? "text-amber-400" : e.kind === "applied" ? "text-emerald-400" : "text-sky-400",
                      )}
                    >
                      {e.kind}
                    </span>
                    <span className="break-all">{e.text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setEvents((ev) => [
                    ...ev,
                    { id: uid("E"), at: new Date().toISOString(), kind: "duplicate", text: `Gateway retried ${eventId} · idempotency key already processed → ignored, logged, NOT re-applied (no second invoice, no double activation)` },
                  ]);
                  update((s) => ({
                    ...s,
                    audit: [{ id: uid("A"), at: new Date().toISOString(), actor: "Payment gateway", role: "system", action: "payment.callback_duplicate_ignored", target: invoice.id, detail: eventId }, ...s.audit],
                  }));
                  toast(t("Duplicate callback ignored — nothing applied twice", "تم تجاهل الإشعار المكرر — لم يُطبّق مرتين"));
                }}
                className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 font-sans text-xs font-semibold text-white hover:bg-white/20"
              >
                Simulate duplicate callback from gateway
              </button>
            </div>
          )}
          <InvoiceView inv={invoice} />
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link href={`/${lang}/advertiser/new`} className={btn.primary}>
              {t("Next: post a listing", "التالي: أضف إعلاناً")}
            </Link>
            <Link href={`/${lang}/advertiser?tab=billing`} className={btn.secondary}>
              {t("Go to billing", "الذهاب إلى الفوترة")}
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
