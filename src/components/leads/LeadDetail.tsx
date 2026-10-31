"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, GitMerge, MessageSquare, Phone, StickyNote, X } from "lucide-react";
import { advertiserById } from "@/lib/data";
import { gregorian, priceLabel, timeAgo } from "@/lib/format";
import { findDuplicate, leadSourceOf, pickAssignee } from "@/lib/leads";
import { StageBadge } from "@/lib/stage";
import { uid, useStore, type ChatMsg, type Lead } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { toast } from "../Toaster";
import { Badge, btn, cn, input, ReqTag } from "../ui";
import { LeadAiPanel } from "./LeadAiPanel";
import { statusName } from "./LeadReports";
import { sourceMeta } from "./sources";

const PIPELINE: Lead["status"][] = ["new", "contacted", "viewing", "closed"];
const digits = (p?: string) => (p ?? "").replace(/\D/g, "").slice(-8);

export function LeadDetail({ lead, now, canEdit, canAssign, onClose }: { lead: Lead; now: number | null; canEdit: boolean; canAssign: boolean; onClose: () => void }) {
  const { lang, t, p, href } = useLang();
  const { state, update } = useStore();
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const orgId = advertiserById(lead.advertiserId).orgId;
  const team = state.team.filter((m) => m.orgId === orgId);
  const me = state.team.find((m) => m.id === state.session.memberId)?.name ?? "Agent";
  const listing = lead.listingId ? state.listings.find((l) => l.id === lead.listingId) : undefined;
  const dup = findDuplicate(state.leads, lead);
  const merged = state.leads.filter((l) => l.duplicateOf === lead.id);
  const src = sourceMeta[leadSourceOf(lead)];
  const consent = lead.phone ? state.consents.find((c) => digits(c.subject) === digits(lead.phone)) : undefined;
  const convs = state.conversations.filter(
    (c) => (lead.phone && digits(c.customer.phone) === digits(lead.phone)) || (c.listingId && c.listingId === lead.listingId && c.customer.name === lead.name),
  );

  /** Patch this lead; the first human action stamps firstResponseAt (LED-06 response time). */
  const patch = (fn: (l: Lead) => Lead, action: string, detail?: string, respond = true) => {
    const at = new Date().toISOString();
    update((s) => ({
      ...s,
      leads: s.leads.map((l) => (l.id === lead.id ? { ...fn(l), firstResponseAt: l.firstResponseAt ?? (respond ? at : undefined) } : l)),
      audit: [{ id: uid("A"), at, actor: me, role: "advertiser", action, target: lead.id, detail }, ...s.audit],
    }));
  };

  const setStatus = (status: Lead["status"], outcome?: Lead["outcome"]) => patch((l) => ({ ...l, status, outcome: status === "closed" ? outcome : undefined }), "lead.status", `${status}${outcome ? `:${outcome}` : ""}`);

  const addNote = () => {
    if (!note.trim()) return;
    patch((l) => ({ ...l, notes: [...(l.notes ?? []), { id: uid("N"), at: new Date().toISOString(), by: me, text: note.trim() }] }), "lead.note");
    setNote("");
  };

  const addTask = () => {
    if (!taskTitle.trim() || !taskDue) return;
    patch((l) => ({ ...l, tasks: [...(l.tasks ?? []), { id: uid("T"), title: taskTitle.trim(), due: new Date(taskDue).toISOString(), done: false }] }), "lead.task_added", taskTitle, false);
    setTaskTitle("");
    setTaskDue("");
  };

  const toggleTask = (id: string) => patch((l) => ({ ...l, tasks: (l.tasks ?? []).map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }), "lead.task_toggled", id);

  const assign = (memberId: string) => patch((l) => ({ ...l, assignee: memberId || undefined }), "lead.assigned", memberId || "unassigned", false);

  const autoAssign = () => {
    const a = pickAssignee(state, lead.advertiserId, lead.listingId);
    if (!a) return toast(t("No active agents to assign", "لا يوجد وكلاء نشطون للإسناد"));
    assign(a);
    toast(t(`Assigned to ${team.find((m) => m.id === a)?.name}`, `أُسند إلى ${team.find((m) => m.id === a)?.name}`));
  };

  /** LED-03 manual merge: the other record folds into this one and is kept for audit. */
  const merge = () => {
    if (!dup) return;
    const at = new Date().toISOString();
    update((s) => ({
      ...s,
      leads: s.leads.map((l) => {
        if (l.id === dup.id) return { ...l, duplicateOf: lead.id };
        if (l.id === lead.id)
          return {
            ...l,
            score: Math.max(l.score ?? 0, dup.score ?? 0),
            assignee: l.assignee ?? dup.assignee,
            tasks: [...(l.tasks ?? []), ...(dup.tasks ?? [])],
            notes: [...(l.notes ?? []), ...(dup.notes ?? []), { id: uid("N"), at, by: me, text: `Merged duplicate ${dup.id} (${dup.channel}): ${dup.message.slice(0, 120)}` }],
          };
        return l;
      }),
      audit: [{ id: uid("A"), at, actor: me, role: "advertiser", action: "lead.merged", target: lead.id, detail: `merged=${dup.id}` }, ...s.audit],
    }));
    toast(t(`Merged ${dup.id} into ${lead.id}`, `تم دمج ${dup.id} في ${lead.id}`));
  };

  const timeline: { at: string; icon: typeof Circle; text: string; tone?: string }[] = [
    { at: lead.createdAt, icon: src.icon, text: `${t("Enquiry", "الاستفسار")} · ${lead.source ?? p(src.name)}: ${lead.message}` },
    ...(lead.notes ?? []).map((n) => ({ at: n.at, icon: StickyNote, text: `${n.by}: ${n.text}`, tone: "text-amber-700" })),
    ...convs.flatMap((c) =>
      c.messages.slice(-6).map((m: ChatMsg) => ({ at: m.at, icon: MessageSquare, text: `${c.id} · ${m.from}: ${m.text}`, tone: m.from === "note" ? "text-amber-700" : "text-stone-600" })),
    ),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-stone-100 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold text-stone-900">{lead.name}</h3>
            <span className="font-mono text-xs text-stone-400">{lead.id}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
            {lead.phone && (
              <span className="flex items-center gap-1" dir="ltr">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", src.cls)}>
              <src.icon className="h-3 w-3" />
              {p(src.name)}
            </span>
            {consent && <Badge tone={consent.optedIn ? "green" : "red"}>{consent.optedIn ? t("WhatsApp opt-in", "موافقة واتساب") : t("Opted out", "ألغى الاشتراك")}</Badge>}
            {lead.score !== undefined && <Badge tone={lead.score >= 80 ? "green" : lead.score >= 60 ? "amber" : "stone"}>{t(`Score ${lead.score}`, `التقييم ${lead.score}`)}</Badge>}
          </div>
          {lead.source && <div className="mt-1 text-[11px] text-stone-400">{t("Source attribution:", "مصدر العميل:")} {lead.source}</div>}
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100" aria-label={t("Close", "إغلاق")}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {dup && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              {t(`Possible duplicate of ${dup.id} (${dup.name}, ${dup.channel}) — same phone or same person on this listing.`, `احتمال تكرار مع ${dup.id} (${dup.name}) — نفس الهاتف أو نفس الشخص على هذا الإعلان.`)}
              <ReqTag id="LED-03" className="ms-1" />
            </span>
            {canEdit && (
              <button onClick={merge} className={cn(btn.secondary, "px-2.5 py-1 text-xs")}>
                <GitMerge className="h-3.5 w-3.5" /> {t("Merge", "دمج")}
              </button>
            )}
          </div>
        )}
        {merged.length > 0 && <div className="text-[11px] text-stone-400">{t(`Includes ${merged.length} merged record(s): ${merged.map((m) => m.id).join(", ")}`, `يشمل ${merged.length} سجل مدمج: ${merged.map((m) => m.id).join("، ")}`)}</div>}

        {listing && (
          <Link href={href(`/listing/${listing.id}`)} className="flex items-center gap-3 rounded-xl border border-stone-200 p-2 hover:bg-stone-50">
            <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg">
              <Image src={listing.media[0].src} alt="" fill sizes="64px" className="object-cover" unoptimized={listing.media[0].src.startsWith("data:")} />
            </span>
            <span className="min-w-0 text-xs">
              <span className="block font-mono text-stone-400">{listing.id}</span>
              <span className="line-clamp-1 font-medium text-stone-800">{p(listing.title)}</span>
              <span className="text-stone-500">{priceLabel(listing.price, listing.purpose, lang)}</span>
            </span>
          </Link>
        )}

        {/* Pipeline */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-stone-500">
            {t("Status", "الحالة")} <StageBadge s="S1" /> <ReqTag id="LED-02" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PIPELINE.filter((s) => s !== "closed").map((s) => (
              <button
                key={s}
                disabled={!canEdit}
                onClick={() => setStatus(s)}
                className={cn("rounded-full px-3 py-1 text-xs font-semibold", lead.status === s ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:hover:bg-stone-100")}
              >
                {statusName(s, t)}
              </button>
            ))}
            <button disabled={!canEdit} onClick={() => setStatus("closed", "won")} className={cn("rounded-full px-3 py-1 text-xs font-semibold", lead.outcome === "won" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}>
              {t("Closed · won", "مغلق · مكسوب")}
            </button>
            <button disabled={!canEdit} onClick={() => setStatus("closed", "lost")} className={cn("rounded-full px-3 py-1 text-xs font-semibold", lead.outcome === "lost" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100")}>
              {t("Closed · lost", "مغلق · مفقود")}
            </button>
          </div>
          <div className="mt-2 text-[11px] text-stone-400">
            {t("Received", "وصل")} {gregorian(lead.createdAt, lang)}
            {lead.firstResponseAt
              ? ` · ${t("first response after", "أول رد بعد")} ${Math.max(0, Math.round((new Date(lead.firstResponseAt).getTime() - new Date(lead.createdAt).getTime()) / 60000))} ${t("min", "د")}`
              : ` · ${t("no response yet", "لا يوجد رد بعد")}`}
          </div>
        </section>

        {/* Assignment */}
        <section>
          <div className="mb-1.5 text-xs font-semibold text-stone-500">{t("Assigned to", "مسند إلى")}</div>
          <div className="flex gap-2">
            <select disabled={!canAssign} value={lead.assignee ?? ""} onChange={(e) => assign(e.target.value)} className={cn(input, "py-2")}>
              <option value="">{t("Unassigned", "غير مسند")}</option>
              {team
                .filter((m) => m.role !== "readonly")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.role}
                  </option>
                ))}
            </select>
            {canAssign && (
              <button onClick={autoAssign} className={cn(btn.secondary, "shrink-0 px-3 py-2 text-xs")}>
                {t("Auto-assign", "إسناد تلقائي")}
              </button>
            )}
          </div>
        </section>

        {/* Tasks */}
        <section>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-stone-500">
            <CalendarClock className="h-3.5 w-3.5" />
            {t("Follow-up tasks", "مهام المتابعة")}
          </div>
          <div className="space-y-1.5">
            {(lead.tasks ?? []).length === 0 && <div className="text-xs text-stone-400">{t("No tasks yet.", "لا توجد مهام.")}</div>}
            {(lead.tasks ?? []).map((tk) => {
              const overdue = !tk.done && now !== null && new Date(tk.due).getTime() < now;
              return (
                <button
                  key={tk.id}
                  disabled={!canEdit}
                  onClick={() => toggleTask(tk.id)}
                  className={cn("flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-start text-xs", overdue ? "border-red-200 bg-red-50" : "border-stone-200")}
                >
                  {tk.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-stone-400" />}
                  <span className={cn("flex-1", tk.done && "text-stone-400 line-through")}>{tk.title}</span>
                  <span className={cn("shrink-0", overdue ? "font-semibold text-red-600" : "text-stone-400")}>
                    {overdue ? t("Overdue · ", "متأخرة · ") : ""}
                    {now !== null ? timeAgo(tk.due, lang) : gregorian(tk.due, lang)}
                  </span>
                </button>
              );
            })}
          </div>
          {canEdit && (
            <div className="mt-2 flex gap-1.5">
              <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder={t("New task…", "مهمة جديدة…")} className={cn(input, "py-1.5 text-xs")} />
              <input type="datetime-local" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className={cn(input, "w-44 shrink-0 py-1.5 text-xs")} />
              <button onClick={addTask} className={cn(btn.secondary, "shrink-0 px-2.5 py-1.5 text-xs")}>
                {t("Add", "إضافة")}
              </button>
            </div>
          )}
        </section>

        <LeadAiPanel lead={lead} canEdit={canEdit} onResponded={() => undefined} />

        {/* Notes */}
        {canEdit && (
          <section>
            <div className="mb-1.5 text-xs font-semibold text-stone-500">{t("Add note", "إضافة ملاحظة")}</div>
            <div className="flex gap-1.5">
              <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder={t("Called, sent brochure…", "تم الاتصال، أُرسل الكتيب…")} className={cn(input, "py-1.5 text-xs")} />
              <button onClick={addNote} className={cn(btn.primary, "shrink-0 px-3 py-1.5 text-xs")}>
                {t("Save", "حفظ")}
              </button>
            </div>
          </section>
        )}

        {/* Timeline */}
        <section>
          <div className="mb-2 text-xs font-semibold text-stone-500">{t("Timeline", "السجل الزمني")}</div>
          <ol className="space-y-2 border-s border-stone-200 ps-3">
            {timeline.map((e, i) => (
              <li key={i} className="relative text-xs">
                <span className="absolute -start-[19px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-white ring-1 ring-stone-200">
                  <e.icon className="h-2.5 w-2.5 text-stone-500" />
                </span>
                <div className={cn("leading-snug", e.tone ?? "text-stone-700")}>{e.text}</div>
                <div className="text-[10px] text-stone-400">{now !== null ? timeAgo(e.at, lang) : gregorian(e.at, lang)}</div>
              </li>
            ))}
          </ol>
          {convs.length > 0 && (
            <Link href={href(`/inbox?c=${convs[0].id}`)} className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline">
              {t("Open conversation in support inbox →", "فتح المحادثة في صندوق الدعم ←")}
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
