"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Heart, Inbox, LayoutDashboard, Languages, Menu, MessageCircle, Network, PlusCircle, Presentation, ShieldCheck, Sparkles, UserPlus, Users, X } from "lucide-react";
import { Logo } from "./Logo";
import { btn, cn } from "./ui";
import { useLang } from "@/lib/useLang";
import { useStore } from "@/lib/store";
import { StageBadge, StageSwitch, useStage, type Stage } from "@/lib/stage";

export function Header() {
  const { lang, t, href } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [portals, setPortals] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setPortals(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Close menus on navigation (state adjusted during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
    setPortals(false);
  }

  const switchLang = () => {
    const other = lang === "en" ? "ar" : "en";
    const rest = pathname.replace(/^\/(en|ar)/, "");
    router.push(`/${other}${rest}${window.location.search}`);
  };

  const nav = [
    { label: t("Rent", "إيجار"), to: "/search?purpose=rent" },
    { label: t("Buy", "شراء"), to: "/search?purpose=sale" },
    { label: t("Map search", "البحث بالخريطة"), to: "/search?view=map" },
    { label: t("Pricing", "الأسعار"), to: "/pricing" },
  ];

  const { visible } = useStage();
  const portalLinks: { icon: typeof Inbox; label: string; to: string; stage?: Stage; group: string }[] = [
    { icon: UserPlus, label: t("Register & verify", "التسجيل والتوثيق"), to: "/register", stage: "S1", group: "agency" },
    { icon: LayoutDashboard, label: t("Agency dashboard", "لوحة الوكالة"), to: "/advertiser", stage: "S1", group: "agency" },
    { icon: Sparkles, label: t("AI Listing Studio", "استوديو الإعلانات الذكي"), to: "/advertiser/studio", stage: "S1", group: "agency" },
    { icon: Network, label: t("Portal Integration Hub", "مركز ربط البوابات"), to: "/hub", stage: "S1", group: "agency" },
    { icon: Users, label: t("Lead manager", "إدارة العملاء"), to: "/advertiser/leads", stage: "S1", group: "agency" },
    { icon: PlusCircle, label: t("Post a listing (classic form)", "أضف إعلان (النموذج التقليدي)"), to: "/advertiser/new", stage: "S1", group: "agency" },
    { icon: ShieldCheck, label: t("Admin & moderation", "الإدارة والمراجعة"), to: "/admin", stage: "S1", group: "ops" },
    { icon: Inbox, label: t("Support inbox", "صندوق الدعم"), to: "/inbox", stage: "S1", group: "ops" },
    { icon: MessageCircle, label: t("WhatsApp simulator", "محاكي واتساب"), to: "/whatsapp", stage: "S2", group: "ops" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
        <Link href={href("/")} aria-label="AqarPro home" className="shrink-0">
          <Logo className="h-9 w-auto sm:h-11" />
        </Link>

        <nav className="ms-6 hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link key={n.to} href={href(n.to)} className="rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1">
          <StageSwitch />
          <div className="relative hidden md:block" ref={ref}>
            <button onClick={() => setPortals((v) => !v)} className={cn(btn.ghost, "border border-dashed border-stone-300")}>
              <Presentation className="h-4 w-4" />
              {t("Demo portals", "بوابات العرض")}
              <ChevronDown className="h-4 w-4" />
            </button>
            {portals && (
              <div className="absolute end-0 mt-2 w-80 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
                {portalLinks.map((p, i) => (
                  <div key={p.to}>
                    {i > 0 && portalLinks[i - 1].group !== p.group && <div className="my-1 border-t border-stone-100" />}
                    <Link
                      href={href(p.to)}
                      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100", p.stage && !visible(p.stage) && "opacity-40")}
                    >
                      <p.icon className="h-4 w-4 shrink-0 text-brand-600" />
                      <span className="flex-1">{p.label}</span>
                      {p.stage && <StageBadge s={p.stage} />}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {visible("S2") && (
          <Link href={href("/search?favourites=1")} className={cn(btn.ghost, "relative")} aria-label={t("Favourites", "المفضلة")}>
            <Heart className="h-5 w-5" />
            {state.favourites.length > 0 && (
              <span className="absolute -top-0.5 end-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {state.favourites.length}
              </span>
            )}
          </Link>
          )}

          <button onClick={switchLang} className={btn.ghost} aria-label="Switch language">
            <Languages className="h-4 w-4" />
            <span className={cn("hidden sm:inline", lang === "en" && "font-[family-name:var(--font-arabic)]")}>{lang === "en" ? "العربية" : "English"}</span>
            <span className={cn("sm:hidden", lang === "en" && "font-[family-name:var(--font-arabic)]")}>{lang === "en" ? "ع" : "EN"}</span>
          </button>

          <Link href={href("/advertiser/new")} className={cn(btn.primary, "max-sm:hidden")}>
            <PlusCircle className="h-4 w-4" />
            {t("Post a listing", "أضف إعلان")}
          </Link>

          <button className={cn(btn.ghost, "lg:hidden")} onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-stone-200 bg-white px-4 py-3 lg:hidden">
          {[...nav, ...portalLinks].map((n) => (
            <Link key={n.to + n.label} href={href(n.to)} className="block rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
              {n.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
