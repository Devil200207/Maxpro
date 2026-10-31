"use client";

import { Lock } from "lucide-react";
import { useStore } from "./store";
import { useLang } from "./useLang";
import { cn } from "@/components/ui";

/**
 * Delivery stages from AQP-REQ-001 §1: S0 Discovery & audit, S1 revenue-ready website,
 * S2 messaging, agents and live connectors. The header switch lets a demo show
 * "what Stage 1 delivers" on its own, or everything.
 */
export type Stage = "S0" | "S1" | "S2";

export function useStage() {
  const { state, update } = useStore();
  const view = state.stage ?? "all";
  return {
    view,
    setView: (v: "s1" | "all") => update((s) => ({ ...s, stage: v })),
    /** True when a feature of this stage should be visible in the current view. */
    visible: (stage: Stage) => view === "all" || stage !== "S2",
  };
}

const badge: Record<Stage, string> = {
  S0: "bg-slate-100 text-slate-700 ring-slate-300",
  S1: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  S2: "bg-violet-50 text-violet-700 ring-violet-200",
};

/** Small "S1" / "S2" pill showing which delivery stage a feature belongs to. */
export function StageBadge({ s, className }: { s: Stage; className?: string }) {
  return (
    <span
      title={s === "S0" ? "Stage 0 — discovery & audit" : s === "S1" ? "Stage 1 — revenue-ready website" : "Stage 2 — messaging, agents & live connectors"}
      className={cn("inline-flex items-center rounded px-1.5 py-px text-[10px] font-bold ring-1 ring-inset", badge[s], className)}
    >
      {s}
    </span>
  );
}

/**
 * Hides Stage-2 content when the demo is in "Stage 1 only" view.
 * mode="card" shows a locked placeholder, "hide" renders nothing.
 */
export function StageGate({
  stage,
  children,
  mode = "card",
  label,
  className,
}: {
  stage: Stage;
  children: React.ReactNode;
  mode?: "card" | "hide";
  label?: string;
  className?: string;
}) {
  const { visible, setView } = useStage();
  const { t } = useLang();
  if (visible(stage)) return <>{children}</>;
  if (mode === "hide") return null;
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-6 text-center", className)}>
      <Lock className="h-5 w-5 text-violet-500" />
      <div className="text-sm font-semibold text-violet-900">
        {label ?? t("Delivered in Stage 2", "يُسلَّم في المرحلة الثانية")}
      </div>
      <p className="max-w-sm text-xs text-violet-700">
        {t("You are viewing the Stage 1 scope. Switch the header to “S1 + S2” to preview this feature.", "أنت تعرض نطاق المرحلة الأولى. بدّل إلى «S1 + S2» في الأعلى لمعاينة هذه الميزة.")}
      </p>
      <button onClick={() => setView("all")} className="mt-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
        {t("Show Stage 2", "عرض المرحلة الثانية")}
      </button>
    </div>
  );
}

/** Header control: S1 only ↔ S1 + S2. */
export function StageSwitch() {
  const { view, setView } = useStage();
  const { t } = useLang();
  return (
    <div className="hidden items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 p-0.5 text-xs font-semibold md:flex" title={t("Choose which delivery stage to demo", "اختر المرحلة المعروضة")}>
      <button onClick={() => setView("s1")} className={cn("rounded-md px-2 py-1", view === "s1" ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-800")}>
        S1
      </button>
      <button onClick={() => setView("all")} className={cn("rounded-md px-2 py-1", view === "all" ? "bg-white text-violet-700 shadow-sm" : "text-stone-500 hover:text-stone-800")}>
        S1 + S2
      </button>
    </div>
  );
}
