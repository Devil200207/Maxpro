"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import { Activity, AlertTriangle, Ban, Cable, CheckCircle2, Download, Gauge, ListChecks, Network, PlugZap, RefreshCw, RotateCw, ShieldAlert, X } from "lucide-react";
import { Badge, btn, Card, cn, ReqTag, Stat } from "@/components/ui";
import { toast } from "@/components/Toaster";
import { advertiserById } from "@/lib/data";
import { cancelJob, reprocessJob } from "@/lib/hub/actions";
import { maskCredential } from "@/lib/hub/engine";
import { fetchPortalLeads } from "@/lib/hub/mockPortals";
import { portalById, portals } from "@/lib/portals";
import { StageBadge, StageGate } from "@/lib/stage";
import { uid, useStore, type PortalListing, type PublishJob } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import { useLang } from "@/lib/useLang";
import { JobLog, JobStatusBadge, PlStatusBadge, PortalChip, plStatus, useActor, useMounted } from "./parts";
import { PublishPanel } from "./PublishPanel";
import { isInterrupted, reconcileJob, useHubRunner } from "./useHubRunner";

type Tab = "destinations" | "jobs" | "connectors" | "health";

/** Portal Integration Hub dashboard (HUB-07/10). scope="admin" shows every organisation. */
export function HubDashboard({ scope, focusListingId }: { scope: "agency" | "admin"; focusListingId?: string }) {
  useHubRunner();
  const { state, update } = useStore();
  const { t, p, lang } = useLang();
  const actor = useActor();
  const mounted = useMounted();
  const [tab, setTab] = useState<Tab>("destinations");
  const [focus, setFocus] = useState<string | undefined>(focusListingId);
  const [openJob, setOpenJob] = useState<string | null>(null);

  const org = advertiserById(state.session.advertiserId).orgId;
  const inScope = <T extends { orgId: string }>(x: T) => scope === "admin" || x.orgId === org;
  const pls = state.portalListings.filter(inScope);
  const jobs = state.publishJobs.filter(inScope);
  const connections = state.connections.filter(inScope);
  const listingIds = [...new Set(pls.map((x) => x.listingId))];
  const orgListings = state.listings.filter((l) => (scope === "admin" || l.orgId === org) && !["archived", "rejected"].includes(l.status));

  const finished = jobs.filter((j) => ["succeeded", "failed", "cancelled"].includes(j.status));
  const okRate = finished.length ? Math.round((finished.filter((j) => j.status === "succeeded").length / finished.length) * 100) : 100;
  const queueDepth = jobs.filter((j) => ["queued", "retrying", "running", "timeout"].includes(j.status)).length;
  const needsFix = pls.filter((x) => x.status === "needs_fix").length;
  const interrupted = mounted ? jobs.filter(isInterrupted) : [];
  const retries = jobs.reduce((n, j) => n + Math.max(0, j.attempt - 1), 0);
  const failed = jobs.some((j) => j.status === "failed");

  const tabs: { id: Tab; icon: typeof Network; label: string; count?: number }[] = [
    { id: "destinations", icon: Network, label: t("Destinations", "الوجهات"), count: needsFix || undefined },
    { id: "jobs", icon: ListChecks, label: t("Jobs", "المهام"), count: queueDepth || undefined },
    { id: "connectors", icon: Cable, label: t("Connectors", "الموصلات") },
    { id: "health", icon: Gauge, label: t("Health", "الصحة") },
  ];

  const cell = (listingId: string, portalId: string): PortalListing | undefined => pls.find((x) => x.listingId === listingId && x.portalId === portalId);

  const fetchLeads = async (pl: PortalListing) => {
    const got = await fetchPortalLeads(pl.portalId, pl.listingId);
    const fresh = got.filter((g) => !state.leads.some((x) => x.phone === g.phone && x.listingId === pl.listingId));
    const l = state.listings.find((x) => x.id === pl.listingId);
    const at = new Date().toISOString();
    update((s) => ({
      ...s,
      leads: [
        ...fresh
          .filter((g) => !s.leads.some((x) => x.phone === g.phone && x.listingId === pl.listingId))
          .map((g) => ({
            id: uid("L"),
            listingId: pl.listingId,
            advertiserId: l?.advertiserId ?? s.session.advertiserId,
            name: g.name,
            phone: g.phone,
            channel: "portal" as const,
            message: g.message,
            createdAt: at,
            status: "new" as const,
            source: `${portalById(pl.portalId).name.en} (lead API)`,
            portalId: pl.portalId,
          })),
        ...s.leads,
      ],
      audit: [
        { id: uid("A"), at, actor: "Integration Hub", role: "system" as const, action: "hub.leads_fetched", target: pl.listingId, detail: `${fresh.length} new, ${got.length - fresh.length} duplicate(s) skipped` },
        ...s.audit,
      ],
    }));
    toast(t(`Lead retrieval done — ${fresh.length} new, ${got.length - fresh.length} duplicate(s) skipped`, `تم جلب العملاء — ${fresh.length} جديد، وتم تجاهل ${got.length - fresh.length} مكرر`));
  };

  const jobRow = (j: PublishJob) => {
    const open = openJob === j.id;
    const stuck = mounted && isInterrupted(j);
    return (
      <Fragment key={j.id}>
        <tr className="cursor-pointer hover:bg-stone-50" onClick={() => setOpenJob(open ? null : j.id)}>
          <td className="px-3 py-2.5 font-mono text-xs">{j.id}</td>
          <td className="px-3 py-2.5 font-mono text-xs">{j.listingId}</td>
          <td className="px-3 py-2.5">
            <PortalChip portalId={j.portalId} />
          </td>
          <td className="px-3 py-2.5 font-mono text-xs">{j.action}</td>
          <td className="px-3 py-2.5">{mounted ? <JobStatusBadge job={j} /> : <Badge>{j.status}</Badge>}</td>
          <td className="px-3 py-2.5 text-xs">
            {j.attempt}/{j.maxAttempts}
          </td>
          <td className="px-3 py-2.5 font-mono text-[11px] text-stone-500" dir="ltr">
            {j.idempotencyKey}
          </td>
          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end gap-1">
              {stuck && (
                <button onClick={() => void reconcileJob(j, state, update)} className={cn(btn.secondary, "px-2 py-1 text-xs")}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("Reconcile", "تسوية")}
                </button>
              )}
              {(j.status === "failed" || j.status === "cancelled") && (
                <button
                  onClick={() => {
                    update((s) => {
                      const next = reprocessJob(s, j.id, actor);
                      return { ...next, portalListings: next.portalListings.map((x) => (x.id === j.portalListingId ? { ...x, status: "queued" as const } : x)) };
                    });
                    toast(t("Job re-queued with the same idempotency key", "أعيدت المهمة بنفس مفتاح عدم التكرار"));
                  }}
                  className={cn(btn.secondary, "px-2 py-1 text-xs")}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  {t("Reprocess", "إعادة المعالجة")}
                </button>
              )}
              {["queued", "timeout"].includes(j.status) && (
                <button onClick={() => update((s) => cancelJob(s, j.id, actor))} className={cn(btn.ghost, "px-2 py-1 text-xs text-red-600")}>
                  <Ban className="h-3.5 w-3.5" />
                  {t("Cancel", "إلغاء")}
                </button>
              )}
            </div>
          </td>
        </tr>
        {open && (
          <tr>
            <td colSpan={8} className="bg-stone-50 px-3 py-3">
              <JobLog job={j} />
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label={t("Destinations", "الوجهات")} value={pls.length} hint={`${listingIds.length} ${t("listings", "إعلانات")}`} icon={<Network className="h-4 w-4" />} />
        <Stat label={t("Published", "منشور")} value={pls.filter((x) => x.status === "published").length} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
        <Stat label={t("Need a fix", "تحتاج تصحيح")} value={<span className={needsFix ? "text-red-600" : ""}>{needsFix}</span>} icon={<AlertTriangle className="h-4 w-4 text-red-500" />} />
        <Stat label={t("Queue depth", "عمق الطابور")} value={queueDepth} hint={`${retries} ${t("retries", "إعادات")}`} icon={<Activity className="h-4 w-4" />} />
        <Stat label={t("Job success rate", "نجاح المهام")} value={`${okRate}%`} hint={`${finished.length} ${t("finished", "منتهية")}`} icon={<Gauge className="h-4 w-4" />} />
      </div>

      {interrupted.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            {t(
              `${interrupted.length} job(s) were interrupted mid-flight. Their outcome is unknown until reconciled with the portal.`,
              `${interrupted.length} مهمة انقطعت أثناء التنفيذ. نتيجتها غير معروفة حتى تتم التسوية مع البوابة.`,
            )}
          </span>
          <button onClick={() => interrupted.forEach((j) => void reconcileJob(j, state, update))} className={cn(btn.secondary, "px-3 py-1.5 text-xs")}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t("Reconcile all", "تسوية الكل")}
          </button>
        </div>
      )}

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-stone-200 scrollbar-none">
        {tabs.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={cn("relative flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-semibold", tab === x.id ? "text-brand-700" : "text-stone-500 hover:text-stone-800")}
          >
            <x.icon className="h-4 w-4" />
            {x.label}
            {x.count ? <span className="rounded-full bg-brand-600 px-1.5 text-[10px] text-white">{x.count}</span> : null}
            {tab === x.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand-600" />}
          </button>
        ))}
      </div>

      {tab === "destinations" && (
        <div className="mt-4 space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
              <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                {t("Status per listing and portal", "الحالة لكل إعلان وبوابة")} <StageBadge s="S1" />
              </h3>
              <div className="flex gap-1">
                <ReqTag id="HUB-07" />
                <ReqTag id="HUB-09" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-stone-50 text-xs text-stone-500">
                  <tr>
                    <th className="px-4 py-2 text-start font-medium">{t("AqarPro listing", "إعلان عقار برو")}</th>
                    {portals.map((pt) => (
                      <th key={pt.id} className="px-4 py-2 text-start font-medium">
                        <PortalChip portalId={pt.id} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {listingIds.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-stone-500">
                        {t("Nothing published yet — pick a listing below.", "لا يوجد نشر بعد — اختر إعلاناً بالأسفل.")}
                      </td>
                    </tr>
                  )}
                  {listingIds.map((lid) => {
                    const l = state.listings.find((x) => x.id === lid);
                    if (!l) return null;
                    const cover = l.media.find((m) => m.cat === "exterior") ?? l.media[0];
                    return (
                      <tr key={lid} className={cn("cursor-pointer hover:bg-stone-50", focus === lid && "bg-brand-50/50")} onClick={() => setFocus(lid)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-stone-100">
                              {cover && <Image src={cover.src} alt="" fill sizes="56px" className="object-cover" unoptimized={cover.src.startsWith("data:") || cover.src.endsWith(".svg")} />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-mono text-xs text-stone-500">
                                {l.id}
                                {scope === "admin" && ` · ${p(advertiserById(l.advertiserId).name)}`}
                              </div>
                              <div className="max-w-xs truncate font-medium text-stone-900">{p(l.title)}</div>
                            </div>
                          </div>
                        </td>
                        {portals.map((pt) => {
                          const c = cell(lid, pt.id);
                          const job = c && state.publishJobs.find((j) => j.portalListingId === c.id);
                          return (
                            <td key={pt.id} className="px-4 py-3 align-top">
                              {c ? (
                                <div className="space-y-1">
                                  <PlStatusBadge status={c.status} />
                                  <div className="font-mono text-[11px] text-stone-500">
                                    {c.externalId ?? t("no external ID", "بدون معرف خارجي")} · v{c.payloadVersion}
                                  </div>
                                  {c.lastSyncAt && mounted && (
                                    <div className="text-[11px] text-stone-400">
                                      {t("synced", "مزامنة")} {timeAgo(c.lastSyncAt, lang)}
                                    </div>
                                  )}
                                  {job && mounted && isInterrupted(job) ? (
                                    <div className="text-[11px] font-semibold text-orange-700">{t("Action: reconcile", "الإجراء: تسوية")}</div>
                                  ) : plStatus[c.status].action ? (
                                    <div className="text-[11px] font-semibold text-stone-700">→ {p(plStatus[c.status].action!)}</div>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-xs text-stone-400">{t("not published", "غير منشور")}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <label className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-stone-800">{t("Publish or manage a listing", "نشر أو إدارة إعلان")}</span>
              <select value={focus ?? ""} onChange={(e) => setFocus(e.target.value || undefined)} className="min-w-64 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
                <option value="">{t("Choose a listing…", "اختر إعلاناً…")}</option>
                {orgListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id} · {p(l.title)} ({l.status})
                  </option>
                ))}
              </select>
            </label>
          </Card>

          {focus && (
            <div className="space-y-4">
              <PublishPanel key={focus} listingId={focus} />
              <StageGate stage="S2" label={t("Lead retrieval from portals — Stage 2", "جلب العملاء من البوابات — المرحلة الثانية")}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                      {t("Inbound portal leads", "عملاء البوابات الواردون")} <StageBadge s="S2" />
                    </h3>
                    <ReqTag id="LED-05" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {pls.filter((x) => x.listingId === focus && x.status === "published").length === 0 && (
                      <span className="text-sm text-stone-500">{t("Publish the listing first.", "انشر الإعلان أولاً.")}</span>
                    )}
                    {pls
                      .filter((x) => x.listingId === focus && x.status === "published")
                      .map((x) => {
                        const supported = portalById(x.portalId).capabilities.includes("leads");
                        return (
                          <div key={x.id} className="flex items-center gap-3 rounded-lg border border-stone-200 px-3 py-2">
                            <PortalChip portalId={x.portalId} />
                            {supported ? (
                              <button onClick={() => void fetchLeads(x)} className={cn(btn.secondary, "px-3 py-1.5 text-xs")}>
                                <Download className="h-3.5 w-3.5" />
                                {t("Fetch leads", "جلب العملاء")}
                              </button>
                            ) : (
                              <span className="text-xs text-stone-400">{t("No lead API on this portal", "لا توجد واجهة عملاء لهذه البوابة")}</span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </Card>
              </StageGate>
            </div>
          )}
        </div>
      )}

      {tab === "jobs" && (
        <Card className="mt-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <h3 className="flex items-center gap-2 font-semibold text-stone-900">
              {t("Publishing job queue", "طابور مهام النشر")} <StageBadge s="S1" />
            </h3>
            <div className="flex gap-1">
              <ReqTag id="HUB-05" />
              <ReqTag id="HUB-07" />
              <ReqTag id="NFR-REL-01" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-stone-50 text-xs text-stone-500">
                <tr>
                  {[t("Job", "المهمة"), t("Listing", "الإعلان"), t("Portal", "البوابة"), t("Action", "الإجراء"), t("Status", "الحالة"), t("Attempts", "المحاولات"), t("Idempotency key", "مفتاح عدم التكرار"), ""].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-start font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                      {t("No jobs yet.", "لا توجد مهام بعد.")}
                    </td>
                  </tr>
                )}
                {jobs.map(jobRow)}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "connectors" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {portals.map((pt) => {
              const conns = connections.filter((c) => c.portalId === pt.id);
              return (
                <Card key={pt.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <PortalChip portalId={pt.id} />
                    <div className="flex items-center gap-2">
                      <Badge tone="blue" className="uppercase">
                        {pt.mode}
                      </Badge>
                      <ReqTag id="HUB-02" />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{p(pt.note)}</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <div className="font-semibold text-stone-500">{t("Capabilities", "القدرات")}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(["create", "update", "unpublish", "status", "leads"] as const).map((c) => (
                          <span key={c} className={cn("rounded px-1.5 py-0.5 font-mono", pt.capabilities.includes(c) ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-400 line-through")}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-stone-500">{t("Required fields", "الحقول المطلوبة")}</div>
                      <div className="mt-1 font-mono text-stone-700" dir="ltr">
                        {pt.requiredFields.join(", ")}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-stone-500">{t("Limits", "الحدود")}</div>
                      <div className="mt-1 text-stone-700">
                        {t("Title", "العنوان")} ≤ {pt.limits.titleMax} · {t("photos", "صور")} {pt.limits.minPhotos}–{pt.limits.maxPhotos} · {pt.limits.rateLimitPerMin}/min
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {conns.length === 0 && <div className="text-xs text-stone-400">{t("Not connected for this organisation.", "غير مرتبطة لهذه المؤسسة.")}</div>}
                    {conns.map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs">
                        <span className="flex items-center gap-2">
                          <PlugZap className={cn("h-4 w-4", c.status === "connected" ? "text-emerald-600" : "text-red-500")} />
                          <span className="font-semibold text-stone-800">{c.status}</span>
                          {scope === "admin" && <span className="text-stone-500">· {c.orgId}</span>}
                        </span>
                        <span className="font-mono text-stone-500" dir="ltr" title={t("Credentials are held in the vault; only a reference is stored (HUB-03)", "تُحفظ بيانات الاعتماد في الخزنة؛ يُخزن مرجع فقط")}>
                          {maskCredential(c.credentialRef)}
                        </span>
                        <button onClick={() => toast(t(`${p(pt.name)}: connection OK (mock ping 42 ms)`, `${p(pt.name)}: الاتصال سليم (اختبار 42 م.ث)`))} className="font-semibold text-brand-600 hover:underline">
                          {t("Test connection", "اختبار الاتصال")}
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
            <StageGate stage="S2" label={t("Live portal connector — Stage 2", "موصل بوابة حي — المرحلة الثانية")}>
              <Card className="border-violet-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                    {t("First live connector", "أول موصل حي")} <StageBadge s="S2" />
                  </h3>
                  <ReqTag id="HUB-12" />
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  {t(
                    "Conditional on authorised access from the target portal (decision D-09). Uses only an official API or an approved feed — never scraping. Until access is granted, the same connector contract runs against the sandbox.",
                    "مشروط بالحصول على وصول مصرح من البوابة المستهدفة (القرار D-09). يستخدم واجهة رسمية أو تغذية معتمدة فقط — دون أي استخلاص. حتى منح الوصول يعمل الموصل نفسه على البيئة التجريبية.",
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge tone="amber">{t("Access request: pending", "طلب الوصول: قيد الانتظار")}</Badge>
                  <Badge tone="stone">{t("Contract tests: passing on sandbox", "اختبارات العقد: ناجحة على البيئة التجريبية")}</Badge>
                </div>
              </Card>
            </StageGate>
          </div>
          <Card className="p-4">
            <h3 className="flex items-center gap-2 font-semibold text-stone-900">
              {t("Adding a new connector", "إضافة موصل جديد")} <ReqTag id="HUB-13" />
            </h3>
            <p className="mt-1 text-xs text-stone-500">{t("A new portal plugs in without touching the property model or other connectors.", "تُضاف أي بوابة جديدة دون تعديل نموذج العقار أو الموصلات الأخرى.")}</p>
            <ol className="mt-3 space-y-2 text-sm text-stone-700">
              {[
                t("Declare the portal in the capability registry (create / update / unpublish / status / leads).", "عرّف البوابة في سجل القدرات (إنشاء / تحديث / إلغاء نشر / حالة / عملاء)."),
                t("Write its mapping: canonical listing → portal payload, plus its required fields and limits.", "اكتب التحويل من السجل الأساسي إلى صيغة البوابة مع الحقول المطلوبة والحدود."),
                t("Implement the connector contract below; unsupported calls are simply not declared.", "نفّذ عقد الموصل أدناه؛ الاستدعاءات غير المدعومة لا تُعرّف."),
                t("Add mock scenarios: success, rejection, timeout, retry, duplicate.", "أضف سيناريوهات تجريبية: نجاح، رفض، انتهاء مهلة، إعادة، تكرار."),
                t("Store credentials in the vault and connect per organisation.", "خزّن بيانات الاعتماد في الخزنة واربطها لكل مؤسسة."),
              ].map((x, i) => (
                <li key={i} className="flex gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">{i + 1}</span>
                  {x}
                </li>
              ))}
            </ol>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-stone-950 p-3 text-[10.5px] leading-relaxed text-sky-200" dir="ltr">{`interface PortalConnector {
  id: string
  capabilities: Capability[]
  map(listing: Listing): Payload
  validate(listing: Listing): Issue[]
  create(p: Payload, key: IdemKey): Result
  update?(extId: string, p: Payload, key: IdemKey): Result
  unpublish?(extId: string): Result
  status?(key: IdemKey): Result
  fetchLeads?(since: Date): Lead[]
}`}</pre>
          </Card>
        </div>
      )}

      {tab === "health" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {portals.map((pt) => {
            const pj = jobs.filter((j) => j.portalId === pt.id);
            const done = pj.filter((j) => ["succeeded", "failed"].includes(j.status));
            const fails = pj.filter((j) => j.status === "failed").length;
            const timeouts = pj.reduce((n, j) => n + j.log.filter((x) => x.msg.startsWith("No response") || x.msg.startsWith("Feed upload timed out")).length, 0);
            const last = pj.find((j) => j.status === "succeeded");
            const healthy = fails === 0;
            return (
              <Card key={pt.id} className="p-4">
                <div className="flex items-center justify-between">
                  <PortalChip portalId={pt.id} />
                  <Badge tone={healthy ? "green" : "red"}>{healthy ? t("Healthy", "سليم") : t("Degraded", "متدهور")}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-stone-500">{t("Jobs (finished)", "المهام (المنتهية)")}</dt>
                  <dd className="font-semibold">{done.length}</dd>
                  <dt className="text-stone-500">{t("Failures", "الإخفاقات")}</dt>
                  <dd className="font-semibold">{fails}</dd>
                  <dt className="text-stone-500">{t("Timeouts (auto-retried)", "انتهاء المهلة (أعيدت تلقائياً)")}</dt>
                  <dd className="font-semibold">{timeouts}</dd>
                  <dt className="text-stone-500">{t("Last success", "آخر نجاح")}</dt>
                  <dd className="font-semibold">{last && mounted ? timeAgo(last.updatedAt, lang) : "—"}</dd>
                  <dt className="text-stone-500">{t("Rate limit", "حد المعدل")}</dt>
                  <dd className="font-semibold">
                    {pt.limits.rateLimitPerMin}/min · 2 {t("concurrent", "متزامنة")}
                  </dd>
                </dl>
              </Card>
            );
          })}
          <Card className="p-4 lg:col-span-2">
            <h3 className="flex items-center gap-2 font-semibold text-stone-900">
              {t("Alerts", "التنبيهات")} <ReqTag id="HUB-10" /> <ReqTag id="NFR-OBS-01" />
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {needsFix > 0 && <Alert tone="red" text={t(`${needsFix} destination(s) blocked by validation — a person must fix the canonical listing.`, `${needsFix} وجهة متوقفة بسبب التحقق — يجب تصحيح السجل الأساسي.`)} />}
              {interrupted.length > 0 && <Alert tone="orange" text={t(`${interrupted.length} job(s) in unknown state — reconcile before re-sending.`, `${interrupted.length} مهمة بحالة غير معروفة — قم بالتسوية قبل الإرسال مجدداً.`)} />}
              {failed && <Alert tone="red" text={t("Failed jobs need manual reprocessing (see Jobs).", "مهام فاشلة تحتاج إعادة معالجة يدوية (راجع المهام).")} />}
              {retries > 0 && <Alert tone="amber" text={t(`${retries} automatic retr${retries === 1 ? "y" : "ies"} so far — all reused their original idempotency key.`, `${retries} إعادة تلقائية حتى الآن — جميعها بنفس مفتاح عدم التكرار.`)} />}
              {!needsFix && !interrupted.length && !failed && <Alert tone="green" text={t("All connectors healthy. No action required.", "كل الموصلات سليمة. لا يلزم أي إجراء.")} />}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function Alert({ tone, text }: { tone: "red" | "orange" | "amber" | "green"; text: string }) {
  const cls = { red: "bg-red-50 text-red-800", orange: "bg-orange-50 text-orange-800", amber: "bg-amber-50 text-amber-800", green: "bg-emerald-50 text-emerald-800" }[tone];
  const Icon = tone === "green" ? CheckCircle2 : tone === "amber" ? RotateCw : tone === "orange" ? ShieldAlert : X;
  return (
    <li className={cn("flex items-center gap-2 rounded-lg px-3 py-2", cls)}>
      <Icon className="h-4 w-4 shrink-0" />
      {text}
    </li>
  );
}
