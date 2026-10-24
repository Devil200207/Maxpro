import type { Invoice } from "@/lib/store";

/** Sequential invoice numbering (FR-BIL-03): next number after the highest issued. */
export function nextInvoiceId(invoices: Invoice[]) {
  const max = invoices.reduce((m, i) => Math.max(m, Number(i.id.split("-").pop()) || 0), 0);
  return `INV-2026-${String(max + 1).padStart(6, "0")}`;
}
