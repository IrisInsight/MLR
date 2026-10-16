"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useQuote } from "./QuoteProvider";
import { AskMLRButton } from "@/components/chat/AskButtons";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export function QuotePageClient() {
  const { items, update, remove, clear, hydrated } = useQuote();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "quote",
          name: form.get("name"),
          company: form.get("company") || undefined,
          phone: form.get("phone") || undefined,
          email: form.get("email") || undefined,
          timeline: form.get("timeline") || undefined,
          notes: form.get("notes") || undefined,
          website: form.get("website") ?? "",
          page: "/quote",
          items: items.map((i) => ({ sku: i.sku, name: i.name, qty: i.qty, note: i.note })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Could not send your quote request.");
      setMode(data.mode);
      setState("done");
      clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
      setState("error");
    }
  };

  const field = "w-full rounded-md border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-steel";

  if (state === "done") {
    return (
      <div className="container-x py-16 text-center">
        <p className="eyebrow">Quote request sent</p>
        <h1 className="display mt-2 text-4xl">We&apos;re on it.</h1>
        <p className="mx-auto mt-3 max-w-lg text-ink-soft">A sales rep will price your list and get back to you during business hours (Mon–Fri 7:30 AM–5 PM). In a hurry? Call {PHONE_DISPLAY}.</p>
        {mode === "demo" && <p className="mx-auto mt-3 max-w-lg rounded-md bg-safety/20 px-3 py-2 text-sm text-ink-soft">Demo mode: the request was logged on the server but not stored. Connect a Vercel Blob store to save leads.</p>}
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-dark">
            Keep browsing
          </Link>
          <a href={PHONE_HREF} className="btn-primary">
            Call {PHONE_DISPLAY}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <p className="eyebrow">Quote list</p>
      <h1 className="display mt-1 text-4xl">Your quote request</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">No checkout, no card. Tell us who you are and we&apos;ll price the list — quoted pricing is typically lower than the website&apos;s retail prices, and local orders over $600 deliver free.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-7">
          {!hydrated ? (
            <p className="text-ink-muted">Loading your list…</p>
          ) : items.length === 0 ? (
            <div className="card p-6">
              <p className="font-display text-xl font-bold uppercase">Your list is empty.</p>
              <p className="mt-1 text-ink-soft">Add items from any product page or let Ask MLR build the list for you.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <AskMLRButton label="Ask MLR to build it" />
                <Link href="/search" className="btn-outline">
                  Browse products
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 p-3">
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt="" className="h-16 w-16 shrink-0 rounded object-contain" loading="lazy" />
                  ) : (
                    <span className="h-16 w-16 shrink-0 rounded bg-kraft" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={it.path} className="line-clamp-2 font-display text-base font-semibold leading-tight hover:text-red">
                      {it.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {it.sku}
                      {it.unit ? ` · ${it.unit.replace(/^price per\s*/i, "per ")}` : ""}
                    </p>
                    <input value={it.note ?? ""} onChange={(e) => update(it.id, { note: e.target.value })} placeholder="Size / color / note for the rep" className="mt-1 w-full rounded border border-line px-2 py-1 text-xs" />
                  </div>
                  <input type="number" min={1} value={it.qty} onChange={(e) => update(it.id, { qty: Number(e.target.value) || 1 })} className="w-16 rounded-md border border-line px-2 py-2 text-center font-semibold" aria-label={`Quantity for ${it.sku}`} />
                  <button type="button" onClick={() => remove(it.id)} className="rounded px-2 py-1 text-ink-muted hover:bg-paper hover:text-red" aria-label={`Remove ${it.sku}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm text-ink-muted">
              <span>
                {items.length} line{items.length === 1 ? "" : "s"} · {items.reduce((n, i) => n + i.qty, 0)} units
              </span>
              <button type="button" onClick={clear} className="underline hover:text-red">
                Clear list
              </button>
            </div>
          )}
        </section>

        <section className="lg:col-span-5">
          <form onSubmit={submit} className="card grid gap-3 p-5">
            <p className="font-display text-xl font-bold uppercase">Send it to a sales rep</p>
            <input name="name" required placeholder="Your name *" className={field} autoComplete="name" />
            <input name="company" placeholder="Company" className={field} autoComplete="organization" />
            <input name="phone" type="tel" placeholder="Phone *" className={field} autoComplete="tel" />
            <input name="email" type="email" placeholder="Email" className={field} autoComplete="email" />
            <input name="timeline" placeholder="When do you need it?" className={field} />
            <textarea name="notes" rows={3} placeholder="Delivery address, sizes, anything that helps us quote it right." className={field} />
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            {error && <p className="text-sm text-red">{error}</p>}
            <button type="submit" disabled={state === "sending" || items.length === 0} className="btn-primary py-3 text-lg disabled:opacity-50">
              {state === "sending" ? "Sending…" : "Request my quote"}
            </button>
            <p className="text-center text-xs text-ink-muted">
              Prefer to talk? <a href={PHONE_HREF} className="font-semibold text-steel underline">{PHONE_DISPLAY}</a> · Mon–Fri 7:30–5
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
