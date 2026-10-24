import type { ReactNode } from "react";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none transition",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50 disabled:pointer-events-none transition",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 transition",
  wa: "inline-flex items-center justify-center gap-2 rounded-lg bg-wa-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-wa-600 transition",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition",
};

export const input =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-stone-200 bg-white shadow-sm", className)}>{children}</div>;
}

const tones = {
  stone: "bg-stone-100 text-stone-700",
  brand: "bg-brand-50 text-brand-700",
  gold: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  wa: "bg-wa-500/10 text-wa-700",
  solid: "bg-brand-600 text-white",
  premium: "bg-amber-400 text-amber-950",
  white: "bg-white/90 text-stone-800",
  none: "",
};

export function Badge({ children, tone = "stone", className }: { children: ReactNode; tone?: keyof typeof tones; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-xs font-medium text-stone-500">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-stone-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-stone-500">{hint}</div>}
    </Card>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Small tag that maps a UI element to its requirement ID — handy during the pitch. */
export function ReqTag({ id, className }: { id: string; className?: string }) {
  return (
    <span
      title="Requirement ID from MPT-PRJ-REQ-003"
      className={cn("inline-flex items-center rounded border border-dashed border-stone-300 px-1.5 py-px font-mono text-[10px] font-medium text-stone-500", className)}
    >
      {id}
    </span>
  );
}
