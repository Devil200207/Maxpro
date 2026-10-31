import type { Bi } from "./i18n";

/** Managed knowledge base for platform-support answers (WP-SUP-04). */
export interface KbArticle {
  id: string;
  title: Bi;
  body: Bi;
  url: string; // path under /[lang]
  keywords: string[];
}

export const kb: KbArticle[] = [
  {
    id: "kb-plans",
    title: { en: "Advertiser plans and prices", ar: "باقات المعلنين والأسعار" },
    body: {
      en: "Starter is free for up to 2 live listings. Professional is QAR 499/month for 25 listings and 5 featured credits. Agency is QAR 1,999/month for 150 listings, 10 team seats, bulk upload and a branded page. Enterprise is quoted and includes API and ERP feeds. Annual billing gives 2 months free.",
      ar: "باقة المبتدئ مجانية حتى إعلانين. الاحترافي 499 ر.ق شهرياً لـ 25 إعلاناً و5 أرصدة تمييز. الوكالة 1,999 ر.ق شهرياً لـ 150 إعلاناً و10 مستخدمين ورفع جماعي وصفحة خاصة. المؤسسات بعرض سعر وتشمل ربط API و ERP. الدفع السنوي يمنح شهرين مجاناً.",
    },
    url: "/pricing",
    keywords: ["price", "pricing", "plan", "subscription", "cost", "fee", "باقة", "سعر", "اشتراك", "تكلفة", "رسوم", "الباقات"],
  },
  {
    id: "kb-howto",
    title: { en: "How to post a listing", ar: "كيفية نشر إعلان" },
    body: {
      en: "Create an account, verify with your Qatar ID or commercial registration, choose a plan, then use 'Post a listing'. Upload photos by room (living, bedrooms, bathrooms, kitchen, exterior), add the advertising permit number, and submit. Moderators review within 2 working hours.",
      ar: "أنشئ حساباً ووثّقه بالبطاقة الشخصية أو السجل التجاري، اختر باقة، ثم اضغط 'أضف إعلان'. ارفع الصور حسب الغرف وأضف رقم ترخيص الإعلان ثم أرسل. تتم المراجعة خلال ساعتي عمل.",
    },
    url: "/advertiser/new",
    keywords: ["post", "list", "listing", "advertise", "how", "add", "نشر", "إعلان", "اعلان", "أضيف", "كيف"],
  },
  {
    id: "kb-verify",
    title: { en: "Advertiser verification", ar: "توثيق المعلن" },
    body: {
      en: "Individuals upload a Qatar ID; agencies upload a commercial registration and real-estate licence number. Verified advertisers get a badge and higher ranking.",
      ar: "يرفع الأفراد البطاقة الشخصية القطرية، وترفع الوكالات السجل التجاري ورقم رخصة الوساطة. يحصل المعلنون الموثقون على شارة وترتيب أعلى.",
    },
    url: "/advertiser",
    keywords: ["verify", "verification", "badge", "licence", "license", "qid", "توثيق", "رخصة", "شارة", "البطاقة"],
  },
  {
    id: "kb-whatsapp",
    title: { en: "WhatsApp alerts and opt-out", ar: "تنبيهات واتساب وإلغاء الاشتراك" },
    body: {
      en: "You can receive property packs and new-match alerts on WhatsApp after opting in. Reply STOP at any time to unsubscribe; your choice is logged with a timestamp.",
      ar: "يمكنك استلام ملفات العقارات وتنبيهات المطابقة على واتساب بعد الموافقة. أرسل STOP في أي وقت لإلغاء الاشتراك، ويتم تسجيل اختيارك بتاريخ ووقت.",
    },
    url: "/whatsapp",
    keywords: ["whatsapp", "alert", "stop", "unsubscribe", "واتساب", "تنبيه", "إلغاء", "ايقاف"],
  },
  {
    id: "kb-promote",
    title: { en: "Promoting a listing on Facebook and Instagram", ar: "ترويج إعلان على فيسبوك وإنستغرام" },
    body: {
      en: "From your dashboard choose 'Promote on Meta'. Our marketing assistant drafts the audience, budget and Arabic/English ad copy. Nothing is published or charged until you approve. Ad spend and the AqarPro service fee are shown as separate lines.",
      ar: "من لوحة التحكم اختر 'روّج على ميتا'. يقترح المساعد التسويقي الجمهور والميزانية ونص الإعلان بالعربية والإنجليزية. لا يتم النشر أو الخصم قبل موافقتك. تظهر تكلفة الإعلان ورسوم الخدمة كبندين منفصلين.",
    },
    url: "/advertiser",
    keywords: ["promote", "facebook", "instagram", "meta", "campaign", "ads", "ترويج", "فيسبوك", "انستغرام", "حملة", "إعلان ممول"],
  },
];

export function kbSearch(text: string) {
  const t = text.toLowerCase();
  return kb
    .map((a) => ({ a, score: a.keywords.filter((k) => t.includes(k)).length }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a);
}
