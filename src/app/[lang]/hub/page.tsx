import { Suspense } from "react";
import type { Metadata } from "next";
import { HubPage } from "@/components/hub/HubPage";

export const metadata: Metadata = { title: "Portal Integration Hub", robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-sm text-stone-500">…</div>}>
      <HubPage />
    </Suspense>
  );
}
