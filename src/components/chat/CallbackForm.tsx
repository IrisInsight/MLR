"use client";

import { useState, type FormEvent } from "react";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export interface CallbackItem {
  sku: string;
  name: string;
  qty: number;
  note?: string;
}

export function CallbackForm({ source = "callback", items, transcript, compact = false, title = "Request a call back", onDone }: { source?: "chat" | "quote" | "contact" | "callback"; items?: CallbackItem[]; transcript?: { role: string; text: string }[]; compact?: boolean; title?: string; onDone?: () => void }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      source,
      name: String(form.get("name") ?? ""),
      company: String(form.get("company") ?? "") || undefined,
      phone: String(form.get("phone") ?? "") || undefined,
      email: String(form.get("email") ?? "") || undefined,
      timeline: String(form.get("timeline") ?? "") || undefined,
      notes: String(form.get("notes") ?? "") || undefined,
      website: String(form.get("website") ?? ""),
      page: typeof window !== "undefined" ? window.location.pathname : undefined,
      items,
      transcript,
    };
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not send. Please call us.");
      setMode(data.mode);
      setState("done");
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="rounded-card border border-green/30 bg-green-soft p-4 text-green" role="status">
        <p className="font-display text-lg font-bold uppercase">Got it — we&apos;ll call you back.</p>
        <p className="mt-1 text-sm">
          A sales rep will reach out during business hours (Mon–Fri 7:30 AM–5 PM). Need it sooner? Call <a href={PHONE_HREF} className="font-semibold underline">{PHONE_DISPLAY}</a>.
        </p>
        {mode === "demo" && <p className="mt-2 text-xs text-green/80">Demo mode: this request was logged on the server but not stored. Connect a Vercel Blob store to save leads.</p>}
      </div>
    );
  }

  const field = "w-full rounded-md border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-steel";
  return (
    <form onSubmit={submit} className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
      <p className={`font-display text-lg font-bold uppercase ${compact ? "" : "sm:col-span-2"}`}>{title}</p>
      <input name="name" required placeholder="Your name *" className={field} autoComplete="name" />
      <input name="company" placeholder="Company" className={field} autoComplete="organization" />
      <input name="phone" type="tel" placeholder="Phone *" className={field} autoComplete="tel" />
      <input name="email" type="email" placeholder="Email" className={field} autoComplete="email" />
      <input name="timeline" placeholder="When do you need it? (e.g. this week)" className={`${field} ${compact ? "" : "sm:col-span-2"}`} />
      <textarea name="notes" rows={compact ? 2 : 3} placeholder="What are you looking for? Quantities, sizes, anything helpful." className={`${field} ${compact ? "" : "sm:col-span-2"}`} />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {items && items.length > 0 && (
        <p className={`text-xs text-ink-muted ${compact ? "" : "sm:col-span-2"}`}>
          Includes {items.length} quote item{items.length === 1 ? "" : "s"}: {items.map((i) => `${i.qty} × ${i.sku}`).join(", ")}
        </p>
      )}
      {error && <p className={`text-sm text-red ${compact ? "" : "sm:col-span-2"}`}>{error}</p>}
      <div className={`flex flex-wrap items-center gap-3 ${compact ? "" : "sm:col-span-2"}`}>
        <button type="submit" disabled={state === "sending"} className="btn-primary disabled:opacity-60">
          {state === "sending" ? "Sending…" : "Request call back"}
        </button>
        <a href={PHONE_HREF} className="text-sm font-semibold text-steel underline underline-offset-2">
          or call {PHONE_DISPLAY}
        </a>
      </div>
    </form>
  );
}
