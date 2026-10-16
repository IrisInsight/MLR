export function ConceptBanner() {
  return (
    <div className="relative z-50 bg-ink text-white">
      <div className="container-x flex items-center justify-center gap-3 py-1 text-center text-[12px] font-medium tracking-wide sm:text-[13px]">
        <span className="hidden h-2 w-6 rounded-sm stripe sm:inline-block" aria-hidden="true" />
        <span className="truncate">
          <span className="font-display uppercase tracking-wider text-safety">Concept preview</span> — not the live MLR Packaging site.
          <a href="https://www.mlrpackaging.com" className="ml-2 underline decoration-white/40 underline-offset-2 hover:decoration-white" target="_blank" rel="noopener noreferrer">
            Live site ↗
          </a>
        </span>
        <span className="hidden h-2 w-6 rounded-sm stripe sm:inline-block" aria-hidden="true" />
      </div>
    </div>
  );
}
