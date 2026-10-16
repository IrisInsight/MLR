"use client";

import Link from "next/link";
import { useState } from "react";
import type { CardProduct } from "./types";
import { useQuote } from "@/components/quote/QuoteProvider";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function priceLabel(p: CardProduct): { text: string; sub?: string; listed: boolean } {
  const pr = p.pricing;
  if (pr.status === "listed" && typeof pr.price === "number") {
    const unit = pr.unit?.replace(/^price per\s*/i, "").replace(/\.$/, "");
    return { text: money(pr.price), sub: unit ? `list / ${unit.toLowerCase()}` : "list price", listed: true };
  }
  return { text: "Call for pricing", listed: false };
}

export function ChatProductCard({ p, compact = false }: { p: CardProduct; compact?: boolean }) {
  const { add } = useQuote();
  const [added, setAdded] = useState(false);
  const price = priceLabel(p);
  const specs = Object.entries(p.specs).slice(0, compact ? 2 : 4);
  const onAdd = () => {
    add({ id: p.id, sku: p.sku, name: p.name, path: p.path, image: p.image, unit: p.pricing.unit, qty: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };
  return (
    <article className="flex w-[232px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-line bg-white text-left shadow-card">
      <Link href={p.path} className="relative block aspect-[5/4] bg-white" target="_blank" rel="noopener">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-contain p-2" />
        ) : (
          <div className="flex h-full items-center justify-center bg-kraft text-xs text-ink-muted">No photo</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="chip w-fit">{p.sku}</p>
        <h4 className="line-clamp-2 font-display text-[15px] font-semibold leading-tight">{p.name}</h4>
        {specs.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-[12px] leading-snug text-ink-muted">
            {specs.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="truncate">{k}</dt>
                <dd className="truncate text-right text-ink-soft">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-auto pt-1 font-display text-base font-bold leading-none">
          {price.text}
          {price.sub && <span className="ml-1 text-[11px] font-medium text-ink-muted">{price.sub}</span>}
        </p>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          <button type="button" onClick={onAdd} className="btn-primary btn-sm px-2 text-[12px]">
            {added ? "✓ Added" : "Add to quote"}
          </button>
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm px-2 text-[12px]">
            View product ↗
          </a>
          <a href={PHONE_HREF} className="col-span-2 rounded-md bg-paper px-2 py-1.5 text-center font-display text-[12px] font-semibold uppercase tracking-wide text-ink hover:bg-paper-deep" title={`Call ${PHONE_DISPLAY} for special pricing`}>
            {price.listed ? "Get special pricing" : "Call for pricing"} · {PHONE_DISPLAY}
          </a>
        </div>
      </div>
    </article>
  );
}

export function ProductRail({ products, title }: { products: CardProduct[]; title?: string }) {
  if (!products.length) return null;
  return (
    <div className="my-2">
      {title && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</p>}
      <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {products.map((p) => (
          <ChatProductCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
