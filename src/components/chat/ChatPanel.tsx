"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Markdown } from "./Markdown";
import { ProductRail } from "./ProductCard";
import { CallbackForm } from "./CallbackForm";
import type { AddToQuoteOutput, CallbackOutput, ComplementaryOutput, ProductOutput, SearchOutput } from "./types";
import { useQuote } from "@/components/quote/QuoteProvider";
import { PHONE_DISPLAY, PHONE_HREF, type AskEventDetail } from "@/lib/site";

export interface ChatContextInfo {
  productId?: string;
  productName?: string;
  productSku?: string;
  page?: string;
}

const SUGGESTIONS = ["Do you have white gloves?", "I need to wrap 20 pallets a day", "What strapping should I use for lumber?", "Which tape for heavy boxes?"];

function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

/** Applies add_to_quote tool results to the local quote list exactly once per tool call. */
function QuoteEffect({ toolCallId, output }: { toolCallId: string; output: AddToQuoteOutput }) {
  const { add } = useQuote();
  useEffect(() => {
    if (!output.ok || !output.item) return;
    try {
      const key = "mlr-quote-applied";
      const applied: string[] = JSON.parse(sessionStorage.getItem(key) ?? "[]");
      if (applied.includes(toolCallId)) return;
      applied.push(toolCallId);
      sessionStorage.setItem(key, JSON.stringify(applied.slice(-200)));
    } catch {
      /* ignore */
    }
    add({ ...output.item });
  }, [toolCallId, output, add]);
  return (
    <p className={`my-1.5 rounded-md px-3 py-2 text-sm ${output.ok ? "bg-green-soft text-green" : "bg-red-soft text-red"}`}>
      {output.ok ? `✓ ${output.message}` : output.error}
      {output.ok && (
        <a href="/quote" className="ml-2 font-semibold underline underline-offset-2">
          View quote
        </a>
      )}
    </p>
  );
}

export function ChatPanel({ context, pending, onPendingConsumed, embedded = false, autoFocus = false, className = "" }: { context?: ChatContextInfo; pending?: AskEventDetail | null; onPendingConsumed?: () => void; embedded?: boolean; autoFocus?: boolean; className?: string }) {
  const [ctx, setCtx] = useState<ChatContextInfo>(context ?? {});
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ context: { ...ctxRef.current, page: typeof window !== "undefined" ? window.location.pathname : undefined } }),
      }),
    [],
  );
  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({ transport });
  const [input, setInput] = useState("");
  const [showCallback, setShowCallback] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";

  const send = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      void sendMessage({ text: t });
      setInput("");
    },
    [busy, sendMessage],
  );

  // messages pushed from elsewhere on the page (search bar, "Ask about this product")
  useEffect(() => {
    if (!pending) return;
    if (pending.product) setCtx((c) => ({ ...c, productId: pending.product!.id, productName: pending.product!.name, productSku: pending.product!.sku }));
    if (pending.message) {
      if (pending.send) {
        // let the context update flush before sending
        setTimeout(() => send(pending.message!), 0);
      } else setInput(pending.message);
    }
    onPendingConsumed?.();
  }, [pending, onPendingConsumed, send]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const transcript = messages.map((m) => ({ role: m.role, text: textOf(m) })).filter((m) => m.text);

  return (
    <div className={`flex h-full min-h-0 flex-col bg-paper ${className}`}>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="animate-rise">
            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-[15px] shadow-card">
              <p className="font-display text-lg font-bold uppercase">Hi, I&apos;m Ask MLR.</p>
              <p className="mt-1 text-ink-soft">
                Tell me what you&apos;re packing, wrapping, or cleaning and I&apos;ll pull the right items from our catalog — gauges, sizes, and what goes with them. Pricing and availability are confirmed by a real person at {PHONE_DISPLAY}.
              </p>
              {ctx.productName && <p className="mt-2 rounded-md bg-sky-soft px-3 py-1.5 text-sm text-steel">Talking about: {ctx.productName}</p>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink-soft hover:border-ink">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`my-2 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-[15px] text-white" : "w-full max-w-full"}>
              {m.role === "user"
                ? textOf(m)
                : m.parts.map((part, i) => {
                    if (part.type === "text") {
                      return part.text.trim() ? (
                        <div key={i} className="mb-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-[15px] shadow-card">
                          <Markdown text={part.text} />
                        </div>
                      ) : null;
                    }
                    if (isToolUIPart(part)) {
                      const name = getToolName(part);
                      if (part.state === "input-streaming" || part.state === "input-available") {
                        const label = name === "search_products" ? "Searching the catalog…" : name === "get_complementary" ? "Checking what goes with it…" : name === "request_callback" ? "Filing your call-back request…" : name === "add_to_quote" ? "Adding to your quote…" : "Looking that up…";
                        return (
                          <p key={i} className="my-1 flex items-center gap-2 text-xs text-ink-muted">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-red" /> {label}
                          </p>
                        );
                      }
                      if (part.state === "output-error") {
                        return (
                          <p key={i} className="my-1 text-xs text-red">
                            That lookup failed — try again or call {PHONE_DISPLAY}.
                          </p>
                        );
                      }
                      if (part.state !== "output-available") return null;
                      const out = part.output as unknown;
                      if (name === "search_products") {
                        const o = out as SearchOutput;
                        return <ProductRail key={i} products={o.products} title={o.count ? `${o.count} match${o.count === 1 ? "" : "es"} for “${o.query}”` : undefined} />;
                      }
                      if (name === "get_product") {
                        const o = out as ProductOutput;
                        return o.found && o.product ? <ProductRail key={i} products={[o.product]} /> : null;
                      }
                      if (name === "get_complementary") {
                        const o = out as ComplementaryOutput;
                        return <ProductRail key={i} products={o.products} title={o.for ? `Customers also buy with ${o.for.sku}` : "Customers also buy"} />;
                      }
                      if (name === "add_to_quote") return <QuoteEffect key={part.toolCallId} toolCallId={part.toolCallId} output={out as AddToQuoteOutput} />;
                      if (name === "request_callback") {
                        const o = out as CallbackOutput;
                        return (
                          <p key={i} className={`my-1.5 rounded-md px-3 py-2 text-sm ${o.ok ? "bg-green-soft text-green" : "bg-red-soft text-red"}`}>
                            {o.ok ? `✓ ${o.message}` : o.error}
                          </p>
                        );
                      }
                    }
                    return null;
                  })}
            </div>
          </div>
        ))}

        {busy && messages[messages.length - 1]?.role === "user" && (
          <p className="my-2 flex items-center gap-2 text-sm text-ink-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red" /> Thinking…
          </p>
        )}

        {error && (
          <div className="my-2 rounded-card border border-red/30 bg-white p-4 shadow-card animate-rise" role="alert">
            <p className="font-display text-lg font-bold uppercase">The assistant is offline for a moment.</p>
            <p className="mt-1 text-sm text-ink-soft">No problem — a real person can help right now.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={PHONE_HREF} className="btn-primary btn-sm">
                Tap to call {PHONE_DISPLAY}
              </a>
              <button type="button" className="btn-outline btn-sm" onClick={() => setShowCallback((v) => !v)}>
                Request a call back
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  clearError();
                }}
              >
                Try again
              </button>
            </div>
            {showCallback && (
              <div className="mt-4">
                <CallbackForm compact source="chat" transcript={transcript} />
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-line bg-white p-2 sm:p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            maxLength={1500}
            placeholder="Ask about products, sizes, delivery…"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-md border border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-steel"
            aria-label="Message Ask MLR"
          />
          {busy ? (
            <button type="button" onClick={stop} className="btn-outline h-11 px-4">
              Stop
            </button>
          ) : (
            <button type="submit" className="btn-primary h-11 px-4" disabled={!input.trim()}>
              Send
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-muted">
          <span>AI assistant — pricing &amp; stock confirmed by a human.</span>
          <span className="flex gap-2">
            {messages.length > 0 && (
              <button type="button" className="underline" onClick={() => setMessages([])}>
                New chat
              </button>
            )}
            {!embedded && (
              <a href={PHONE_HREF} className="underline">
                {PHONE_DISPLAY}
              </a>
            )}
          </span>
        </div>
      </form>
    </div>
  );
}
