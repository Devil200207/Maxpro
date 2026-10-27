"use client";

/**
 * Leaflet maps (FR-WEB-04). This module touches `window` on import, so always
 * load it through next/dynamic with { ssr: false }:
 *   const ResultsMap = dynamic(() => import("@/components/MapView").then((m) => m.ResultsMap), { ssr: false });
 * Tiles are OpenStreetMap for the prototype; production would use the maps
 * provider chosen under INT-05.
 */
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { pois, zoneById, type Listing, type Poi } from "@/lib/data";
import { compactQar } from "@/lib/format";
import { useLang } from "@/lib/useLang";

const TILE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const DOHA: [number, number] = [25.3, 51.51];

function shortPrice(l: Listing) {
  if (l.price >= 1_000_000) return `${(l.price / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (l.price >= 1000) return `${(l.price / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(l.price);
}

function pillIcon(text: string, active: boolean, premium: boolean) {
  // Brand blue; premium in logo navy; hovered card's pin inverts to white.
  const bg = active ? "#ffffff" : premium ? "#042048" : "#0068e6";
  const fg = active ? "#0068e6" : "#ffffff";
  const ring = active ? "#0068e6" : "#ffffff";
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div style="width:max-content;transform:translate(-50%,-100%);background:${bg};color:${fg};font:600 12px/1 system-ui,sans-serif;padding:6px 9px;border-radius:999px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid ${ring};${active ? "z-index:1000;scale:1.15;" : ""}">QAR ${text}</div>`,
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export function ResultsMap({ listings, hoverId, className = "h-full w-full" }: { listings: Listing[]; hoverId?: string | null; className?: string }) {
  const { lang, p, t, href } = useLang();
  const points = useMemo(() => listings.map((l) => [l.lat, l.lng] as [number, number]), [listings]);

  return (
    <MapContainer center={DOHA} zoom={11} scrollWheelZoom className={className} style={{ zIndex: 0 }}>
      <TileLayer url={TILE} attribution={ATTR} />
      <FitBounds points={points} />
      {listings.map((l) => (
        <Marker
          key={l.id}
          position={[l.lat, l.lng]}
          icon={pillIcon(shortPrice(l), hoverId === l.id, l.promotion === "premium")}
          zIndexOffset={hoverId === l.id ? 1000 : 0}
        >
          <Popup minWidth={220} maxWidth={240}>
            <Link href={href(`/listing/${l.id}`)} className="block w-[220px] text-stone-900 no-underline">
              <div className="relative mb-2 aspect-[16/10] w-full overflow-hidden rounded-lg bg-stone-100">
                <Image src={(l.media.find((m) => m.cat === "exterior") ?? l.media[0]).src} alt="" fill sizes="220px" className="object-cover" />
              </div>
              <div className="text-sm font-bold">{compactQar(l.price, lang)}</div>
              <div className="line-clamp-2 text-xs text-stone-700">{p(l.title)}</div>
              <div className="mt-1 text-[11px] text-stone-500">
                {p(zoneById(l.zoneId).name)} · {l.beds === 0 ? t("Studio", "استوديو") : `${l.beds} ${t("beds", "غرف")}`} · {l.area} {t("sqm", "م²")}
              </div>
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

const poiEmoji: Record<Poi["kind"], string> = { mall: "🛍️", metro: "🚇", hospital: "🏥", school: "🎓", beach: "🏖️" };

function poiIcon(kind: Poi["kind"]) {
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div style="transform:translate(-50%,-50%);width:28px;height:28px;border-radius:999px;background:#fff;display:grid;place-items:center;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,.3)">${poiEmoji[kind]}</div>`,
  });
}

const homeIcon = L.divIcon({
  className: "",
  iconSize: [0, 0],
  html: `<div style="transform:translate(-50%,-100%)"><svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 0C7.6 0 0 7.6 0 17c0 12.8 17 27 17 27s17-14.2 17-27C34 7.6 26.4 0 17 0z" fill="#0068e6"/><circle cx="17" cy="17" r="7" fill="#fff"/></svg></div>`,
});

/** Single listing pin with nearby points of interest (listing detail page). */
export function ListingMap({ listing, nearby = pois, className = "h-72 w-full" }: { listing: Listing; nearby?: Poi[]; className?: string }) {
  const { p } = useLang();
  const points = useMemo(() => [[listing.lat, listing.lng] as [number, number], ...nearby.map((x) => [x.lat, x.lng] as [number, number])], [listing, nearby]);
  return (
    <MapContainer center={[listing.lat, listing.lng]} zoom={13} scrollWheelZoom={false} className={className} style={{ zIndex: 0 }}>
      <TileLayer url={TILE} attribution={ATTR} />
      <FitBounds points={points} />
      <Marker position={[listing.lat, listing.lng]} icon={homeIcon} zIndexOffset={1000}>
        <Popup>{p(listing.title)}</Popup>
      </Marker>
      {nearby.map((x) => (
        <Marker key={x.name.en} position={[x.lat, x.lng]} icon={poiIcon(x.kind)}>
          <Popup>{p(x.name)}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
