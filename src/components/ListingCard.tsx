"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Bath, BedDouble, Heart, MapPin, MessageCircle, Ruler, Sparkles } from "lucide-react";
import { advertiserById, typeName, zoneById, type Listing } from "@/lib/data";
import { compactQar, priceLabel } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { Badge, cn } from "./ui";

export function ListingCard({ l, compact = false, onHover }: { l: Listing; compact?: boolean; onHover?: (id: string | null) => void }) {
  const { lang, t, p, href } = useLang();
  const { state, toggleFavourite } = useStore();
  const fav = state.favourites.includes(l.id);
  const adv = advertiserById(l.advertiserId);
  const cover = l.media.find((m) => m.cat === "exterior") ?? l.media[0];

  return (
    <article
      onMouseEnter={() => onHover?.(l.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md",
        l.promotion === "premium" ? "border-amber-300 ring-1 ring-amber-200" : "border-stone-200",
      )}
    >
      <Link href={href(`/listing/${l.id}`)} className="relative block aspect-[4/3] overflow-hidden bg-stone-100">
        <Image src={cover.src} alt={p(l.title)} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
          {l.promotion === "premium" && (
            <Badge tone="premium">
              <Sparkles className="h-3 w-3" />
              {t("Premium", "بريميوم")}
            </Badge>
          )}
          {l.promotion === "featured" && <Badge tone="solid">{t("Featured", "مميز")}</Badge>}
          <Badge tone="white">{l.purpose === "rent" ? t("For rent", "للإيجار") : t("For sale", "للبيع")}</Badge>
        </div>
        <span className="absolute bottom-3 end-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          {l.media.filter((m) => m.cat !== "floorplan").length} {t("photos", "صور")}
        </span>
      </Link>

      <button
        onClick={() => toggleFavourite(l.id)}
        aria-label={t("Save", "حفظ")}
        className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow hover:bg-white"
      >
        <Heart className={cn("h-4 w-4", fav ? "fill-brand-600 text-brand-600" : "text-stone-700")} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="text-lg font-bold text-stone-900">
          {l.purpose === "sale" ? compactQar(l.price, lang) : priceLabel(l.price, l.purpose, lang)}
        </div>
        <Link href={href(`/listing/${l.id}`)} className="mt-1 line-clamp-2 text-sm font-medium text-stone-800 hover:text-brand-700">
          {p(l.title)}
        </Link>
        <div className="mt-2 flex items-center gap-1 text-xs text-stone-500">
          <MapPin className="h-3.5 w-3.5" />
          {p(zoneById(l.zoneId).name)} · {p(typeName(l.type))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs font-medium text-stone-600">
          <span className="flex items-center gap-1">
            <BedDouble className="h-4 w-4" />
            {l.beds === 0 ? t("Studio", "استوديو") : l.beds}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            {l.baths}
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="h-4 w-4" />
            {l.area} {t("sqm", "م²")}
          </span>
        </div>
        {!compact && (
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-stone-100 pt-3 mt-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: adv.color }}>
                {adv.initials}
              </span>
              <span className="truncate text-xs text-stone-600">{p(adv.name)}</span>
              {adv.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600" aria-label={t("Verified", "موثق")} />}
            </div>
            <Link
              href={href(`/whatsapp?listing=${l.id}`)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-wa-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-wa-600"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
