"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChatPanel } from "./ChatPanel";
import { ASK_EVENT, type AskEventDetail } from "@/lib/site";

/** Floating "Ask MLR" bubble + panel, mounted on every page. */
export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<AskEventDetail | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onAsk = (e: Event) => {
      const detail = (e as CustomEvent<AskEventDetail>).detail ?? {};
      setPending(detail);
      setOpen(true);
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const consume = useCallback(() => setPending(null), []);

  // Hidden on routes that render the panel full-screen themselves.
  if (!mounted || pathname === "/chat" || pathname.startsWith("/embed") || pathname.startsWith("/admin")) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-end bg-ink/40 p-0 sm:items-end sm:p-5" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <section className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-paper shadow-float animate-rise sm:h-[min(720px,88vh)] sm:w-[420px] sm:rounded-2xl" role="dialog" aria-modal="true" aria-label="Ask MLR">
            <header className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red font-display text-sm font-bold">MLR</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold uppercase leading-none">Ask MLR</p>
                <p className="text-xs text-white/70">AI sales assistant · humans at (714) 738-0031</p>
              </div>
              <a href="/chat" className="hidden text-xs text-white/70 underline hover:text-white sm:block" title="Open full screen">
                Full screen
              </a>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-xl leading-none hover:bg-white/10" aria-label="Close chat">
                ✕
              </button>
            </header>
            <ChatPanel pending={pending} onPendingConsumed={consume} autoFocus className="flex-1" />
          </section>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-red py-3 pl-4 pr-5 font-display text-base font-bold uppercase tracking-wide text-white shadow-float hover:bg-red-deep md:bottom-6 md:right-6 ${open ? "hidden" : "pulse-ring"}`}
        aria-label="Open Ask MLR chat"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Ask MLR
      </button>
    </>
  );
}
