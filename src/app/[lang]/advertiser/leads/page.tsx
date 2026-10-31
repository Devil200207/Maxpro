import type { Metadata } from "next";
import { LeadsPage } from "@/components/leads/LeadsPage";

export async function generateMetadata({ params }: PageProps<"/[lang]/advertiser/leads">): Promise<Metadata> {
  const { lang } = await params;
  return { title: lang === "ar" ? "إدارة العملاء" : "Lead manager", robots: { index: false } };
}

export default function Page() {
  return <LeadsPage />;
}
