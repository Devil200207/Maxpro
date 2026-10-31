"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, CircleAlert, FileText, Info, Loader2, Mic, Network, RotateCcw, ShieldCheck, Sparkles, Type, Upload } from "lucide-react";
import { Badge, btn, Card, cn, input, PageTitle, ReqTag } from "@/components/ui";
import { toast } from "@/components/Toaster";
import { ActingAs, useActor } from "@/components/hub/parts";
import { PublishPanel } from "@/components/hub/PublishPanel";
import { generateCopy, toSheet } from "@/lib/studio/content";
import { AI_COST, useAiCredits } from "@/lib/studio/credits";
import { draftToListing, emptyDraft, nextListingId, studioChecks, type IntakeMethod, type StudioCheck, type StudioDraft } from "@/lib/studio/draft";
import { missingFacts, sampleDocumentText, sampleText, sampleVoiceText, type Facts } from "@/lib/studio/extract";
import { StageBadge } from "@/lib/stage";
import { uid, useStore } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { ContentStep } from "./ContentStep";
import { FactsStep } from "./FactsStep";
import { PhotosStep } from "./PhotosStep";

const KEY = "aqarpro-studio-draft";
const PREVIEW_ID = "AQ-PREVIEW";

const methodCost: Record<IntakeMethod, number> = { text: AI_COST.text, document: AI_COST.document, voice: AI_COST.voice };

export function StudioWizard() {
  const { state, update } = useStore();
  const { t, p, lang } = useLang();
  const credits = useAiCredits();
  const actor = useActor();
  const [d, setD] = useState<StudioDraft>(emptyDraft);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [checks, setChecks] = useState<StudioCheck[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Restore an unfinished draft after mount (keeps SSR and first render identical).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setD({ ...emptyDraft(), ...(JSON.parse(raw) as StudioDraft) });
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      /* large uploads: keep in memory only */
    }
  }, [d, loaded]);

  const patch = (x: Partial<StudioDraft>) => setD((cur) => ({ ...cur, ...x }));
  const sheet = toSheet(d.facts);
  const missing = missingFacts(d.facts);
  const preview = useMemo(
    () => (d.copy ? draftToListing(d, d.listingId ?? PREVIEW_ID, state.session, Date.parse("2026-10-24T09:00:00+03:00")) : undefined),
    [d, state.session],
  );
  const saved = d.listingId ? state.listings.find((l) => l.id === d.listingId) : undefined;
  const readonly = state.session.role === "readonly";

  const steps = [
    t("Intake", "الإدخال"),
    t("Facts", "المعلومات"),
    t("Photos", "الصور"),
    t("AR / EN copy", "النص عربي / إنجليزي"),
    t("Checks & approve", "الفحص والاعتماد"),
    t("Publish to portals", "النشر للبوابات"),
  ];
  const stepOk = [d.source.trim().length > 10, missing.length === 0, d.photos.length > 0, !!d.copy, !!saved, true];
  const canGo = (i: number) => i <= d.step || stepOk.slice(0, i).every(Boolean);


  const extract = async () => {
    const cost = methodCost[d.method];
    if (!credits.charge("studio_extract", cost, `${d.method} intake`)) {
      toast(t("Not enough AI credits — upgrade the plan or wait for the monthly reset", "أرصدة الذكاء الاصطناعي غير كافية — رقِّ الباقة أو انتظر التجديد الشهري"));
      return;
    }
    setBusy("extract");
    try {
      const res = await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: d.source }) });
      const j = (await res.json()) as { facts: Facts; engine: string; dropped?: string[]; note?: string; latencyMs?: number };
      if (!res.ok) throw new Error();
      patch({ facts: j.facts, engine: `${j.engine} · ${j.latencyMs ?? 0} ms`, engineNote: j.note, dropped: j.dropped, step: 1, copy: undefined });
      setChecks(null);
      toast(t(`${Object.keys(j.facts).length} facts extracted — please review`, `تم استخراج ${Object.keys(j.facts).length} معلومة — يرجى المراجعة`));
    } catch {
      toast(t("Extraction failed — try again", "فشل الاستخراج — حاول مجدداً"));
    } finally {
      setBusy(null);
    }
  };

  const write = () => {
    if (!credits.charge("studio_write", AI_COST.write, "AR/EN descriptions")) {
      toast(t("Not enough AI credits", "أرصدة غير كافية"));
      return;
    }
    patch({ copy: generateCopy(sheet, d.photos.some((x) => x.enhanced)) });
    setChecks(null);
  };

  const runChecks = () => {
    if (!preview) return;
    if (!credits.charge("studio_check", AI_COST.check, "Listing quality check")) {
      toast(t("Not enough AI credits", "أرصدة غير كافية"));
      return;
    }
    setChecks(studioChecks(d, preview, state.listings));
    patch({ checksRun: true });
  };

  const blocked = !checks || checks.some((c) => c.level === "block");

  const save = () => {
    if (!d.copy || blocked || !d.reviewed) return;
    const id = nextListingId(state.listings);
    const l = draftToListing(d, id, state.session, Date.now());
    const at = new Date().toISOString();
    update((s) => ({
      ...s,
      listings: [l, ...s.listings],
      changeLog: [{ id: uid("CH"), listingId: id, at, actor: actor.name, field: "created", to: "AI Listing Studio" }, ...s.changeLog],
      audit: [
        { id: uid("A"), at, actor: actor.name, role: "advertiser" as const, action: "listing.created_ai_studio", target: id, detail: `${d.method} intake · ${l.aiSuggestedFields?.length ?? 0} unconfirmed AI field(s)` },
        { id: uid("A"), at, actor: "AI Listing Studio", role: "ai" as const, action: "ai.draft_reviewed_by_human", target: id, detail: d.engine },
        ...s.audit,
      ],
    }));
    patch({ listingId: id, step: 5 });
    toast(t(`Saved as ${id} — sent to AqarPro moderation`, `حُفظ برقم ${id} — أُرسل لمراجعة عقار برو`));
  };

  const restart = () => {
    setD(emptyDraft());
    setChecks(null);
  };

  const pct = Math.round((credits.remaining / Math.max(1, credits.quota)) * 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-7 w-7 text-brand-600" />
            {t("AI Listing Studio", "استوديو الإعلانات الذكي")} <StageBadge s="S1" />
          </span>
        }
        subtitle={t(
          "Paste a note, upload a document or send a voice note. AI drafts the listing; a person confirms every fact before anything is saved or published.",
          "الصق ملاحظة أو ارفع مستنداً أو أرسل رسالة صوتية. يصيغ الذكاء الاصطناعي الإعلان ويؤكد شخص كل معلومة قبل الحفظ أو النشر.",
        )}
        actions={
          <>
            <ActingAs />
            <div className="min-w-48 rounded-lg border border-stone-200 bg-white px-3 py-1.5" title="AIS-05 · BIL-09">
              <div className="flex justify-between text-[11px] font-semibold text-stone-600">
                <span>{t("AI credits left", "أرصدة الذكاء المتبقية")}</span>
                <span className={cn(pct < 10 && "text-red-600")}>
                  {credits.remaining.toLocaleString("en-US")} / {credits.quota.toLocaleString("en-US")}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-stone-100">
                <div className={cn("h-1.5 rounded-full", pct < 10 ? "bg-red-500" : "bg-brand-500")} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <button onClick={restart} className={btn.ghost}>
              <RotateCcw className="h-4 w-4" />
              {t("New", "جديد")}
            </button>
          </>
        }
      />

      {readonly && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {t("You are signed in as a read-only user — you can look around but cannot save or publish.", "أنت مستخدم قراءة فقط — يمكنك الاطلاع دون الحفظ أو النشر.")}
        </div>
      )}

      {/* Stepper */}
      <ol className="mb-6 flex gap-1 overflow-x-auto scrollbar-none">
        {steps.map((s, i) => (
          <li key={s} className="flex-1">
            <button
              disabled={!canGo(i) || (i < 5 && !!saved)}
              onClick={() => patch({ step: i })}
              className={cn(
                "w-full min-w-28 rounded-lg border px-3 py-2 text-start text-xs font-semibold transition disabled:cursor-not-allowed",
                d.step === i ? "border-brand-500 bg-brand-50 text-brand-700" : stepOk[i] && i < d.step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-white text-stone-500",
              )}
            >
              <span className="me-1 opacity-60">{i + 1}.</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <Card className="p-5 sm:p-6">
        {/* 0. Intake */}
        {d.step === 0 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-stone-900">{t("How would you like to add the property?", "كيف تريد إضافة العقار؟")}</h2>
              <ReqTag id="AIS-01" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(
                [
                  ["text", Type, t("Paste text", "لصق نص"), t("A WhatsApp note or an email from the owner", "رسالة واتساب أو بريد من المالك")],
                  ["document", FileText, t("Upload a document", "رفع مستند"), t("Listing sheet, PDF or photo of a form — OCR", "ورقة إعلان أو PDF أو صورة نموذج — OCR")],
                  ["voice", Mic, t("Voice note", "رسالة صوتية"), t("Speak the details in Arabic or English", "تحدث بالتفاصيل بالعربية أو الإنجليزية")],
                ] as [IntakeMethod, typeof Type, string, string][]
              ).map(([m, Icon, title, sub]) => (
                <button
                  key={m}
                  onClick={() => patch({ method: m, source: "", sourceName: undefined })}
                  className={cn("rounded-xl border p-4 text-start transition", d.method === m ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200" : "border-stone-200 hover:border-stone-300")}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-brand-600" />
                    <Badge tone="violet">
                      {methodCost[m]} {t("credits", "رصيد")}
                    </Badge>
                  </div>
                  <div className="mt-2 font-semibold text-stone-900">{title}</div>
                  <div className="text-xs text-stone-500">{sub}</div>
                </button>
              ))}
            </div>

            <div className="mt-5">
              {d.method === "text" && (
                <>
                  <div className="mb-2 flex gap-2">
                    <button onClick={() => patch({ source: sampleText.en })} className={cn(btn.ghost, "border border-stone-200 py-1.5 text-xs")}>
                      {t("Use English sample", "مثال بالإنجليزية")}
                    </button>
                    <button onClick={() => patch({ source: sampleText.ar })} className={cn(btn.ghost, "border border-stone-200 py-1.5 text-xs")}>
                      {t("Use Arabic sample", "مثال بالعربية")}
                    </button>
                  </div>
                  <textarea
                    className={cn(input, "min-h-36")}
                    value={d.source}
                    onChange={(e) => patch({ source: e.target.value })}
                    placeholder={t("Paste the property details here…", "الصق تفاصيل العقار هنا…")}
                    dir="auto"
                  />
                </>
              )}
              {d.method === "document" && (
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) patch({ source: sampleDocumentText, sourceName: f.name });
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => fileRef.current?.click()} className={btn.secondary}>
                      <Upload className="h-4 w-4" />
                      {t("Choose a file", "اختر ملفاً")}
                    </button>
                    <button onClick={() => patch({ source: sampleDocumentText, sourceName: "Listing-sheet-AlWaab-villa.pdf" })} className={btn.secondary}>
                      {t("Use sample listing sheet", "استخدام ورقة إعلان تجريبية")}
                    </button>
                  </div>
                  {d.source && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center gap-2 text-xs text-stone-500">
                        <FileText className="h-3.5 w-3.5" />
                        {d.sourceName} · <Badge tone="amber">{t("Simulated OCR text", "نص OCR محاكى")}</Badge>
                      </div>
                      <textarea className={cn(input, "min-h-40 font-mono text-xs")} value={d.source} onChange={(e) => patch({ source: e.target.value })} dir="auto" />
                    </div>
                  )}
                </div>
              )}
              {d.method === "voice" && (
                <div>
                  <button
                    onClick={() => {
                      setBusy("voice");
                      setTimeout(() => {
                        patch({ source: sampleVoiceText, sourceName: "voice-note-0:38.ogg" });
                        setBusy(null);
                      }, 1600);
                    }}
                    disabled={busy === "voice"}
                    className={cn(btn.secondary, busy === "voice" && "animate-pulse")}
                  >
                    {busy === "voice" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                    {busy === "voice" ? t("Transcribing…", "جارٍ التفريغ…") : t("Record sample voice note (0:38)", "تسجيل رسالة صوتية تجريبية (0:38)")}
                  </button>
                  {d.source && (
                    <div className="mt-3">
                      <div className="mb-1 flex items-center gap-2 text-xs text-stone-500">
                        <Mic className="h-3.5 w-3.5" />
                        {d.sourceName} · <Badge tone="amber">{t("Simulated transcription", "تفريغ محاكى")}</Badge>
                      </div>
                      <textarea className={cn(input, "min-h-24")} value={d.source} onChange={(e) => patch({ source: e.target.value })} dir="auto" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button onClick={() => void extract()} disabled={!stepOk[0] || busy === "extract" || readonly} className={btn.primary}>
                {busy === "extract" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                {t("Extract facts with AI", "استخراج المعلومات بالذكاء الاصطناعي")} · {methodCost[d.method]} {t("credits", "رصيد")}
              </button>
            </div>
          </div>
        )}

        {/* 1. Facts */}
        {d.step === 1 && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-stone-900">{t("Review what AI found", "راجع ما وجده الذكاء الاصطناعي")}</h2>
              <span className="font-mono text-xs text-stone-500">
                {t("engine", "المحرك")}: {d.engine}
              </span>
            </div>
            {d.engineNote && <p className="mb-3 text-xs text-amber-700">{d.engineNote}</p>}
            {!!d.dropped?.length && (
              <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                {t(`${d.dropped.length} AI value(s) rejected because the source did not support them: ${d.dropped.join(", ")}`, `تم رفض ${d.dropped.length} قيمة لعدم دعمها في المصدر: ${d.dropped.join(", ")}`)}
              </p>
            )}
            {missing.length > 0 && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {t("Not found in the source — please fill in", "غير موجود في المصدر — يرجى الإكمال")}: {missing.map((k) => k).join(", ")}
              </div>
            )}
            <FactsStep facts={d.facts} onChange={(facts) => patch({ facts, copy: undefined })} />
          </div>
        )}

        {d.step === 2 && <PhotosStep photos={d.photos} onChange={(photos) => patch({ photos })} type={sheet.type} beds={sheet.beds} />}

        {d.step === 3 && <ContentStep copy={d.copy} onChange={(copy) => patch({ copy })} onGenerate={write} cost={AI_COST.write} preview={preview} />}

        {/* 4. Checks & approve */}
        {d.step === 4 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-stone-900">{t("Quality checks and human approval", "فحوصات الجودة والاعتماد البشري")}</h2>
              <div className="flex items-center gap-2">
                <ReqTag id="AIS-03" />
                <ReqTag id="AIS-04" />
                <button onClick={runChecks} className={btn.secondary}>
                  <ShieldCheck className="h-4 w-4" />
                  {checks ? t("Re-run checks", "إعادة الفحص") : t("Run quality checks", "تشغيل الفحوصات")} · {AI_COST.check} {t("credit", "رصيد")}
                </button>
              </div>
            </div>
            {checks && (
              <ul className="mt-4 space-y-2">
                {checks.map((c) => (
                  <li
                    key={c.id}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      c.level === "block" ? "bg-red-50 text-red-800" : c.level === "warn" ? "bg-amber-50 text-amber-800" : c.level === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-sky-50 text-sky-800",
                    )}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {c.level === "ok" ? <CheckCircle2 className="h-4 w-4" /> : c.level === "info" ? <Info className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                      {p(c.label)}
                    </div>
                    {c.detail && <div className="ms-6 text-xs opacity-80">{p(c.detail)}</div>}
                  </li>
                ))}
              </ul>
            )}
            {preview && (
              <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
                <div className="font-semibold text-stone-900">{preview.title[lang]}</div>
                <div className="mt-1 text-stone-600">{preview.description[lang]}</div>
                {!!preview.aiSuggestedFields?.length && (
                  <div className="mt-2 text-xs text-violet-700">
                    {t("Still marked AI-suggested", "لا تزال مقترحة من الذكاء الاصطناعي")}: {preview.aiSuggestedFields.join(", ")}
                  </div>
                )}
              </div>
            )}
            <label className="mt-5 flex items-start gap-2 text-sm text-stone-700">
              <input type="checkbox" className="mt-1" checked={d.reviewed} onChange={(e) => patch({ reviewed: e.target.checked })} />
              {t(
                "I reviewed the facts, photos and both languages. Nothing here was invented by AI, and enhanced photos are disclosed.",
                "راجعت المعلومات والصور واللغتين. لا شيء هنا مختلق من الذكاء الاصطناعي، والصور المحسّنة مُفصح عنها.",
              )}
            </label>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              {!checks && <span className="text-xs text-stone-500">{t("Run the quality checks first.", "شغّل فحوصات الجودة أولاً.")}</span>}
              {checks?.some((c) => c.level === "block") && <span className="text-xs text-red-600">{t("Fix the blocking issues first.", "صحّح المشكلات المانعة أولاً.")}</span>}
              <button onClick={save} disabled={blocked || !d.reviewed || readonly} className={btn.primary}>
                <CheckCircle2 className="h-4 w-4" />
                {t("Approve & save listing", "اعتماد وحفظ الإعلان")}
              </button>
            </div>
          </div>
        )}

        {/* 5. Publish */}
        {d.step === 5 && saved && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>
                  <b>{saved.id}</b> {t("saved as the canonical AqarPro record.", "حُفظ كسجل أساسي في عقار برو.")}{" "}
                  {t("AqarPro website: pending moderation.", "موقع عقار برو: بانتظار المراجعة.")}
                </span>
              </span>
              <Link href={`/${lang}/hub?listing=${saved.id}`} className="flex items-center gap-1 font-semibold underline">
                <Network className="h-4 w-4" />
                {t("Hub dashboard", "لوحة المركز")}
              </Link>
            </div>
            <PublishPanel listingId={saved.id} />
          </div>
        )}
        {d.step === 5 && !saved && <p className="text-sm text-stone-500">{t("Save the listing first.", "احفظ الإعلان أولاً.")}</p>}
      </Card>

      {d.step > 0 && d.step < 5 && (
        <div className="mt-4 flex justify-between">
          <button onClick={() => patch({ step: d.step - 1 })} className={btn.secondary}>
            <ArrowLeft className="flip-rtl h-4 w-4" />
            {t("Back", "رجوع")}
          </button>
          {d.step < 4 && (
            <button onClick={() => patch({ step: d.step + 1 })} disabled={!stepOk[d.step]} className={btn.primary}>
              {t("Continue", "متابعة")}
              <ArrowRight className="flip-rtl h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
