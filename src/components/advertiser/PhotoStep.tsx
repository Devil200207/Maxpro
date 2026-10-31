"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Circle, GripVertical, ImagePlus, ShieldCheck, Trash2, Wand2 } from "lucide-react";
import { Badge, btn, cn, ReqTag } from "@/components/ui";
import { roomCatName, type RoomCat } from "@/lib/data";
import { uid } from "@/lib/store";
import { useLang } from "@/lib/useLang";

export interface Photo {
  id: string;
  cat: RoomCat;
  src: string;
  origKB?: number;
  newKB?: number;
  dims?: string;
  sample?: boolean;
}

export const PHOTO_CATS: RoomCat[] = ["exterior", "living", "bedroom", "bathroom", "kitchen", "other"];

export function requiredCats(beds: number): RoomCat[] {
  return ["exterior", "living", ...(beds > 0 ? (["bedroom"] as RoomCat[]) : []), "bathroom", "kitchen"];
}

const MAX = 1280;

/**
 * Client-side pipeline (FR-LST-03): resize to ≤1280px, re-encode as JPEG q0.7.
 * Re-encoding through canvas drops all EXIF metadata, including GPS location.
 */
async function processImage(file: File, watermark: boolean) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  if (watermark) drawWatermark(ctx, w, h);
  const src = canvas.toDataURL("image/jpeg", 0.7);
  return {
    src,
    origKB: Math.round(file.size / 1024),
    newKB: Math.round((src.length * 3) / 4 / 1024),
    dims: `${bmp.width}×${bmp.height} → ${w}×${h}`,
  };
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = Math.max(14, Math.round(w * 0.035));
  ctx.font = `800 ${size}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("AqarPro.qa", w - size * 0.8, h - size * 0.6);
}

const samples: Record<RoomCat, string[]> = {
  exterior: ["/img/ext-14.jpg"],
  living: ["/img/liv-9.jpg", "/img/liv-13.jpg"],
  bedroom: ["/img/bed-7.jpg", "/img/bed-5.jpg", "/img/bed-8.jpg"],
  bathroom: ["/img/bath-4.jpg", "/img/bath-2.jpg"],
  kitchen: ["/img/kit-6.jpg"],
  floorplan: [],
  other: ["/img/liv-17.jpg"],
};

export function samplePhotos(beds: number, baths: number): Photo[] {
  const out: Photo[] = [];
  const add = (cat: RoomCat, n: number) => samples[cat].slice(0, n).forEach((src) => out.push({ id: uid("ph"), cat, src, sample: true }));
  add("exterior", 1);
  add("living", 2);
  if (beds > 0) add("bedroom", Math.min(3, beds));
  add("bathroom", Math.max(1, Math.min(2, baths)));
  add("kitchen", 1);
  return out;
}

export function PhotoStep({
  photos,
  setPhotos,
  watermark,
  setWatermark,
  beds,
  baths,
}: {
  photos: Photo[];
  setPhotos: (fn: (p: Photo[]) => Photo[]) => void;
  watermark: boolean;
  setWatermark: (v: boolean) => void;
  beds: number;
  baths: number;
}) {
  const { t, p } = useLang();
  const originals = useRef(new Map<string, File>());
  const [busy, setBusy] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCat, setOverCat] = useState<RoomCat | null>(null);
  const required = requiredCats(beds);

  const addFiles = async (files: FileList | File[], cat: RoomCat) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 8);
    setBusy((b) => b + list.length);
    for (const f of list) {
      try {
        const r = await processImage(f, watermark);
        const id = uid("ph");
        originals.current.set(id, f);
        setPhotos((ps) => [...ps, { id, cat, ...r }]);
      } finally {
        setBusy((b) => b - 1);
      }
    }
  };

  const toggleWatermark = async (v: boolean) => {
    setWatermark(v);
    // Re-run the pipeline for photos we still hold the original file for.
    for (const [id, f] of originals.current) {
      const r = await processImage(f, v);
      setPhotos((ps) => ps.map((x) => (x.id === id ? { ...x, ...r } : x)));
    }
  };

  const move = (fromId: string, toId: string) =>
    setPhotos((ps) => {
      const from = ps.findIndex((x) => x.id === fromId);
      const to = ps.findIndex((x) => x.id === toId);
      if (from < 0 || to < 0 || ps[from].cat !== ps[to].cat) return ps;
      const next = [...ps];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const totalKB = photos.reduce((s, x) => s + (x.newKB ?? 0), 0);
  const origKB = photos.reduce((s, x) => s + (x.origKB ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {required.map((c) => {
            const ok = photos.some((x) => x.cat === c);
            return (
              <span key={c} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", ok ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500")}>
                {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                {p(roomCatName[c])}
              </span>
            );
          })}
          <ReqTag id="FR-LST-03" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={watermark} onChange={(e) => toggleWatermark(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            {t("Watermark photos", "علامة مائية على الصور")}
          </label>
          <button type="button" onClick={() => setPhotos(() => samplePhotos(beds, baths))} className={btn.secondary}>
            <Wand2 className="h-4 w-4" />
            {t("Use sample photos", "استخدم صوراً تجريبية")}
          </button>
        </div>
      </div>

      {(origKB > 0 || busy > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          {busy > 0 ? (
            <span>{t(`Processing ${busy} photo(s)…`, `جارٍ معالجة ${busy} صورة…`)}</span>
          ) : (
            <span>
              {t("Uploaded", "المرفوع")} {(origKB / 1024).toFixed(1)} MB → {t("optimised", "بعد التحسين")} {(totalKB / 1024).toFixed(1)} MB (
              {Math.round((1 - totalKB / Math.max(1, origKB)) * 100)}% {t("smaller", "أصغر")}) · {t("resized to ≤1280px · EXIF & GPS location stripped", "تصغير إلى ≤1280 بكسل · إزالة بيانات EXIF والموقع")}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PHOTO_CATS.map((cat) => {
          const list = photos.filter((x) => x.cat === cat);
          const isReq = required.includes(cat);
          return (
            <div
              key={cat}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCat(cat);
              }}
              onDragLeave={() => setOverCat(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOverCat(null);
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files, cat);
              }}
              className={cn("rounded-2xl border-2 border-dashed bg-white p-4 transition", overCat === cat ? "border-brand-500 bg-brand-50" : "border-stone-200")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                  {p(roomCatName[cat])}
                  {isReq && <Badge tone={list.length ? "green" : "amber"}>{t("Required", "مطلوب")}</Badge>}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                  <ImagePlus className="h-4 w-4" />
                  {t("Add", "إضافة")}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files, cat)} />
                </label>
              </div>
              {list.length === 0 ? (
                <p className="mt-6 mb-4 text-center text-xs text-stone-400">{t("Drag photos here or click Add", "اسحب الصور هنا أو اضغط إضافة")}</p>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {list.map((ph, i) => (
                    <div
                      key={ph.id}
                      draggable
                      onDragStart={(e) => {
                        setDragId(ph.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragId(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        if (dragId) {
                          e.preventDefault();
                          e.stopPropagation();
                          move(dragId, ph.id);
                          setDragId(null);
                        }
                      }}
                      className={cn("group relative aspect-[4/3] cursor-grab overflow-hidden rounded-lg bg-stone-100", dragId === ph.id && "opacity-40")}
                      title={ph.dims}
                    >
                      <Image src={ph.src} alt="" fill sizes="120px" className="object-cover" />
                      <span className="absolute start-1 top-1 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">{i + 1}</span>
                      <GripVertical className="absolute bottom-1 start-1 h-4 w-4 text-white drop-shadow" />
                      {ph.newKB !== undefined && (
                        <span className="absolute bottom-1 end-1 rounded bg-black/60 px-1 text-[9px] text-white">
                          {ph.origKB}→{ph.newKB}KB
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          originals.current.delete(ph.id);
                          setPhotos((ps) => ps.filter((x) => x.id !== ph.id));
                        }}
                        className="absolute end-1 top-1 hidden rounded bg-white/90 p-1 text-red-600 group-hover:block"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-stone-500">
        {t("Drag thumbnails to reorder within a room. The first exterior photo becomes the cover. Floor plan, video and 360° tour links are added in Stage 2.", "اسحب الصور لإعادة ترتيبها داخل الغرفة. أول صورة للواجهة تصبح صورة الغلاف. المخطط والفيديو وجولة 360° تضاف في المرحلة الثانية.")}
      </p>
    </div>
  );
}
