"use client";

import Link from "next/link";
import { PHONE_HREF, openAskMLR } from "@/lib/site";
import { useQuote } from "@/components/quote/QuoteProvider";

export function MobileCallBar() {
  const { count } = useQuote();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <a href={PHONE_HREF} className="flex flex-col items-center justify-center gap-0.5 bg-red py-2.5 text-white">
        <PhoneIcon />
        <span className="font-display text-xs font-semibold uppercase tracking-wider">Tap to call</span>
      </a>
      <button type="button" onClick={() => openAskMLR()} className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-ink">
        <ChatIcon />
        <span className="font-display text-xs font-semibold uppercase tracking-wider">Ask MLR</span>
      </button>
      <Link href="/quote" className="relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-ink">
        <QuoteIcon />
        <span className="font-display text-xs font-semibold uppercase tracking-wider">Quote</span>
        {count > 0 && <span className="absolute right-6 top-1.5 rounded-full bg-red px-1.5 text-[10px] font-bold text-white">{count}</span>}
      </Link>
    </div>
  );
}

export function PhoneIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
export function ChatIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
export function QuoteIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}
