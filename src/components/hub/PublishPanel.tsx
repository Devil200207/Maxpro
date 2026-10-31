"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Ban, Braces, CheckCircle2, Info, Lock, Send, UserCheck, Wrench } from "lucide-react";
import { Badge, btn, Card, cn, input, ReqTag } from "@/components/ui";
import { toast } from "@/components/Toaster";
import { approveAndQueue, prepareVersions, queueUnpublish, requestApproval, fixField } from "@/lib/hub/actions";
import { portalTitle, type FixableField } from "@/lib/hub/engine";
import { remoteItems } from "@/lib/hub/mockPortals";
import { portalById, portals } from "@/lib/portals";
import { StageBadge } from "@/lib/stage";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { JobLog, JobStatusBadge, PlStatusBadge, PortalChip, plStatus, useActor, useMounted } from "./parts";
import { useHubRunner } from "./useHubRunner";

/**
 * Publish one canonical listing to external portals (UAT C4):
 * pick portals → build portal-specific versions → fix flagged fields → approve → jobs run.
 */
export function PublishPanel({ listingId }: { listingId: string }) {
  useHubRunner();
  const { state, update } = useStore();
  const { t, p, href } = useLang();
  const actor = useActor();
  const listing = state.listings.find((l) => l.id === listingId);
  const connected = state.connections.filter((c) => c.orgId === listing?.orgId && c.status === "connected").map((c) => c.portalId);
  const existing = state.portalListings.filter((pl) => pl.listingId === listingId);
  const [picked, setPicked] = useState<string[]>(() => (existing.length ? existing.map((e) => e.portalId) : connected));
  const [fix, setFix] = useState<Record<string, string>>({});
  const [showPayload, setShowPayload] = useState<string | null>(null);
  const mounted = useMounted();

  if (!listing) return null;
  const role = state.session.role;
  const canApprove = role === "owner" || role === "manager";
  const versions = picked.map((pid) => existing.find((e) => e.portalId === pid)).filter(Boolean) as typeof existing;
  const built = versions.length === picked.length && picked.length > 0;
  const approvable = versions.filter((v) => !v.issues.length && ["draft", "ready", "failed"].includes(v.status));
  const awaiting = versions.filter((v) => v.status === "ready");

  const build = () => {
    update((s) => prepareVersions(s, listingId, picked, actor));
    toast(t("Portal versions built and validated", "تم إنشاء نسخ البوابات والتحقق منها"));
  };

  const doFix = (field: FixableField) => {
    const v = (fix[field] ?? "").trim();
    if (!v) return;
    update((s) => fixField(s, listingId, field, v, actor));
    setFix((f) => ({ ...f, [field]: "" }));
    toast(t("Fixed on the canonical listing — versions re-validated", "تم التصحيح في السجل الأساسي وأعيد التحقق"));
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold text-stone-900">
          {t("Publish to external portals", "النشر إلى البوابات الخارجية")}
          <StageBadge s="S1" />
        </h3>
        <div className="flex gap-1">
          <ReqTag id="HUB-04" />
          <ReqTag id="HUB-05" />
          <ReqTag id="HUB-08" />
        </div>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {t(
          "One canonical AqarPro record; each portal gets its own mapped version. Fixes go to the canonical record, never to a single portal copy.",
          "سجل أساسي واحد في عقار برو؛ ولكل بوابة نسختها الخاصة. التصحيحات تتم في السجل الأساسي وليس في نسخة بوابة واحدة.",
        )}
      </p>

      {/* 1. Pick portals */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {portals.map((portal) => {
          const isConnected = connected.includes(portal.id);
          const on = picked.includes(portal.id);
          return (
            <label
              key={portal.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                on ? "border-brand-400 bg-brand-50/50" : "border-stone-200 hover:border-stone-300",
                !isConnected && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="checkbox"
                className="mt-1"
                disabled={!isConnected}
                checked={on}
                onChange={(e) => setPicked((x) => (e.target.checked ? [...x, portal.id] : x.filter((y) => y !== portal.id)))}
              />
              <div className="min-w-0">
                <PortalChip portalId={portal.id} />
                <p className="mt-1 text-xs text-stone-500">{p(portal.note)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {portal.capabilities.map((c) => (
                    <Badge key={c} tone="stone" className="font-mono text-[10px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      <button onClick={build} disabled={!picked.length} className={cn(btn.secondary, "mt-3")}>
        <Wrench className="h-4 w-4" />
        {existing.length ? t("Rebuild portal versions", "إعادة بناء نسخ البوابات") : t("Build portal versions", "إنشاء نسخ البوابات")}
      </button>

      {/* 2. Versions */}
      {versions.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {versions.map((v) => {
            const portal = portalById(v.portalId);
            const job = state.publishJobs.find((j) => j.portalListingId === v.id);
            const tt = portalTitle(listing, portal);
            const remote = !mounted ? "—" : remoteItems(v.portalId, `${listing.id}@${listing.createdAt}`).filter((r) => r.status === "active").length;
            return (
              <div key={v.id} className={cn("rounded-xl border p-4", v.issues.length ? "border-red-200 bg-red-50/30" : "border-stone-200")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PortalChip portalId={v.portalId} />
                  <PlStatusBadge status={v.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-stone-500">{t("Payload version", "إصدار الحمولة")}</dt>
                  <dd className="font-mono text-stone-800">v{v.payloadVersion}</dd>
                  <dt className="text-stone-500">{t("External ID", "المعرف الخارجي")}</dt>
                  <dd className="font-mono text-stone-800">{v.externalId ?? "—"}</dd>
                  <dt className="text-stone-500">{t("Items on portal", "العناصر في البوابة")}</dt>
                  <dd className="font-mono text-stone-800" title={t("Read from the mock portal itself — proves no duplicate", "من البوابة التجريبية نفسها — يثبت عدم التكرار")}>
                    {remote}
                  </dd>
                  <dt className="text-stone-500">{t("Portal title", "عنوان البوابة")}</dt>
                  <dd className="truncate text-stone-800" title={tt.title}>
                    {tt.title}
                  </dd>
                </dl>
                {tt.transformed && (
                  <p className="mt-2 flex gap-1.5 text-[11px] text-sky-700">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    {t(`Title shortened to fit ${portal.limits.titleMax} characters for this portal.`, `تم تقصير العنوان ليناسب ${portal.limits.titleMax} حرفاً لهذه البوابة.`)}
                  </p>
                )}

                {v.issues.map((iss) => {
                  const fixable = (["floor", "permitNo", "titleAr", "titleEn"] as string[]).includes(iss.field);
                  return (
                    <div key={iss.field} className="mt-3 rounded-lg border border-red-200 bg-white p-2.5">
                      <div className="text-xs font-semibold text-red-700">{p(iss.message)}</div>
                      {fixable && (
                        <div className="mt-2 flex gap-2">
                          <input
                            className={cn(input, "py-1.5 text-xs")}
                            inputMode={iss.field === "floor" ? "numeric" : "text"}
                            placeholder={iss.field === "floor" ? t("Floor number, e.g. 14", "رقم الطابق، مثال 14") : iss.field === "permitNo" ? "QA-RE-2026…" : ""}
                            value={fix[iss.field] ?? ""}
                            onChange={(e) => setFix((f) => ({ ...f, [iss.field]: e.target.value }))}
                            dir="ltr"
                          />
                          <button onClick={() => doFix(iss.field as FixableField)} className={cn(btn.primary, "shrink-0 px-3 py-1.5 text-xs")}>
                            {t("Fix", "تصحيح")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setShowPayload(showPayload === v.id ? null : v.id)} className={cn(btn.ghost, "px-2 py-1 text-xs")}>
                    <Braces className="h-3.5 w-3.5" />
                    {t("Payload", "الحمولة")}
                  </button>
                  {v.status === "published" &&
                    (portal.capabilities.includes("unpublish") ? (
                      <button onClick={() => update((s) => queueUnpublish(s, v.id, actor))} disabled={!canApprove} className={cn(btn.ghost, "px-2 py-1 text-xs text-red-600")}>
                        <Ban className="h-3.5 w-3.5" />
                        {t("Unpublish", "إلغاء النشر")}
                      </button>
                    ) : (
                      <span className="px-2 py-1 text-xs text-stone-400">{t("Unpublish not supported by this portal", "إلغاء النشر غير مدعوم في هذه البوابة")}</span>
                    ))}
                </div>
                {showPayload === v.id && (
                  <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-stone-950 p-2.5 text-[10px] text-sky-200" dir="ltr">
                    {JSON.stringify({ ...v.payload, Photos: undefined, images: undefined, photos_count: listing.media.filter((m) => m.cat !== "floorplan").length }, null, 2)}
                  </pre>
                )}
                {job && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-mono text-stone-500">
                        {job.id} · {job.action} · {t("attempt", "محاولة")} {job.attempt}
                      </span>
                      <JobStatusBadge job={job} />
                    </div>
                    <JobLog job={job} max={6} />
                  </div>
                )}
                {plStatus[v.status].action && !job && (
                  <p className="mt-2 text-xs font-medium text-stone-600">
                    {t("Action required", "الإجراء المطلوب")}: {p(plStatus[v.status].action!)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Approval gate (enforced in the app, by role) */}
      {built && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="text-sm text-stone-600">
            {role === "readonly" ? (
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {t("Read-only users cannot publish.", "لا يمكن لمستخدمي القراءة فقط النشر.")}
              </span>
            ) : canApprove ? (
              t("As owner/manager you can approve publishing directly.", "بصفتك مالكاً أو مديراً يمكنك اعتماد النشر مباشرة.")
            ) : (
              t("Agents need a manager's approval before anything is sent to a portal.", "يحتاج الوكلاء إلى اعتماد المدير قبل الإرسال لأي بوابة.")
            )}
            {awaiting.length > 0 && (
              <div className="mt-1 text-xs font-semibold text-amber-700">
                {awaiting.length} {t("destination(s) awaiting manager approval", "وجهة بانتظار اعتماد المدير")}
              </div>
            )}
          </div>
          {canApprove ? (
            <button
              disabled={!approvable.length}
              onClick={() => {
                update((s) => approveAndQueue(s, approvable.map((v) => v.id), actor));
                toast(t("Approved — publishing jobs queued", "تم الاعتماد — أُضيفت مهام النشر"));
              }}
              className={btn.primary}
            >
              <Send className="flip-rtl h-4 w-4" />
              {t("Approve & publish", "اعتماد ونشر")} ({approvable.length})
            </button>
          ) : role === "agent" ? (
            <button
              disabled={!approvable.filter((v) => v.status === "draft").length}
              onClick={() => {
                update((s) => requestApproval(s, approvable.filter((v) => v.status === "draft").map((v) => v.id), actor));
                toast(t("Approval requested from your manager", "تم طلب الاعتماد من المدير"));
              }}
              className={btn.secondary}
            >
              <UserCheck className="h-4 w-4" />
              {t("Request manager approval", "طلب اعتماد المدير")}
            </button>
          ) : null}
        </div>
      )}

      {versions.length > 0 && versions.every((v) => v.status === "published") && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            {t("Live on all selected portals — one item per portal, no duplicates.", "منشور على كل البوابات المختارة — عنصر واحد لكل بوابة دون تكرار.")}
          </span>
          <Link href={href(`/hub?listing=${listingId}`)} className="flex items-center gap-1 font-semibold underline">
            {t("Open Hub dashboard", "فتح لوحة المركز")}
            <ArrowRight className="flip-rtl h-4 w-4" />
          </Link>
        </div>
      )}
    </Card>
  );
}
