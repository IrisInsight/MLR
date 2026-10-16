import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PHONE_DISPLAY } from "@/lib/site";

export const metadata: Metadata = { title: "Ask MLR", robots: { index: false, follow: false } };

/** Bare chat panel rendered inside the iframe created by /embed.js on third-party sites. */
export default function EmbedPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
      <header className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red font-display text-xs font-bold">MLR</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold uppercase leading-none">Ask MLR</p>
          <p className="text-[11px] text-white/70">AI sales assistant · humans at {PHONE_DISPLAY}</p>
        </div>
        <button type="button" className="rounded-md px-2 py-1 text-lg leading-none hover:bg-white/10" aria-label="Close chat" data-embed-close>
          ✕
        </button>
      </header>
      <ChatPanel embedded autoFocus className="flex-1" />
      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelector('[data-embed-close]').addEventListener('click',function(){parent.postMessage({type:'askmlr:close'},'*')});`,
        }}
      />
    </div>
  );
}
