import type { Metadata } from "next";
import { Suspense } from "react";
import { Inbox } from "@/components/inbox/Inbox";

export const metadata: Metadata = { title: "Support inbox", robots: { index: false } };

export default function InboxPage() {
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  );
}
