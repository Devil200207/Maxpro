"use client";

import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { StageBadge, StageGate } from "@/lib/stage";
import { useStore, type Conversation } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { btn, Card, cn, input, ReqTag } from "@/components/ui";
import { downloadCsv, useNow } from "./channel";

const AGENTS = ["Layla", "Omar", "Ravi"];

/**
 * Stage 1 support desk (WP-SUP-09 "basic enquiry list"): web enquiries with status,
 * assignment and export. The full shared inbox (WhatsApp, AI handover, SLA timers,
 * notes, lead routing) arrives in Stage 2.
 */
export function BasicInbox() {
  const { lang, t } = useLang();
  const { state, update, audit } = useStore();
  const now = useNow(30000);

  const rows = state.conversations.filter((c) => c.channel === "web").sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const patch = (id: string, fn: (c: Conversation) => Conversation) =>
    update((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === id ? fn(c) : c)) }));

  const firstMsg = (c: Conversation) => c.messages.find((m) => m.from === "user")?.text ?? "";

  const exportCsv = () =>
    downloadCsv("aqarpro-enquiries.csv", [
      ["id", "customer", "phone", "listing", "status", "assignee", "received", "message"],
      ...rows.map((c) => [c.id, c.customer.name, c.customer.phone, c.listingId, c.status, c.assignee, c.createdAt, firstMsg(c)]),
    ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-stone-900">{t("Enquiries", "الاستفسارات")}</h1>
          <StageBadge s="S1" />
          <ReqTag id="WP-SUP-09" />
          <span className="text-xs text-stone-500">{t("Basic enquiry list", "قائمة الاستفسارات الأساسية")}</span>
        </div>
        <button onClick={exportCsv} className={cn(btn.secondary, "py-1.5 text-xs")}>
          <Download className="h-3.5 w-3.5" />
          {t("Export CSV", "تصدير CSV")}
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-4 py-2 text-start font-semibold">{t("Customer", "العميل")}</th>
                <th className="px-4 py-2 text-start font-semibold">{t("Enquiry", "الاستفسار")}</th>
                <th className="px-4 py-2 text-start font-semibold">{t("Listing", "الإعلان")}</th>
                <th className="px-4 py-2 text-start font-semibold">{t("Received", "الاستلام")}</th>
                <th className="px-4 py-2 text-start font-semibold">{t("Status", "الحالة")}</th>
                <th className="px-4 py-2 text-start font-semibold">{t("Assignee", "المسؤول")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-stone-900">{c.customer.name}</div>
                    <div className="text-xs text-stone-500" dir="ltr">
                      {c.customer.phone}
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-stone-700">{firstMsg(c)}</td>
                  <td className="px-4 py-3">
                    {c.listingId && (
                      <Link href={`/${lang}/listing/${c.listingId}`} className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-brand-600">
                        {c.listingId}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">{now === null ? "" : timeAgo(c.createdAt, lang)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status === "bot" ? "open" : c.status}
                      onChange={(e) => {
                        const status = e.target.value as Conversation["status"];
                        patch(c.id, (x) => ({ ...x, status, updatedAt: new Date().toISOString() }));
                        audit({ actor: "Layla (Support)", role: "agent", action: `enquiry.${status}`, target: c.id });
                      }}
                      className={cn(input, "w-32 py-1.5 text-xs")}
                    >
                      <option value="open">{t("Open", "مفتوح")}</option>
                      <option value="pending">{t("Pending", "معلق")}</option>
                      <option value="closed">{t("Closed", "مغلق")}</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.assignee ?? ""}
                      onChange={(e) => {
                        const assignee = e.target.value || undefined;
                        patch(c.id, (x) => ({ ...x, assignee, updatedAt: new Date().toISOString() }));
                        audit({ actor: "Layla (Support)", role: "agent", action: "enquiry.assigned", target: c.id, detail: assignee ?? "unassigned" });
                      }}
                      className={cn(input, "w-32 py-1.5 text-xs")}
                    >
                      <option value="">{t("Unassigned", "غير مسند")}</option>
                      {AGENTS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-stone-500">
                    {t("No web enquiries yet.", "لا توجد استفسارات بعد.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <StageGate stage="S2" className="mt-6" label={t("Full shared inbox — Stage 2", "صندوق الوكلاء المشترك الكامل — المرحلة الثانية")}>
        {null}
      </StageGate>
    </div>
  );
}
