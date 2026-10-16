import Link from "next/link";
import type { CatalogProduct } from "../../../scripts/lib/catalog-types";
import { CatalogImage } from "./CatalogImage";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";
import { formatMoney, priceUnitLabel, truncate } from "@/lib/format";

export function ProductGridCard({ p, priority = false, blurb }: { p: CatalogProduct; priority?: boolean; blurb?: string }) {
  const img = p.images[0] ?? p.thumbnail;
  const listed = p.pricing.status === "listed" && typeof p.pricing.price === "number";
  const specs = Object.entries(p.specs).slice(0, 3);
  return (
    <article className="card group flex h-full flex-col overflow-hidden">
      <Link href={p.path} className="relative block aspect-[5/4] bg-white">
        <CatalogImage src={img} alt={p.name} priority={priority} className="p-3 transition-transform duration-300 group-hover:scale-[1.03]" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" />
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 border-t border-line p-3">
        <p className="chip w-fit">{p.sku}</p>
        <h3 className="font-display text-lg font-semibold leading-tight">
          <Link href={p.path} className="hover:text-red">
            {p.name}
          </Link>
        </h3>
        {specs.length > 0 ? (
          <p className="text-[13px] text-ink-muted">{specs.map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
        ) : (
          <p className="text-[13px] text-ink-muted">{truncate(blurb ?? p.shortDescription, 110)}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p className="font-display text-xl font-bold leading-none">
            {listed ? formatMoney(p.pricing.price!) : <span className="text-base text-steel">Call for pricing</span>}
            {listed && <span className="ml-1 text-[11px] font-medium text-ink-muted">{priceUnitLabel(p.pricing)}</span>}
          </p>
          <AddToQuoteButton compact item={{ id: p.id, sku: p.sku, name: p.name, path: p.path, image: img, unit: p.pricing.unit }} />
        </div>
      </div>
    </article>
  );
}
