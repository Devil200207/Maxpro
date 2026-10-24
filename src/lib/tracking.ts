"use client";

/**
 * Meta Pixel + Conversions API stand-in (FR-ADV-02). Each call represents a
 * browser Pixel event and a server CAPI event sharing one event_id for
 * deduplication. In the prototype we only surface them on screen.
 */
export type PixelEvent = "PageView" | "ViewContent" | "Search" | "Lead" | "Contact" | "Subscribe" | "Purchase";

export interface TrackedEvent {
  name: PixelEvent;
  eventId: string;
  data?: Record<string, unknown>;
  at: number;
}

export function track(name: PixelEvent, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const ev: TrackedEvent = { name, data, eventId: `evt_${Math.random().toString(36).slice(2, 10)}`, at: Date.now() };
  window.dispatchEvent(new CustomEvent("maxpro:track", { detail: ev }));
}
