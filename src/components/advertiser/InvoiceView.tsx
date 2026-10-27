"use client";

import { Printer } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge, btn } from "@/components/ui";
import { advertiserById, DEMO_ADVERTISER_ID } from "@/lib/data";
import { gregorian, hijri, qar } from "@/lib/format";
import type { Invoice } from "@/lib/store";

const methodName = {
  card: { en: "Credit / debit card", ar: "بطاقة ائتمان / خصم" },
  debit: { en: "QPay debit card", ar: "بطاقة خصم كيو باي" },
  bank: { en: "Bank transfer", ar: "تحويل بنكي" },
};

/**
 * Bilingual invoice (FR-BIL-03): sequential number, both languages on one
 * document, tax line shown even when not applicable.
 */
export function InvoiceView({ inv }: { inv: Invoice }) {
  const adv = advertiserById(DEMO_ADVERTISER_ID);
  const subtotal = inv.lines.reduce((s, l) => s + l.amount, 0);

  return (
    <div id="invoice-print" className="text-sm text-stone-800">
      <style>{`@media print { body * { visibility: hidden !important; } #invoice-print, #invoice-print * { visibility: visible !important; } #invoice-print { position: absolute; inset: 0 auto auto 0; width: 100%; padding: 24px; } }`}</style>
      <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <Logo className="h-9 w-auto" />
          <p className="mt-2 text-xs text-stone-500">MaxPro Technology W.L.L. · Doha, Qatar · CR 000000</p>
        </div>
        <div className="text-end">
          <div className="text-lg font-bold">
            TAX INVOICE <span className="font-[family-name:var(--font-arabic)]">· فاتورة</span>
          </div>
          <div className="font-mono text-xs text-stone-600">{inv.id}</div>
          <div className="mt-1">
            {inv.status === "paid" ? (
              <Badge tone="green">PAID · مدفوعة</Badge>
            ) : (
              <Badge tone="amber">PENDING BANK TRANSFER · بانتظار التحويل</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-b border-stone-200 py-4 text-xs">
        <div>
          <div className="font-semibold text-stone-500">Billed to · فاتورة إلى</div>
          <div className="mt-1 font-semibold">{adv.name.en}</div>
          <div className="font-[family-name:var(--font-arabic)]">{adv.name.ar}</div>
          <div className="text-stone-500">Licence {adv.licence}</div>
        </div>
        <div className="text-end">
          <div className="font-semibold text-stone-500">Date · التاريخ</div>
          <div className="mt-1">{gregorian(inv.at, "en")}</div>
          <div className="font-[family-name:var(--font-arabic)]">{hijri(inv.at, "ar")}</div>
          <div className="mt-1 text-stone-500">
            {methodName[inv.method].en} · <span className="font-[family-name:var(--font-arabic)]">{methodName[inv.method].ar}</span>
          </div>
        </div>
      </div>

      <table className="mt-4 w-full text-xs">
        <thead>
          <tr className="border-b border-stone-200 text-stone-500">
            <th className="py-2 text-start font-semibold">Description · البيان</th>
            <th className="py-2 text-end font-semibold">Amount · المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l, i) => (
            <tr key={i} className="border-b border-stone-100">
              <td className="py-2">
                <div>{l.label.en}</div>
                <div className="font-[family-name:var(--font-arabic)] text-stone-500">{l.label.ar}</div>
              </td>
              <td className={`py-2 text-end font-medium ${l.amount < 0 ? "text-emerald-700" : ""}`}>{qar(l.amount, "en")}</td>
            </tr>
          ))}
          <tr className="border-b border-stone-100 text-stone-500">
            <td className="py-2">
              Tax (0%) — no VAT currently applies in Qatar
              <div className="font-[family-name:var(--font-arabic)]">الضريبة (0٪) — لا تطبق ضريبة القيمة المضافة حالياً</div>
            </td>
            <td className="py-2 text-end">{qar(0, "en")}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-3 text-base font-bold">Total · الإجمالي</td>
            <td className="pt-3 text-end text-base font-bold">{qar(subtotal, "en")}</td>
          </tr>
        </tfoot>
      </table>

      {inv.status === "pending" && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Please transfer to QNB · IBAN QA00 QNBA 0000 0000 0000 1234 5678 9 · Reference {inv.id}. Your plan activates once
          the finance team approves the transfer.
        </p>
      )}

      <p className="mt-6 text-[11px] text-stone-400">
        Computer-generated invoice. Card data is processed on the payment gateway&apos;s PCI DSS hosted page and is never stored by MaxPro.
      </p>

      <div className="mt-5 flex gap-2 print:hidden">
        <button onClick={() => window.print()} className={btn.secondary}>
          <Printer className="h-4 w-4" />
          Print / PDF · طباعة
        </button>
      </div>
    </div>
  );
}
