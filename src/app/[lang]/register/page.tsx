"use client";

import { useState } from "react";
import Link from "next/link";
import { Apple, ArrowLeft, ArrowRight, BadgeCheck, Building2, CheckCircle2, Circle, Clock, FileText, IdCard, Mail, Phone, ShieldCheck, Upload, User } from "lucide-react";
import { btn, Card, cn, input, ReqTag } from "@/components/ui";
import { toast } from "@/components/Toaster";
import { StageBadge } from "@/lib/stage";
import { uid, useStore, type ComplianceItem, type Verification } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import type { Advertiser } from "@/lib/data";
import { notification } from "@/components/account/useAccount";

type Method = "email" | "mobile";
type Kind = "individual" | "agency";

const COLORS = ["#0d9488", "#2563eb", "#9333ea", "#c2410c", "#be123c", "#0891b2", "#4d7c0f"];

interface Docs {
  qidNumber: string;
  qidFront: string;
  qidBack: string;
  crNumber: string;
  licence: string;
  crFile: string;
  licenceFile: string;
}

export default function RegisterPage() {
  const { t, href } = useLang();
  const { state, update } = useStore();
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<Method>("email");
  const [acct, setAcct] = useState({ name: "", email: "", password: "", mobile: "", otp: "", otpSent: false });
  const [kind, setKind] = useState<Kind>("agency");
  const [org, setOrg] = useState({ en: "", ar: "" });
  const [docs, setDocs] = useState<Docs>({ qidNumber: "", qidFront: "", qidBack: "", crNumber: "", licence: "", crFile: "", licenceFile: "" });
  const [created, setCreated] = useState<string | null>(null);

  const step0Valid =
    acct.name.trim().length > 1 &&
    (method === "email" ? /\S+@\S+\.\S+/.test(acct.email) && acct.password.length >= 8 : acct.otpSent && /^\d{6}$/.test(acct.otp));
  const step1Valid =
    kind === "individual"
      ? docs.qidNumber.length >= 6 && !!docs.qidFront && !!docs.qidBack
      : org.en.trim().length > 1 && docs.crNumber.length >= 3 && docs.licence.length >= 3 && !!docs.crFile && !!docs.licenceFile;

  const social = (provider: string) => {
    setAcct({ ...acct, name: "Mariam Al-Kaabi", email: "mariam.alkaabi@gmail.com", password: "oauth-token" });
    setMethod("email");
    toast(t(`Signed in with ${provider} (simulated OIDC)`, `تم الدخول عبر ${provider} (محاكاة)`));
  };

  const sampleDocs = () => {
    if (kind === "individual") setDocs({ ...docs, qidNumber: "28963401234", qidFront: "QID-front.jpg", qidBack: "QID-back.jpg" });
    else {
      if (!org.en) setOrg({ en: "Al Bidda Properties", ar: "البدع للعقارات" });
      setDocs({ ...docs, crNumber: "CR-190245", licence: "RE-2026-3318", crFile: "CR-190245.pdf", licenceFile: "RE-2026-3318.pdf" });
    }
  };

  const submit = () => {
    const now = new Date().toISOString();
    const advId = uid("adv");
    const orgId = uid("org");
    const memberId = uid("TM");
    const displayName = kind === "agency" ? org.en.trim() : acct.name.trim();
    const advertiser: Advertiser = {
      id: advId,
      orgId,
      kind,
      name: { en: displayName, ar: kind === "agency" ? org.ar.trim() || displayName : displayName },
      initials: displayName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      color: COLORS[state.advertisers.length % COLORS.length],
      phone: method === "mobile" ? `+974 ${acct.mobile}` : "+974 5500 0000",
      verified: false,
      licence: kind === "agency" ? docs.licence : undefined,
      planId: "starter",
      memberSince: now,
    };
    const verification: Verification = {
      id: uid("V"),
      advertiserId: advId,
      kind: kind === "agency" ? "cr" : "qid",
      docs:
        kind === "agency"
          ? [{ name: docs.crFile, type: "Commercial registration" }, { name: docs.licenceFile, type: "Brokerage licence" }]
          : [{ name: docs.qidFront, type: "Qatar ID (front)" }, { name: docs.qidBack, type: "Qatar ID (back)" }],
      licence: kind === "agency" ? docs.licence : undefined,
      status: "pending",
      submittedAt: now,
    };
    const inYear = new Date(Date.now() + 365 * 86400000).toISOString();
    const compliance: ComplianceItem[] =
      kind === "agency"
        ? [
            { id: uid("CMP"), orgId, label: { en: "Commercial registration", ar: "السجل التجاري" }, docType: "cr", number: docs.crNumber, expiresAt: inYear, status: "valid" },
            { id: uid("CMP"), orgId, label: { en: "Real-estate brokerage licence", ar: "رخصة الوساطة العقارية" }, docType: "licence", number: docs.licence, expiresAt: inYear, status: "valid" },
            { id: uid("CMP"), orgId, label: { en: "Trade licence", ar: "الرخصة التجارية" }, docType: "trade", status: "missing" },
          ]
        : [{ id: uid("CMP"), orgId, label: { en: "Qatar ID", ar: "البطاقة الشخصية القطرية" }, docType: "qid", number: `•••${docs.qidNumber.slice(-4)}`, expiresAt: inYear, status: "valid" }];
    const contact = method === "email" ? acct.email : `+974 ${acct.mobile}`;

    update((s) => ({
      ...s,
      advertisers: [...s.advertisers, advertiser],
      team: [...s.team, { id: memberId, orgId, name: acct.name.trim(), email: acct.email || `${acct.mobile}@sms.aqarpro.qa`, role: "owner", status: "active" }],
      verifications: [verification, ...s.verifications],
      compliance: [...s.compliance, ...compliance],
      session: { advertiserId: advId, memberId, role: "owner" },
      notifications: [
        notification({ channel: method === "email" ? "email" : "sms", to: contact, template: method === "email" ? "welcome_verify_email" : "otp_login" }),
        notification({ channel: "inapp", to: "Moderators", template: "verification_submitted" }),
        ...s.notifications,
      ],
      audit: [
        { id: uid("A"), at: now, actor: acct.name.trim(), role: "advertiser", action: "verification.submitted", target: verification.id, detail: `${verification.kind}; ${verification.docs.length} documents` },
        { id: uid("A"), at: now, actor: acct.name.trim(), role: "advertiser", action: "account.registered", target: advId, detail: `${kind}; via ${method}` },
        ...s.audit,
      ],
    }));
    setCreated(advId);
    setStep(2);
    toast(t("Account created — documents sent for verification", "تم إنشاء الحساب — أُرسلت المستندات للتوثيق"));
  };

  const steps = [t("Account", "الحساب"), t("Identity & licence", "الهوية والترخيص"), t("Verification", "التوثيق")];
  const createdAdv = created ? state.advertisers.find((a) => a.id === created) : undefined;
  const createdV = created ? state.verifications.find((v) => v.advertiserId === created) : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{t("Register as an advertiser", "سجّل كمعلن")}</h1>
        <StageBadge s="S1" />
        <ReqTag id="FR-ACC-01" />
        <ReqTag id="FR-ACC-03" />
      </div>
      <p className="-mt-4 mb-6 text-sm text-stone-500">
        {t("UAT scenario C3 — register, upload QID or CR + licence, get verified, then subscribe and post.", "سيناريو القبول C3 — سجّل، ارفع البطاقة أو السجل والرخصة، احصل على التوثيق، ثم اشترك وانشر.")}
      </p>

      <ol className="mb-6 flex items-center gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold", i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-600 text-white" : "bg-stone-200 text-stone-500")}>
              {i < step ? "✓" : i + 1}
            </span>
            <span className={cn("text-sm font-medium", i === step ? "text-stone-900" : "text-stone-500")}>{s}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-stone-200" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => social("Google")} className={btn.secondary}>
              <span className="font-bold text-[#4285f4]">G</span> {t("Continue with Google", "المتابعة عبر Google")}
            </button>
            <button onClick={() => social("Apple")} className={btn.secondary}>
              <Apple className="h-4 w-4" /> {t("Continue with Apple", "المتابعة عبر Apple")}
            </button>
          </div>
          <div className="my-5 flex items-center gap-3 text-xs text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            {t("or", "أو")}
            <span className="h-px flex-1 bg-stone-200" />
          </div>
          <div className="mb-4 flex gap-1 rounded-lg bg-stone-100 p-1 text-sm font-semibold">
            {(["email", "mobile"] as Method[]).map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5", method === m ? "bg-white shadow-sm" : "text-stone-500")}>
                {m === "email" ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                {m === "email" ? t("Email + password", "البريد وكلمة المرور") : t("Mobile + OTP", "الجوال ورمز التحقق")}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <Field label={t("Your full name", "الاسم الكامل")}>
              <input className={input} value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} placeholder="Mariam Al-Kaabi" />
            </Field>
            {method === "email" ? (
              <>
                <Field label={t("Email", "البريد الإلكتروني")}>
                  <input className={input} type="email" dir="ltr" value={acct.email} onChange={(e) => setAcct({ ...acct, email: e.target.value })} placeholder="name@company.qa" />
                </Field>
                <Field label={t("Password (min 8 characters)", "كلمة المرور (8 أحرف على الأقل)")}>
                  <input className={input} type="password" value={acct.password} onChange={(e) => setAcct({ ...acct, password: e.target.value })} />
                </Field>
              </>
            ) : (
              <Field label={t("Qatar mobile number", "رقم الجوال القطري")}>
                <div className="flex gap-2" dir="ltr">
                  <span className="grid place-items-center rounded-lg border border-stone-300 bg-stone-50 px-3 text-sm">+974</span>
                  <input className={input} value={acct.mobile} onChange={(e) => setAcct({ ...acct, mobile: e.target.value })} placeholder="5512 3456" />
                  <button
                    onClick={() => {
                      setAcct({ ...acct, otpSent: true });
                      toast(t("OTP sent by SMS (demo: any 6 digits)", "تم إرسال الرمز (عرض: أي 6 أرقام)"));
                    }}
                    disabled={acct.mobile.replace(/\D/g, "").length < 8}
                    className={cn(btn.secondary, "shrink-0")}
                  >
                    {t("Send code", "إرسال الرمز")}
                  </button>
                </div>
                {acct.otpSent && (
                  <input className={cn(input, "mt-2 tracking-[0.5em]")} dir="ltr" maxLength={6} value={acct.otp} onChange={(e) => setAcct({ ...acct, otp: e.target.value.replace(/\D/g, "") })} placeholder="••••••" />
                )}
              </Field>
            )}
          </div>
          <p className="mt-4 text-xs text-stone-500">
            {t("By continuing you accept the Terms and Privacy Policy (Qatar Law No. 13 of 2016). Marketing and WhatsApp consent can be changed any time.", "بالمتابعة توافق على الشروط وسياسة الخصوصية (القانون رقم 13 لسنة 2016). يمكنك تغيير موافقة التسويق وواتساب في أي وقت.")}
          </p>
          <div className="mt-5 flex justify-end">
            <button onClick={() => setStep(1)} disabled={!step0Valid} className={btn.primary}>
              {t("Continue", "متابعة")} <ArrowRight className="flip-rtl h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(["individual", "agency"] as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn("flex items-start gap-3 rounded-xl border p-4 text-start", kind === k ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-stone-200 hover:border-stone-300")}
              >
                {k === "individual" ? <User className="mt-0.5 h-5 w-5 text-brand-600" /> : <Building2 className="mt-0.5 h-5 w-5 text-brand-600" />}
                <span>
                  <span className="block font-semibold text-stone-900">{k === "individual" ? t("Individual owner", "مالك فرد") : t("Agency / broker", "وكالة / وسيط")}</span>
                  <span className="text-xs text-stone-500">
                    {k === "individual" ? t("Upload your Qatar ID (front and back)", "ارفع بطاقتك الشخصية (الأمام والخلف)") : t("Commercial registration + real-estate licence", "السجل التجاري + رخصة الوساطة العقارية")}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {kind === "agency" ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={t("Agency name (English)", "اسم الوكالة (إنجليزي)")}>
                    <input className={input} value={org.en} onChange={(e) => setOrg({ ...org, en: e.target.value })} />
                  </Field>
                  <Field label={t("Agency name (Arabic)", "اسم الوكالة (عربي)")}>
                    <input className={input} dir="rtl" value={org.ar} onChange={(e) => setOrg({ ...org, ar: e.target.value })} />
                  </Field>
                  <Field label={t("Commercial registration no.", "رقم السجل التجاري")}>
                    <input className={input} dir="ltr" value={docs.crNumber} onChange={(e) => setDocs({ ...docs, crNumber: e.target.value })} placeholder="CR-123456" />
                  </Field>
                  <Field label={t("Real-estate licence no.", "رقم رخصة الوساطة")}>
                    <input className={input} dir="ltr" value={docs.licence} onChange={(e) => setDocs({ ...docs, licence: e.target.value })} placeholder="RE-2026-0000" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FileBox label={t("Commercial registration (PDF)", "السجل التجاري (PDF)")} value={docs.crFile} onChange={(v) => setDocs({ ...docs, crFile: v })} icon={FileText} />
                  <FileBox label={t("Brokerage licence (PDF)", "رخصة الوساطة (PDF)")} value={docs.licenceFile} onChange={(v) => setDocs({ ...docs, licenceFile: v })} icon={FileText} />
                </div>
              </>
            ) : (
              <>
                <Field label={t("Qatar ID number", "رقم البطاقة الشخصية")}>
                  <input className={input} dir="ltr" value={docs.qidNumber} onChange={(e) => setDocs({ ...docs, qidNumber: e.target.value.replace(/\D/g, "") })} placeholder="28900000000" />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FileBox label={t("QID — front", "البطاقة — الأمام")} value={docs.qidFront} onChange={(v) => setDocs({ ...docs, qidFront: v })} icon={IdCard} />
                  <FileBox label={t("QID — back", "البطاقة — الخلف")} value={docs.qidBack} onChange={(v) => setDocs({ ...docs, qidBack: v })} icon={IdCard} />
                </div>
              </>
            )}
            <button onClick={sampleDocs} className="text-xs font-semibold text-brand-600 hover:underline">
              {t("Use sample documents (demo)", "استخدم مستندات تجريبية")}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            {t("Documents are encrypted at rest and visible only to AqarPro moderators.", "تُشفّر المستندات ولا يطّلع عليها إلا مشرفو عقار برو.")}
          </div>

          <div className="mt-5 flex justify-between">
            <button onClick={() => setStep(0)} className={btn.secondary}>
              <ArrowLeft className="flip-rtl h-4 w-4" /> {t("Back", "رجوع")}
            </button>
            <button onClick={submit} disabled={!step1Valid} className={btn.primary}>
              <Upload className="h-4 w-4" /> {t("Submit for verification", "إرسال للتوثيق")}
            </button>
          </div>
        </Card>
      )}

      {step === 2 && createdAdv && (
        <Card className="p-6">
          <div className="flex items-center gap-3">
            {createdAdv.verified ? <BadgeCheck className="h-10 w-10 text-sky-600" /> : <Clock className="h-10 w-10 text-amber-500" />}
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                {createdAdv.verified ? t("You're verified!", "تم توثيقك!") : createdV?.status === "rejected" ? t("Verification rejected", "رُفض التوثيق") : t("Pending verification", "بانتظار التوثيق")}
              </h2>
              <p className="text-sm text-stone-500">
                {createdAdv.name.en} · {createdV?.id}
              </p>
            </div>
          </div>
          <ol className="mt-6 space-y-3 text-sm">
            {[
              { done: true, label: t("Account created", "تم إنشاء الحساب") },
              { done: true, label: t("Documents uploaded", "تم رفع المستندات") },
              { done: createdAdv.verified, label: t("Moderator approves verification and grants the verified badge", "يوافق المشرف ويمنح شارة التوثيق") },
              { done: false, label: t("Choose a plan and pay online (3-D Secure)", "اختر باقة وادفع إلكترونياً (3-D Secure)") },
              { done: false, label: t("Post a listing with room-tagged photos → moderation → live", "انشر إعلاناً بصور مصنفة حسب الغرف ← مراجعة ← نشر") },
            ].map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                {s.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-stone-300" />}
                <span className={s.done ? "text-stone-900" : "text-stone-500"}>{s.label}</span>
              </li>
            ))}
          </ol>
          {!createdAdv.verified && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {t("While unverified you can save drafts and choose a plan, but you cannot submit listings for publication.", "قبل التوثيق يمكنك حفظ المسودات واختيار باقة، لكن لا يمكنك إرسال الإعلانات للنشر.")}{" "}
              <Link href={href("/admin?tab=verification")} target="_blank" className="font-semibold underline">
                {t("Demo: open the moderator's verification queue in a new tab", "عرض: افتح قائمة التوثيق للمشرف في تبويب جديد")}
              </Link>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={href("/pricing")} className={btn.primary}>
              {t("Choose a plan", "اختر باقة")}
            </Link>
            <Link href={href("/advertiser")} className={btn.secondary}>
              {t("Go to my dashboard", "اذهب إلى لوحتي")}
            </Link>
            <Link href={href("/advertiser/new")} className={btn.secondary}>
              {t("Start a listing draft", "ابدأ مسودة إعلان")}
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-stone-600">{label}</span>
      {children}
    </label>
  );
}

function FileBox({ label, value, onChange, icon: Icon }: { label: string; value: string; onChange: (v: string) => void; icon: typeof FileText }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 text-sm", value ? "border-emerald-300 bg-emerald-50" : "border-stone-300 hover:bg-stone-50")}>
      <Icon className={cn("h-6 w-6 shrink-0", value ? "text-emerald-600" : "text-stone-400")} />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-stone-800">{label}</span>
        <span className="block truncate text-xs text-stone-500">{value || "PDF / JPG / PNG"}</span>
      </span>
      <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0].name)} />
    </label>
  );
}
