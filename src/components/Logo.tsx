export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#8a1538" />
        <path d="M7 23V11l5 6 4-6 4 6 5-6v12" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="25" cy="8" r="2.2" fill="#d4b26a" />
      </svg>
      <span className="text-lg font-extrabold tracking-tight text-stone-900">
        Max<span className="text-brand-600">Pro</span>
      </span>
    </span>
  );
}
