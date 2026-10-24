import Anthropic from "@anthropic-ai/sdk";
import { claudeEnabled, runClaude } from "@/lib/assistant/claude";
import { detectLang, runRules } from "@/lib/assistant/engine";
import { validateReply } from "@/lib/assistant/tools";
import type { AssistantRequest, AssistantResult, ChatTurn } from "@/lib/assistant/types";
import { isLocale } from "@/lib/i18n";

// Simple per-IP rate limit (WP-SUP-07). Production would use Redis / the WAF.
const WINDOW_MS = 60_000;
const LIMIT = 30;
const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (limited(ip)) return Response.json({ error: "Too many requests" }, { status: 429 });

  let body: Partial<AssistantRequest>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages: ChatTurn[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    .slice(-20);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Last message must be from the user" }, { status: 400 });
  }

  const uiLang = body.lang && isLocale(body.lang) ? body.lang : "en";
  const req: AssistantRequest = {
    messages,
    lang: detectLang(messages[messages.length - 1].content, uiLang),
    channel: body.channel === "whatsapp" ? "whatsapp" : "web",
    listingId: typeof body.listingId === "string" ? body.listingId : undefined,
  };

  const t0 = Date.now();
  let result: AssistantResult;
  let note: string | undefined;
  if (claudeEnabled()) {
    try {
      result = await runClaude(req);
    } catch (e) {
      note = e instanceof Anthropic.APIError ? `claude ${e.status ?? "error"}: fell back to rules` : "claude failed: fell back to rules";
      console.error("[assistant]", note, e);
      result = runRules(req);
    }
  } else {
    result = runRules(req);
  }

  // Grounding validation applies to both engines.
  const v = validateReply(result.reply);
  const listings = [...new Set([...result.listings, ...v.listings])].filter((id) => !v.removed.includes(id));
  const waButtons =
    req.lang === "ar"
      ? ["ملف العقار", "حجز معاينة", "عقارات مشابهة", "تحدث مع موظف"]
      : ["Property pack", "Book a viewing", "Similar properties", "Talk to agent"];

  return Response.json({
    ...result,
    reply: v.reply,
    listings,
    buttons: result.buttons ?? (req.channel === "whatsapp" && listings.length ? waButtons : undefined),
    validation: { removed: v.removed },
    latencyMs: Date.now() - t0,
    note,
  });
}
