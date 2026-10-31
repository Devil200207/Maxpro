"use client";

import { Info, Sparkles } from "lucide-react";
import type { Listing } from "@/lib/data";
import { portalTitle } from "@/lib/hub/engine";
import { portals } from "@/lib/portals";
import type { StudioCopy } from "@/lib/studio/content";
import { useLang } from "@/lib/useLang";
import { btn, cn, input, ReqTag } from "@/components/ui";

export function ContentStep({
  copy,
  onChange,
  onGenerate,
  cost,
  preview,
}: {
  copy?: StudioCopy;
  onChange: (c: StudioCopy) => void;
  onGenerate: () => void;
  cost: number;
  preview?: Listing;
}) {
  const { t, p } = useLang();
  const field = (k: keyof StudioCopy, rtl: boolean, area = false) => {
    const props = {
      className: cn(input, area && "min-h-28"),
      dir: rtl ? "rtl" : "ltr",
      value: copy?.[k] ?? "",
      onChange: (e: { target: { value: string } }) => copy && onChange({ ...copy, [k]: e.target.value }),
    } as const;
    return area ? <textarea {...props} /> : <input {...props} />;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex max-w-2xl items-start gap-2 text-sm text-stone-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          {t(
            "Copy is written only from the facts you confirmed — never from guesses — and stays fully editable. Nothing is published until you approve it.",
            "يُكتب النص فقط من المعلومات التي أكدتها — دون تخمين — ويبقى قابلاً للتعديل بالكامل. لا يُنشر شيء قبل موافقتك.",
          )}
        </p>
        <div className="flex items-center gap-2">
          <ReqTag id="AIS-02" />
          <ReqTag id="AIS-04" />
          <button onClick={onGenerate} className={btn.primary}>
            <Sparkles className="h-4 w-4" />
            {copy ? t("Regenerate", "إعادة الكتابة") : t("Write AR + EN with AI", "اكتب بالعربية والإنجليزية")} · {cost} {t("credits", "رصيد")}
          </button>
        </div>
      </div>

      {copy && (
        <>
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-stone-900">English</h4>
              <label className="block text-xs font-medium text-stone-500">
                {t("Title", "العنوان")} ({copy.titleEn.length})
                {field("titleEn", false)}
              </label>
              <label className="block text-xs font-medium text-stone-500">
                {t("Short description", "وصف قصير")}
                {field("shortEn", false)}
              </label>
              <label className="block text-xs font-medium text-stone-500">
                {t("Long description", "وصف مفصل")}
                {field("longEn", false, true)}
              </label>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-stone-900">العربية</h4>
              <label className="block text-xs font-medium text-stone-500">
                {t("Title", "العنوان")} ({copy.titleAr.length})
                {field("titleAr", true)}
              </label>
              <label className="block text-xs font-medium text-stone-500">
                {t("Short description", "وصف قصير")}
                {field("shortAr", true)}
              </label>
              <label className="block text-xs font-medium text-stone-500">
                {t("Long description", "وصف مفصل")}
                {field("longAr", true, true)}
              </label>
            </div>
          </div>

          {preview && (
            <div className="mt-6">
              <h4 className="text-sm font-bold text-stone-900">{t("Portal-specific versions", "نسخ مخصصة لكل بوابة")}</h4>
              <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                {portals.map((pt) => {
                  const pt2 = portalTitle(preview, pt);
                  return (
                    <div key={pt.id} className="rounded-xl border border-stone-200 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold" style={{ color: pt.color }}>
                          {p(pt.name)}
                        </span>
                        <span className={cn("font-mono", pt2.title.length > pt.limits.titleMax ? "text-red-600" : "text-stone-500")}>
                          {pt2.title.length}/{pt.limits.titleMax}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-medium text-stone-900">{pt2.title}</div>
                      {pt2.transformed && <div className="mt-1 text-[11px] text-sky-700">{t("Shortened automatically for this portal", "تم تقصيره تلقائياً لهذه البوابة")}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
