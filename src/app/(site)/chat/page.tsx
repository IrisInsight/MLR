import type { Metadata } from "next";
import Link from "next/link";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export const metadata: Metadata = { title: "Ask MLR", robots: { index: false, follow: false } };

export default function ChatPage() {
  return (
    <div className="container-x py-4 md:py-6">
      <div className="mx-auto flex h-[calc(100dvh-220px)] min-h-[520px] max-w-3xl flex-col overflow-hidden rounded-2xl border border-line shadow-float">
        <header className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red font-display text-sm font-bold">MLR</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold uppercase leading-none">Ask MLR</p>
            <p className="text-xs text-white/70">AI sales assistant · a real person answers {PHONE_DISPLAY}</p>
          </div>
          <a href={PHONE_HREF} className="btn-primary btn-sm hidden sm:inline-flex">
            Call
          </a>
          <Link href="/" className="text-xs text-white/70 underline hover:text-white">
            Back to site
          </Link>
        </header>
        <ChatPanel autoFocus className="flex-1" />
      </div>
    </div>
  );
}
