import { zones } from "../data";
import type { Locale } from "../i18n";
import { kbSearch } from "../kb";
import { normalize } from "../search";
import { getListingTool, runTool, type SearchCriteria, type SearchHit, type ToolContext } from "./tools";
import type { AssistantRequest, AssistantResult } from "./types";

/**
 * Deterministic fallback for the AI assistant, used when no LLM key is
 * configured or the LLM call fails. Same tools, same grounding rules.
 */

const AR = /[؀-ۿ]/;
export const detectLang = (s: string, fallback: Locale): Locale => (AR.test(s) ? "ar" : /[a-z]{3,}/i.test(s) ? "en" : fallback);

const toWestern = (s: string) => s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/٬/g, ",");

const zoneAliases: Record<string, string[]> = {
  pearl: ["pearl", "porto arabia", "viva bahriya", "qanat quartier", "medina centrale", "اللولوه", "لولوه", "بورتو"],
  lusail: ["lusail", "fox hills", "foxhills", "marina", "waterfront", "لوسيل", "فوكس"],
  westbay: ["west bay", "westbay", "dafna", "الخليج الغربي", "الدفنه"],
  alsadd: ["al sadd", "sadd", "السد"],
  msheireb: ["msheireb", "mushaireb", "downtown", "مشيرب"],
  alwaab: ["al waab", "waab", "الوعب", "وعب"],
  alwakrah: ["wakrah", "wakra", "الوكره", "وكره"],
  algharrafa: ["gharrafa", "الغرافه", "غرافه"],
  binmahmoud: ["bin mahmoud", "بن محمود"],
  oldairport: ["old airport", "المطار القديم"],
  alduhail: ["duhail", "الدحيل", "دحيل"],
  ainkhaled: ["ain khaled", "ain khalid", "عين خالد"],
};

const arNumWords: Record<string, number> = { واحد: 1, واحده: 1, ثلاث: 3, ثلاثه: 3, اربع: 4, اربعه: 4, خمس: 5, خمسه: 5, ست: 6, سته: 6 };

export function parseCriteria(raw: string): SearchCriteria & { moveIn?: boolean } {
  const s = toWestern(raw);
  const n = normalize(s);
  const c: SearchCriteria & { moveIn?: boolean } = {};

  if (/\b(rent|rental|renting|lease|to let)\b/i.test(s) || /ايجار|استئجار|للايجار|اجار/.test(n)) c.purpose = "rent";
  if (/\b(buy|buying|purchase|for sale|sale|own|freehold|invest)\b/i.test(s) || /شراء|للبيع|تملك|اشتري|استثمار/.test(n)) c.purpose = "sale";

  if (/\bstudio\b/i.test(s) || /استوديو|ستوديو/.test(n)) {
    c.type = "studio";
    c.min_beds = 0;
  } else if (/\b(villa|villas)\b/i.test(s) || /فيلا|فله|فلل/.test(n)) c.type = "villa";
  else if (/\btown ?house/i.test(s) || /تاون/.test(n)) c.type = "townhouse";
  else if (/\bpenthouse/i.test(s) || /بنتهاوس/.test(n)) c.type = "penthouse";
  else if (/\boffice/i.test(s) || /مكتب/.test(n)) c.type = "office";
  else if (/\b(apartment|apartments|flat|flats)\b/i.test(s) || /شقه|شقق/.test(n)) c.type = "apartment";

  const bedEn = s.match(/(\d+)\s*-?\s*(?:bed(?:room)?s?|br|bhk|b\/r)\b/i);
  if (bedEn) c.min_beds = Number(bedEn[1]);
  else if (/غرفتين|غرفتان/.test(n)) c.min_beds = 2;
  else if (/غرفه (نوم )?واحده/.test(n) || /(^|\s)غرفه نوم/.test(n)) c.min_beds = 1;
  const bedAr = n.match(/(\d+)\s*غرف/);
  if (bedAr) c.min_beds = Number(bedAr[1]);
  const bedArWord = n.match(/(واحد|واحده|ثلاث|ثلاثه|اربع|اربعه|خمس|خمسه|ست|سته)\s*غرف/);
  if (bedArWord) c.min_beds = arNumWords[bedArWord[1]];

  // Budget: numbers with optional k / thousand / million suffixes, ignoring bed counts and listing ids.
  const cleaned = s.replace(/MP-\d{5}/gi, " ").replace(/(\d+)\s*-?\s*(?:bed(?:room)?s?|br|bhk|غرف)/gi, " ");
  const re = /(\d+(?:[.,]\d+)*)\s*(k|thousand|الف|ألف|آلاف|الاف|m\b|mn|million|مليون|ملايين)?/gi;
  let best = 0;
  for (const m of cleaned.matchAll(re)) {
    let v = Number(m[1].replace(/,/g, ""));
    const suf = (m[2] ?? "").toLowerCase();
    if (/k|thousand|الف|ألف|آلاف|الاف/.test(suf)) v *= 1000;
    if (/^m|million|مليون|ملايين/.test(suf)) v *= 1_000_000;
    if (v >= 1000) best = Math.max(best, v);
  }
  if (!best && /مليون/.test(n)) best = 1_000_000;
  if (best) {
    c.max_price = best;
    if (!c.purpose) c.purpose = best >= 300_000 ? "sale" : best <= 100_000 ? "rent" : undefined;
  }

  for (const z of zones) {
    const names = [normalize(z.name.en), normalize(z.name.ar), ...(zoneAliases[z.id] ?? [])];
    if (names.some((a) => a && n.includes(normalize(a)))) {
      c.zone = z.id;
      break;
    }
  }

  if (/\bunfurnished\b/i.test(s) || /غير مفروش/.test(n)) c.furnishing = "unfurnished";
  else if (/semi/i.test(s) || /شبه مفروش/.test(n)) c.furnishing = "semi";
  else if (/\bfurnished\b/i.test(s) || /مفروش/.test(n)) c.furnishing = "furnished";

  const am: string[] = [];
  if (/\bpool\b/i.test(s) || /مسبح/.test(n)) am.push("pool");
  if (/\bgym\b/i.test(s) || /نادي|جيم/.test(n)) am.push("gym");
  if (/\b(beach|sea)\b/i.test(s) || /شاطي|بحر/.test(n)) am.push("beach");
  if (/\bmetro\b/i.test(s) || /مترو/.test(n)) am.push("metro");
  if (am.length) c.amenities = am;

  if (/\b(family|kids|children)\b/i.test(s) || /عائل|اطفال|عيال/.test(n)) c.family = true;
  if (/move in|moving|from (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|next month|asap/i.test(s) || /انتقال|الشهر القادم|من شهر/.test(n)) c.moveIn = true;
  return c;
}

const hasSearchSignal = (c: SearchCriteria) => !!(c.purpose || c.type || c.zone || c.max_price || c.min_beds !== undefined);

const HUMAN = /\b(agent|human|person|someone|call me|representative|staff)\b|موظف|شخص|انسان|مندوب|وكيل|كلمني|اتصل/i;
const SENSITIVE = /\b(lawyer|legal|lawsuit|court|contract dispute|mortgage|loan|financ|visa|residency|permit to stay|eviction|deposit dispute)\b|محامي|قانون|محكمه|رهن|قرض|تمويل|تاشيره|اقامه|اخلاء/i;
const GREET = /^\s*(hi|hello|hey|salam|good (morning|evening))\b|^\s*(السلام|مرحبا|اهلا|هلا)/i;

const T = (lang: Locale, en: string, ar: string) => (lang === "ar" ? ar : en);

function waButtons(lang: Locale) {
  return [T(lang, "Property pack", "ملف العقار"), T(lang, "Book a viewing", "حجز معاينة"), T(lang, "Similar properties", "عقارات مشابهة"), T(lang, "Talk to agent", "تحدث مع موظف")];
}

function shortlist(hits: SearchHit[]) {
  return hits.map((h, i) => `${i + 1}. ${h.id} — ${h.title}\n   ${h.price} · ${h.reason}`).join("\n");
}

export function runRules(req: AssistantRequest): AssistantResult {
  const users = req.messages.filter((m) => m.role === "user");
  const last = users[users.length - 1]?.content ?? "";
  const lang = detectLang(last, req.lang);
  const ctx: ToolContext = { lang, log: [], kb: [] };
  const nl = normalize(toWestern(last));
  const base = { engine: "rules" as const, toolCalls: ctx.log, validation: { removed: [] as string[] } };

  // 1. Explicit handover.
  if (HUMAN.test(last) || HUMAN.test(nl)) {
    runTool("handover_to_human", { reason: "User asked to speak to a person" }, ctx);
    return {
      ...base,
      reply: T(lang, "Of course — I'm connecting you with a MaxPro agent now. They'll see this whole conversation, so you won't need to repeat yourself.", "بالتأكيد — سأحولك الآن إلى أحد موظفي ماكس برو. سيطّلع على المحادثة كاملة فلن تحتاج إلى التكرار."),
      listings: [],
      handover: ctx.handover,
    };
  }

  // 2. Sensitive topics: disclaimer + human.
  if (SENSITIVE.test(last) || SENSITIVE.test(nl)) {
    runTool("handover_to_human", { reason: "Sensitive topic (legal / financial / visa)" }, ctx);
    return {
      ...base,
      reply: T(
        lang,
        "I can't give legal, financing or visa advice — please check with a licensed professional. I've asked a MaxPro agent to join and point you to the right people.",
        "لا أستطيع تقديم استشارات قانونية أو تمويلية أو تتعلق بالتأشيرات — يُرجى مراجعة مختص مرخّص. طلبت من أحد موظفي ماكس برو الانضمام لمساعدتك.",
      ),
      listings: [],
      handover: ctx.handover,
    };
  }

  // 3. A specific listing id (e.g. "Hi, I'm interested in MP-10231").
  const idMatch = last.toUpperCase().match(/MP-\d{5}/);
  if (idMatch) {
    const facts = runTool("get_listing", { id: idMatch[0] }, ctx) as ReturnType<typeof getListingTool>;
    if ("error" in facts) {
      return { ...base, reply: T(lang, `I couldn't find a live listing ${idMatch[0]} — it may have been rented or expired. Want me to suggest similar properties?`, `لم أجد إعلاناً منشوراً برقم ${idMatch[0]} — ربما تم تأجيره أو انتهت صلاحيته. هل تريد عقارات مشابهة؟`), listings: [] };
    }
    return {
      ...base,
      reply: T(
        lang,
        `${facts.id} — ${facts.title}\n${facts.price} · ${facts.beds === 0 ? "Studio" : `${facts.beds} bed`} · ${facts.baths} bath · ${facts.area_sqm} sqm · ${facts.zone}\nListed by ${facts.advertiser.name}${facts.advertiser.verified ? " (verified)" : ""}. Would you like the full property pack or to book a viewing?`,
        `${facts.id} — ${facts.title}\n${facts.price} · ${facts.beds === 0 ? "استوديو" : `${facts.beds} غرف`} · ${facts.baths} حمامات · ${facts.area_sqm} م² · ${facts.zone}\nالمعلن: ${facts.advertiser.name}${facts.advertiser.verified ? " (موثق)" : ""}. هل تريد ملف العقار الكامل أو حجز معاينة؟`,
      ),
      listings: [facts.id],
      buttons: req.channel === "whatsapp" ? waButtons(lang) : undefined,
    };
  }

  // 4. Property search across the whole conversation (later messages refine earlier ones).
  const merged: SearchCriteria & { moveIn?: boolean } = {};
  for (const u of users) Object.assign(merged, parseCriteria(u.content));
  const lastCrit = parseCriteria(last);
  const kbHits = kbSearch(last);

  // 5. Platform question (and not a property search).
  if (kbHits.length && !hasSearchSignal(lastCrit)) {
    runTool("platform_info", { question: last }, ctx);
    const a = kbHits[0];
    return {
      ...base,
      reply: `${a.body[lang]}\n\n${T(lang, "Source", "المصدر")}: ${a.title[lang]}`,
      listings: [],
      kb: ctx.kb,
    };
  }

  if (hasSearchSignal(merged)) {
    let res = runTool("search_listings", merged, ctx) as { total: number; results: SearchHit[] };
    let relaxed = "";
    // Relax step by step (budget +25%, then furnishing/amenities, then area) until something matches.
    const steps: { when: boolean; apply: (c: SearchCriteria) => SearchCriteria; note: [string, string] }[] = [
      { when: !!merged.max_price, apply: (c) => ({ ...c, max_price: Math.round((merged.max_price ?? 0) * 1.25) }), note: ["I widened the budget by 25%", "وسّعت الميزانية بنسبة 25٪"] },
      { when: !!(merged.furnishing || merged.amenities), apply: (c) => ({ ...c, furnishing: undefined, amenities: undefined }), note: ["relaxed furnishing and amenities", "تجاهلت شرط الأثاث والمرافق"] },
      { when: !!merged.zone, apply: (c) => ({ ...c, zone: undefined }), note: ["looked beyond that area", "بحثت خارج تلك المنطقة"] },
    ];
    let crit: SearchCriteria = merged;
    const notes: string[] = [];
    for (const step of steps) {
      if (res.results.length || !step.when) continue;
      crit = step.apply(crit);
      notes.push(T(lang, step.note[0], step.note[1]));
      res = runTool("search_listings", crit, ctx) as typeof res;
    }
    if (res.results.length && notes.length)
      relaxed = T(lang, `No exact match, so I ${notes.join(", ")}.`, `لا يوجد تطابق تام، لذلك ${notes.join("، ")}.`);
    if (!res.results.length) {
      return {
        ...base,
        reply: T(lang, "I couldn't find a live listing that matches yet. Could you widen the budget or area? I can also set up a WhatsApp alert for new matches.", "لم أجد إعلاناً مطابقاً حالياً. هل يمكنك توسيع الميزانية أو المنطقة؟ يمكنني أيضاً تفعيل تنبيه واتساب عند توفر عقار مطابق."),
        listings: [],
      };
    }
    const followUps: string[] = [];
    if (!merged.purpose) followUps.push(T(lang, "Are you looking to rent or buy?", "هل تبحث عن إيجار أم شراء؟"));
    else if (!merged.max_price) followUps.push(merged.purpose === "rent" ? T(lang, "What's your monthly budget?", "ما ميزانيتك الشهرية؟") : T(lang, "What's your budget?", "ما ميزانيتك؟"));
    else if (!merged.zone) followUps.push(T(lang, "Any preferred area — The Pearl, Lusail, West Bay…?", "هل لديك منطقة مفضلة — اللؤلؤة، لوسيل، الخليج الغربي…؟"));
    else if (!merged.moveIn && merged.purpose === "rent") followUps.push(T(lang, "When would you like to move in?", "متى تودّ الانتقال؟"));

    const intro = T(lang, `I found ${res.total} live listing${res.total === 1 ? "" : "s"}. Top matches:`, `وجدت ${res.total} إعلاناً منشوراً. أفضل الخيارات:`);
    return {
      ...base,
      reply: [relaxed, intro, shortlist(res.results), followUps[0]].filter(Boolean).join("\n\n"),
      listings: res.results.map((r) => r.id),
      buttons: req.channel === "whatsapp" ? waButtons(lang) : undefined,
    };
  }

  // 6. Greeting / unknown → guided discovery.
  const greet = GREET.test(last);
  return {
    ...base,
    reply: T(
      lang,
      `${greet ? "Hello! " : ""}I'm the MaxPro assistant. Tell me what you're looking for — for example "2-bed apartment in The Pearl under 13k" — or ask me about plans and listing on MaxPro.`,
      `${greet ? "أهلاً بك! " : ""}أنا مساعد ماكس برو. أخبرني بما تبحث عنه — مثلاً "شقة غرفتين في اللؤلؤة بأقل من 13 ألف" — أو اسألني عن الباقات والنشر على ماكس برو.`,
    ),
    listings: [],
    buttons: req.channel === "whatsapp" ? [T(lang, "Rent", "إيجار"), T(lang, "Buy", "شراء"), T(lang, "Talk to agent", "تحدث مع موظف")] : undefined,
  };
}

