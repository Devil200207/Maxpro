import type { Metadata } from "next";
import { StudioWizard } from "@/components/studio/StudioWizard";

export const metadata: Metadata = { title: "AI Listing Studio", robots: { index: false } };

export default function Page() {
  return <StudioWizard />;
}
