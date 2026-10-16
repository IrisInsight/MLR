import Link from "next/link";
import type { CatalogCategory, CatalogProduct } from "../../../scripts/lib/catalog-types";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";
import { formatMoney } from "@/lib/format";

/**
 * The spec table MLR customers are used to: one row per SKU with the category's spec
 * columns and list prices (tier prices when the site shows them).
 */
export function SpecTable({ category, products, highlightId }: { category: CatalogCategory; products: CatalogProduct[]; highlightId?: string }) {
  const groups = new Map<string, CatalogProduct[]>();
  for (const p of products) {
    const key = p.tableHeading ?? "";
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([heading, rows]) => {
        const specCols = [...new Set(rows.flatMap((r) => Object.keys(r.specs)))];
        const tierLabels = [...new Set(rows.flatMap((r) => r.pricing.tiers?.map((t) => t.minQty) ?? []))];
        const unit = rows.find((r) => r.pricing.unit)?.pricing.unit?.replace(/^price per\s*/i, "");
        const anyListed = rows.some((r) => r.pricing.status === "listed");
        return (
          <div key={heading} className="overflow-hidden rounded-card border border-line bg-white shadow-card">
            {heading && <p className="border-b border-line bg-paper-deep px-3 py-2 font-display text-sm font-bold uppercase tracking-wider">{heading}</p>}
            <div className="overflow-x-auto">
              <table className="table-specs w-full min-w-[640px] text-[14px]">
                <thead>
                  <tr>
                    <th>Item #</th>
                    {specCols.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                    {anyListed && tierLabels.length > 1 ? (
                      tierLabels.map((t) => (
                        <th key={t} className="text-right">
                          {t}
                          {unit ? ` / ${unit}` : ""}
                        </th>
                      ))
                    ) : (
                      <th className="text-right">{unit ? `List / ${unit}` : "List price"}</th>
                    )}
                    <th className="text-right">Quote</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const listed = r.pricing.status === "listed" && typeof r.pricing.price === "number";
                    return (
                      <tr key={r.id} className={r.id === highlightId ? "bg-sky-soft" : "hover:bg-paper"}>
                        <td>
                          <Link href={r.path} className="font-mono text-[13px] font-semibold text-steel underline-offset-2 hover:underline">
                            {r.sku}
                          </Link>
                        </td>
                        {specCols.map((c) => (
                          <td key={c}>{r.specs[c] ?? ""}</td>
                        ))}
                        {anyListed && tierLabels.length > 1 ? (
                          tierLabels.map((t) => {
                            const tier = r.pricing.tiers?.find((x) => x.minQty === t);
                            return (
                              <td key={t} className="text-right tabular-nums">
                                {tier ? formatMoney(tier.price) : listed && t === tierLabels[0] ? formatMoney(r.pricing.price!) : "—"}
                              </td>
                            );
                          })
                        ) : (
                          <td className="text-right tabular-nums">{listed ? formatMoney(r.pricing.price!) : <span className="text-steel">Call</span>}</td>
                        )}
                        <td className="text-right">
                          <AddToQuoteButton compact className="btn-outline" item={{ id: r.id, sku: r.sku, name: r.name, path: r.path, image: r.images[0], unit: r.pricing.unit }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-3 py-2 text-xs text-ink-muted">
              {anyListed ? "List prices from mlrpackaging.com — quoted pricing is usually lower. " : "Call for pricing. "}
              {category.title ? `${category.title}. ` : ""}Availability and lead time confirmed by phone.
            </p>
          </div>
        );
      })}
    </div>
  );
}
