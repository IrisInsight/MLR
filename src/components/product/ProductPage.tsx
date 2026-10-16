import type { Metadata } from "next";
import Link from "next/link";
import type { CatalogProduct } from "../../../scripts/lib/catalog-types";
import { categoryChain, complementaryProducts, getCategory, getEnrichment, productsIn } from "@/lib/catalog";
import { Breadcrumbs } from "./Breadcrumbs";
import { CatalogImage } from "./CatalogImage";
import { ProductGridCard } from "./ProductGridCard";
import { SpecTable } from "./SpecTable";
import { AddToQuoteButton } from "@/components/quote/AddToQuoteButton";
import { AskAboutProduct } from "@/components/chat/AskButtons";
import { DeliveryBanner } from "@/components/site/DeliveryBanner";
import { formatMoney, priceUnitLabel } from "@/lib/format";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export function productMetadata(p: CatalogProduct): Metadata {
  const e = getEnrichment(p.id);
  return {
    title: `${p.name} (${p.sku})`,
    description: e?.summary ?? p.shortDescription?.slice(0, 160) ?? p.meta.description ?? `${p.name} from MLR Packaging.`,
    robots: { index: false, follow: false },
    alternates: { canonical: p.path },
  };
}

function jsonLd(p: CatalogProduct, description: string) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    mpn: p.vendorSku || undefined,
    image: p.images,
    description,
    brand: { "@type": "Brand", name: "MLR Packaging Supplies & Equipment" },
    url: p.path,
    additionalProperty: Object.entries(p.specs).map(([name, value]) => ({ "@type": "PropertyValue", name, value })),
  };
  if (p.pricing.status === "listed" && typeof p.pricing.price === "number") {
    data.offers = {
      "@type": "Offer",
      price: p.pricing.price.toFixed(2),
      priceCurrency: "USD",
      url: p.path,
      seller: { "@type": "Organization", name: "MLR Packaging Supplies & Equipment" },
      itemCondition: "https://schema.org/NewCondition",
    };
  }
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function ProductPage({ product: p }: { product: CatalogProduct }) {
  const chain = categoryChain(p.categoryPath);
  const category = getCategory(p.categoryPath);
  const e = getEnrichment(p.id);
  const also = complementaryProducts(p.id, 6);
  const siblings = productsIn(p.categoryPath).filter((s) => s.id !== p.id);
  const img = p.images[0] ?? p.thumbnail;
  const listed = p.pricing.status === "listed" && typeof p.pricing.price === "number";
  const description = e?.summary ?? p.shortDescription ?? p.meta.description ?? "";
  const specEntries = Object.entries(p.specs);
  const tableFamily = p.listingType === "table" ? [p, ...siblings].filter((s) => s.listingType === "table") : [];

  return (
    <div className="container-x py-6 md:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(p, description) }} />
      <Breadcrumbs items={[...chain.map((c) => ({ name: c.name, href: c.path })), { name: p.name }]} />

      <div className="mt-4 grid gap-8 lg:grid-cols-12">
        {/* image */}
        <div className="lg:col-span-5">
          <div className="relative aspect-square overflow-hidden rounded-card border border-line bg-white lg:sticky lg:top-4">
            <CatalogImage src={img} alt={p.name} priority className="p-6" sizes="(min-width: 1024px) 40vw, 100vw" />
            {p.imageIsCategoryImage && <p className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-0.5 text-[11px] text-ink-muted">Representative photo for {category?.title ?? category?.name}</p>}
          </div>
          {p.videoId && (
            <a href={`https://www.youtube.com/watch?v=${p.videoId}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-3 rounded-card border border-line bg-white p-3 hover:border-ink">
              <span className="flex h-10 w-14 items-center justify-center rounded bg-red text-white">▶</span>
              <span className="text-sm font-semibold">Watch the product video on YouTube ↗</span>
            </a>
          )}
        </div>

        {/* details */}
        <div className="lg:col-span-7">
          <p className="eyebrow">{category?.title ?? category?.name}</p>
          <h1 className="display mt-1 text-3xl leading-tight md:text-4xl">{p.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <span className="chip">Item # {p.sku}</span>
            {p.vendorSku && p.vendorSku !== p.sku && <span className="chip">Vendor # {p.vendorSku}</span>}
            {p.pricing.unit && <span>{p.pricing.unit.replace(/\.$/, "")}</span>}
            {p.pricing.unitNote && <span>· {p.pricing.unitNote}</span>}
          </p>

          {description && <p className="prose-mlr mt-4">{description}</p>}
          {e?.useCases?.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {e.useCases.slice(0, 5).map((u) => (
                <li key={u} className="rounded-full bg-paper-deep px-3 py-1 text-sm text-ink-soft">
                  {u}
                </li>
              ))}
            </ul>
          ) : null}

          {/* pricing + actions */}
          <div className="card mt-5 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{listed ? "List price on mlrpackaging.com" : "Pricing"}</p>
                <p className="font-display text-4xl font-bold leading-none">
                  {listed ? formatMoney(p.pricing.price!) : <span className="text-3xl text-steel">Call for pricing</span>}
                  {listed && <span className="ml-2 text-base font-medium text-ink-muted">{priceUnitLabel(p.pricing)}</span>}
                </p>
                {listed && p.pricing.tiers && p.pricing.tiers.length > 1 && (
                  <p className="mt-1 text-sm text-ink-muted">
                    Volume: {p.pricing.tiers.map((t) => `${t.minQty} → ${formatMoney(t.price)}`).join(" · ")}
                  </p>
                )}
                <p className="mt-1 text-sm text-ink-soft">Website prices are full retail. Quoted pricing is typically much lower — especially on volume.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <AddToQuoteButton showQty item={{ id: p.id, sku: p.sku, name: p.name, path: p.path, image: img, unit: p.pricing.unit }} />
              <a href={PHONE_HREF} className="btn-dark">
                {listed ? "Get special pricing" : "Call for pricing"} · {PHONE_DISPLAY}
              </a>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <AskAboutProduct product={{ id: p.id, sku: p.sku, name: p.name, path: p.path }} />
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-steel underline underline-offset-2">
                View on mlrpackaging.com ↗
              </a>
            </div>
            <p className="mt-3 text-xs text-ink-muted">No live inventory online — availability and lead time are confirmed by phone. No payment is taken on this site.</p>
          </div>

          <div className="mt-4">
            <DeliveryBanner compact />
          </div>

          {/* variants */}
          {p.attributes.length > 0 && (
            <section className="mt-6">
              <h2 className="display text-xl">Options</h2>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                {p.attributes.map((a) => (
                  <div key={a.name} className="rounded-card border border-line bg-white p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {a.name}
                      {a.description ? ` — ${a.description}` : ""}
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {a.options.map((o) => (
                        <span key={o} className="rounded border border-line px-2 py-0.5 text-sm">
                          {o}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* specs */}
          {(specEntries.length > 0 || p.fullDescription) && (
            <section className="mt-6">
              <h2 className="display text-xl">Specifications</h2>
              {specEntries.length > 0 && (
                <table className="table-specs mt-2 w-full overflow-hidden rounded-card border border-line bg-white text-sm">
                  <tbody>
                    {specEntries.map(([k, v]) => (
                      <tr key={k}>
                        <th className="w-1/3">{k}</th>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {p.fullDescription && <p className="prose-mlr mt-3 whitespace-pre-line">{p.fullDescription}</p>}
            </section>
          )}

          {e?.keyQuestions?.length ? (
            <section className="mt-6 rounded-card border border-line bg-paper-deep p-4">
              <h2 className="display text-lg">Before you order, know your…</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                {e.keyQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      {also.length > 0 && (
        <section className="mt-12">
          <p className="eyebrow">Customers also buy</p>
          <h2 className="display mt-1 text-3xl">Goes with {p.sku}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {also.map((a) => (
              <li key={a.id}>
                <ProductGridCard p={a} blurb={getEnrichment(a.id)?.summary} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {tableFamily.length > 1 && category && (
        <section className="mt-12">
          <h2 className="display text-3xl">All sizes in {category.title || category.name}</h2>
          <div className="mt-4">
            <SpecTable category={category} products={tableFamily} highlightId={p.id} />
          </div>
        </section>
      )}

      {p.listingType === "grid" && siblings.length > 0 && category && (
        <section className="mt-12">
          <div className="flex items-end justify-between">
            <h2 className="display text-3xl">More {category.title || category.name}</h2>
            <Link href={category.path} className="text-steel underline underline-offset-4">
              See all {siblings.length + 1} →
            </Link>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {siblings.slice(0, 8).map((s) => (
              <li key={s.id}>
                <ProductGridCard p={s} blurb={getEnrichment(s.id)?.summary} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
