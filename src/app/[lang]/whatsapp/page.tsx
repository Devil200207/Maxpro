import type { Metadata } from "next";
import { Suspense } from "react";
import { WhatsAppSim } from "@/components/whatsapp/WhatsAppSim";

export async function generateMetadata({ params }: PageProps<"/[lang]/whatsapp">): Promise<Metadata> {
  const { lang } = await params;
  return { title: lang === "ar" ? "تجربة واتساب" : "WhatsApp experience", robots: { index: false } };
}

export default function WhatsAppPage() {
  return (
    <Suspense>
      <WhatsAppSim />
    </Suspense>
  );
}
