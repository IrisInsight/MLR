import type { Metadata } from "next";
import Link from "next/link";
import { allCategories, getEnrichment, productSearch, topLevelCategories } from "@/lib/catalog";
import { ProductGridCard } from "@/components/product/ProductGridCard";
import { CategoryTile } from "@/components/product/CategoryTile";
import { SearchBar } from "@/components/site/SearchBar";
import { AskMLRButton } from "@/components/chat/AskButtons";
import { expandSynonyms } from "@/lib/search";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 200);
  const hits = query ? productSearch.search(query, { limit: 48 }) : [];
  const { applied } = expandSynonyms(query);
  const qn = query.toLowerCase();
  const catMatches = query ? allCategories().filter((c) => c.subtreeProductCount > 0 && (c.name.toLowerCase().includes(qn) || c.title.toLowerCase().includes(qn))).slice(0, 8) : [];

  return (
    <div className="container-x py-8">
      <h1 className="display text-4xl">{query ? `Results for “${query}”` : "Search the catalog"}</h1>
      <div className="mt-4 max-w-2xl">
        <SearchBar initial={query} />
      </div>
      {applied.length > 0 && (
        <p className="mt-2 text-sm text-ink-muted">
          Also searched for: {applied.map((a) => `“${a}” → ${expandSynonyms(a).expanded}`).join(" · ")}
        </p>
      )}

      {query && catMatches.length > 0 && (
        <section className="mt-6">
          <h2 className="display text-xl">Categories</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {catMatches.map((c) => (
              <li key={c.path}>
                <CategoryTile c={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {query && (
        <section className="mt-6">
          <h2 className="display text-xl">
            {hits.length} product{hits.length === 1 ? "" : "s"}
          </h2>
          {hits.length > 0 ? (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {hits.map((h, i) => (
                <li key={h.product.id}>
                  <ProductGridCard p={h.product} priority={i < 4} blurb={getEnrichment(h.product.id)?.summary} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="card mt-3 p-6">
              <p className="font-display text-xl font-bold uppercase">Nothing matched that exactly.</p>
              <p className="mt-1 text-ink-soft">Try a different word (we map “pallet wrap” to stretch film, “banding” to strapping, and so on), ask the assistant, or call — we source a lot more than what&apos;s online.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <AskMLRButton label="Ask MLR" detail={{ message: query, send: true }} />
                <a href={PHONE_HREF} className="btn-primary">
                  Call {PHONE_DISPLAY}
                </a>
              </div>
            </div>
          )}
        </section>
      )}

      {query && hits.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-card bg-ink p-5 text-white">
          <p className="flex-1 text-sm">
            Not sure which one? Tell Ask MLR what you&apos;re packing and how much, and it will narrow it down and suggest what goes with it.
          </p>
          <AskMLRButton label="Ask about these" className="btn-primary" detail={{ message: `I searched for "${query}". Which of these should I pick, and what goes with it?`, send: true }} />
        </div>
      )}

      {!query && (
        <section className="mt-8">
          <h2 className="display text-xl">Browse by category</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {topLevelCategories().map((c) => (
              <li key={c.path}>
                <CategoryTile c={c} />
              </li>
            ))}
          </ul>
          <p className="mt-6 text-ink-muted">
            Or <Link href="/chat" className="text-steel underline">ask the assistant</Link> in plain language.
          </p>
        </section>
      )}
    </div>
  );
}
