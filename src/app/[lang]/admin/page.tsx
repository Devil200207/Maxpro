import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default function AdminPage() {
  return (
    <Suspense>
      <AdminConsole />
    </Suspense>
  );
}
