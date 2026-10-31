import { Bot, Globe, Megaphone, MessageCircle, Network } from "lucide-react";
import type { Bi } from "@/lib/i18n";
import type { LeadSource } from "@/lib/leads";

/** Display metadata for every lead source, including external portals (LED-01). */
export const sourceMeta: Record<LeadSource, { name: Bi; icon: typeof Bot; cls: string; bar: string }> = {
  web: { name: { en: "Website", ar: "الموقع" }, icon: Globe, cls: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
  whatsapp: { name: { en: "WhatsApp", ar: "واتساب" }, icon: MessageCircle, cls: "bg-wa-500/10 text-wa-700", bar: "bg-wa-500" },
  ai: { name: { en: "AI chat", ar: "المحادثة الذكية" }, icon: Bot, cls: "bg-violet-50 text-violet-700", bar: "bg-violet-500" },
  meta: { name: { en: "Meta", ar: "ميتا" }, icon: Megaphone, cls: "bg-blue-50 text-blue-700", bar: "bg-blue-600" },
  portal: { name: { en: "Portal", ar: "بوابة" }, icon: Network, cls: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
};
