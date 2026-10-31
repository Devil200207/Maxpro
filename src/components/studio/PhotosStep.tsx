"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, CheckCircle2, Circle, ImagePlus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { roomCatName, type RoomCat } from "@/lib/data";
import { AI_COST, useAiCredits } from "@/lib/studio/credits";
import { guessRoom, processUpload, requiredPhotoCats, samplePhotoSet, type StudioPhoto } from "@/lib/studio/draft";
import { uid } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { Badge, btn, cn, ReqTag } from "@/components/ui";
import { toast } from "@/components/Toaster";

const CATS: RoomCat[] = ["exterior", "living", "bedroom", "bathroom", "kitchen", "floorplan", "other"];

export function PhotosStep({
  photos,
  onChange,
  type,
  beds,
}: {
  photos: StudioPhoto[];
  onChange: (p: StudioPhoto[]) => void;
  type?: string;
  beds?: number;
}) {
  const { t, p } = useLang();
  const credits = useAiCredits();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const required = requiredPhotoCats(beds);
  const covered = (c: RoomCat) => photos.some((x) => x.cat === c);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const n = files.length;
    if (!credits.charge("studio_check", n * AI_COST.photoTag, `AI room tagging · ${n} photo(s)`)) {
      toast(t("Not enough AI credits for room tagging", "أرصدة الذكاء الاصطناعي غير كافية لتصنيف الغرف"));
      return;
    }
    setBusy(true);
    const next = [...photos];
    for (const f of Array.from(files).slice(0, 15)) {
      try {
        const { src, kb } = await processUpload(f);
        next.push({ id: uid("PH"), src, kb, cat: guessRoom(next.map((x) => x.cat), beds), tagged: "ai", enhanced: false });
      } catch {
        toast(t(`Could not read ${f.name}`, `تعذرت قراءة ${f.name}`));
      }
    }
    onChange(next);
    setBusy(false);
  };

  const useSamples = () => {
    const set = samplePhotoSet(type, beds);
    if (!credits.charge("studio_check", set.length * AI_COST.photoTag, `AI room tagging · ${set.length} sample photo(s)`)) {
      toast(t("Not enough AI credits for room tagging", "أرصدة الذكاء الاصطناعي غير كافية لتصنيف الغرف"));
      return;
    }
    onChange([...photos.filter((x) => !x.sample), ...set.map((x) => ({ ...x, id: uid("PH") }))]);
  };

  const patch = (id: string, x: Partial<StudioPhoto>) => onChange(photos.map((ph) => (ph.id === id ? { ...ph, ...x } : ph)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {required.map((c) => (
            <span key={c} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", covered(c) ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500")}>
              {covered(c) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {p(roomCatName[c])}
            </span>
          ))}
          <ReqTag id="FR-LST-03" />
          <ReqTag id="AIS-07" />
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className={btn.secondary}>
            <ImagePlus className="h-4 w-4" />
            {busy ? t("Processing…", "جارٍ المعالجة…") : t("Upload photos", "رفع صور")}
          </button>
          <button onClick={useSamples} className={btn.secondary}>
            <Wand2 className="h-4 w-4" />
            {t("Use sample photos", "استخدام صور تجريبية")}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {t(
          `AI suggests the room for each photo (${AI_COST.photoTag} credit each — simulated tagging in this prototype). Uploads are resized to 1280 px and re-encoded, which strips EXIF and GPS data.`,
          `يقترح الذكاء الاصطناعي الغرفة لكل صورة (${AI_COST.photoTag} رصيد لكل صورة — تصنيف محاكى في هذا النموذج). يتم تصغير الصور وإعادة ترميزها مما يزيل بيانات EXIF والموقع.`,
        )}
      </p>

      {photos.length === 0 ? (
        <div className="mt-4 grid place-items-center rounded-xl border-2 border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          {t("No photos yet — upload or use the sample set.", "لا توجد صور بعد — ارفع صوراً أو استخدم المجموعة التجريبية.")}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((ph, i) => (
            <div key={ph.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <div className="relative aspect-[4/3] bg-stone-100">
                <Image src={ph.src} alt="" fill sizes="25vw" className="object-cover" unoptimized={ph.src.startsWith("data:")} />
                {i === 0 && <span className="absolute start-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{t("Cover", "الغلاف")}</span>}
                {ph.enhanced && <span className="absolute bottom-2 start-2 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">{t("Virtually enhanced", "محسّنة رقمياً")}</span>}
              </div>
              <div className="space-y-2 p-2.5">
                <div className="flex items-center gap-1.5">
                  <select value={ph.cat} onChange={(e) => patch(ph.id, { cat: e.target.value as RoomCat, tagged: "user" })} className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-xs">
                    {CATS.map((c) => (
                      <option key={c} value={c}>
                        {p(roomCatName[c])}
                      </option>
                    ))}
                  </select>
                  {ph.tagged === "ai" ? (
                    <Badge tone="violet" className="shrink-0">
                      <Sparkles className="h-3 w-3" />
                      AI
                    </Badge>
                  ) : (
                    <Badge tone="green" className="shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-stone-600">
                  <input type="checkbox" checked={ph.enhanced} onChange={(e) => patch(ph.id, { enhanced: e.target.checked })} />
                  {t("Enhanced / virtually staged", "محسّنة / تأثيث افتراضي")}
                </label>
                <div className="flex items-center justify-between text-stone-500">
                  <div className="flex gap-0.5">
                    <button onClick={() => move(i, -1)} className="rounded p-1 hover:bg-stone-100" aria-label="up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => move(i, 1)} className="rounded p-1 hover:bg-stone-100" aria-label="down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {ph.kb && <span className="text-[10px]">{ph.kb} KB</span>}
                  <button onClick={() => onChange(photos.filter((x) => x.id !== ph.id))} className="rounded p-1 text-red-500 hover:bg-red-50" aria-label="remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
