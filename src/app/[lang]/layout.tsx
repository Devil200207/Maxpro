import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IBM_Plex_Sans_Arabic, Manrope } from "next/font/google";
import "../globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AssistantWidget } from "@/components/AssistantWidget";
import { Toaster } from "@/components/Toaster";
import { StoreProvider } from "@/lib/store";
import { dirOf, isLocale, locales } from "@/lib/i18n";

const latin = Manrope({ subsets: ["latin"], variable: "--font-latin" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-arabic" });

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const ar = lang === "ar";
  return {
    title: { default: ar ? "عقار برو — عقارات قطر" : "AqarPro — Qatar Property", template: "%s · AqarPro" },
    description: ar
      ? "منصة عقار برو: ابحث عن شقق وفلل للإيجار والبيع في قطر، وانشر إعلاناتك بالذكاء الاصطناعي على عدة بوابات."
      : "AqarPro: find apartments and villas for rent and sale in Qatar, and publish AI-assisted listings to multiple portals.",
    alternates: { languages: { en: "/en", ar: "/ar" } },
    manifest: "/manifest.webmanifest",
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang} dir={dirOf(lang)} className={`${latin.variable} ${arabic.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <StoreProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <AssistantWidget />
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
