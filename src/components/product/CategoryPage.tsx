import type { Metadata } from "next";
import Link from "next/link";
import type { CatalogCategory } from "../../../scripts/lib/catalog-types";
import { categoryChain, childCategories, getBuyingGuides, getCategoryEnrichment, getEnrichment, productsIn, productsInSubtree } from "@/lib/catalog";
import { Breadcrumbs } from "./Breadcrumbs";
import { CategoryTile } from "./CategoryTile";
import { ProductGridCard } from "./ProductGridCard";
import { SpecTable } from "./SpecTable";
import { CatalogImage } from "./CatalogImage";
import { DeliveryBanner } from "@/components/site/DeliveryBanner";
import { AskMLRButton } from "@/components/chat/AskButtons";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export function categoryMetadata(c: CatalogCategory): Metadata {
  const e = getCategoryEnrichment(c.path);
  return {
    title: c.title || c.name,
    description: e?.summary ?? c.description?.slice(0, 160) ?? `${c.name} from MLR Packaging, Fullerton CA. Free local delivery on orders over $600.`,
    robots: { index: false, follow: false },
  };
}

export function CategoryPage({ category: c }: { category: CatalogCategory }) {
  const chain = categoryChain(c.path);
  const children = childCategories(c.path);
  const direct = productsIn(c.path);
  const tableRows = direct.filter((p) => p.listingType === "table");
  const gridRows = direct.filter((p) => p.listingType === "grid");
  const e = getCategoryEnrichment(c.path);
  const guides = getBuyingGuides(c.path);
  const subtreeCount = c.subtreeProductCount;
  // A category with only subcategories: show a few popular products from the subtree as a teaser
  const teaser = children.length && !direct.length ? productsInSubtree(c.path).slice(0, 8) : [];

  return (
    <div className="container-x py-6 md:py-8">
      <Breadcrumbs items={chain.map((x, i) => ({ name: x.name, href: i < chain.length - 1 ? x.path : undefined }))} />
      <header className="mt-4 grid gap-6 md:grid-cols-12 md:items-center">
        <div className="md:col-span-8">
          <p className="eyebrow">{chain.length > 1 ? chain[chain.length - 2].name : "Category"}</p>
          <h1 className="display mt-1 text-4xl md:text-5xl">{c.title || c.name}</h1>
          {(e?.summary || c.description) && <p className="prose-mlr mt-3 max-w-3xl">{e?.summary ?? c.description}</p>}
          {e?.useCases?.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {e.useCases.slice(0, 5).map((u) => (
                <li key={u} className="rounded-full bg-paper-deep px-3 py-1 text-sm text-ink-soft">
                  {u}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <AskMLRButton label={`Ask about ${c.name}`} detail={{ message: `Help me pick the right ${c.name.toLowerCase()}. What should I know?`, send: true }} />
            <a href={PHONE_HREF} className="btn-outline">
              {PHONE_DISPLAY}
            </a>
            <span className="text-sm text-ink-muted">{subtreeCount} items</span>
          </div>
        </div>
        {c.image && (
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-card border border-line bg-white md:col-span-4 md:block">
            <CatalogImage src={c.image} alt={c.name} priority className="p-4" sizes="33vw" />
          </div>
        )}
      </header>

      {guides.length > 0 && (
        <aside className="mt-6 flex flex-wrap items-center gap-3 rounded-card border border-sky/40 bg-sky-soft px-4 py-3">
          <span className="font-display text-sm font-bold uppercase tracking-wider text-steel">Buying guide</span>
          {guides.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="font-semibold text-steel underline underline-offset-2">
              {g.title} →
            </Link>
          ))}
        </aside>
      )}

      {children.length > 0 && (
        <section className="mt-8">
          <h2 className="display text-2xl">Browse {c.name}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {children.map((ch, i) => (
              <li key={ch.path}>
                <CategoryTile c={ch} priority={i < 4} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {tableRows.length > 0 && (
        <section className="mt-8">
          <h2 className="display text-2xl">All sizes &amp; list prices</h2>
          <p className="mt-1 text-sm text-ink-muted">Website prices are full retail — quoted pricing is typically lower. Add items to your quote and we&apos;ll price it.</p>
          <div className="mt-4">
            <SpecTable category={c} products={tableRows} />
          </div>
        </section>
      )}

      {gridRows.length > 0 && (
        <section className="mt-8">
          <h2 className="display text-2xl">{children.length || tableRows.length ? "Products" : `${gridRows.length} products`}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gridRows.map((p, i) => (
              <li key={p.id}>
                <ProductGridCard p={p} priority={i < 4} blurb={getEnrichment(p.id)?.summary} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {teaser.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-2xl">Popular in {c.name}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {teaser.map((p) => (
              <li key={p.id}>
                <ProductGridCard p={p} blurb={getEnrichment(p.id)?.summary} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!children.length && !direct.length && (
        <p className="mt-8 rounded-card border border-line bg-white p-6 text-ink-muted">
          Nothing is listed online in this category yet. Call {PHONE_DISPLAY} — we source a lot more than what&apos;s on the website.
        </p>
      )}

      <div className="mt-12">
        <DeliveryBanner />
      </div>
    </div>
  );
}
