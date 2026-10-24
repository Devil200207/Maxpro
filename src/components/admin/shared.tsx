"use client";

import type { ReactNode } from "react";

export function SectionHead({ title, desc, req, actions }: { title: string; desc?: string; req?: string[]; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-stone-900">{title}</h2>
          {req?.map((r) => (
            <span key={r} className="rounded border border-dashed border-stone-300 px-1.5 py-px font-mono text-[10px] text-stone-500">
              {r}
            </span>
          ))}
        </div>
        {desc && <p className="mt-1 max-w-3xl text-sm text-stone-500">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
