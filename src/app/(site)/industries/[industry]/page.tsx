import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory, getEnrichment, getIndustry, getProductBySku, productsInSubtree } from "@/lib/catalog";
import { ProductGridCard } from "@/components/product/ProductGridCard";
import { CategoryTile } from "@/components/product/CategoryTile";
import { DeliveryBanner } from "@/components/site/DeliveryBanner";
import { AskMLRButton } from "@/components/chat/AskButtons";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { INDUSTRIES, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ industry: i.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }): Promise<Metadata> {
  const { industry } = await params;
  const ind = INDUSTRIES.find((i) => i.key === industry);
  return { title: ind ? `${ind.name} packaging supplies` : "Industry" };
}

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry } = await params;
  const ind = INDUSTRIES.find((i) => i.key === industry);
  if (!ind) notFound();
  const e = getIndustry(ind.key);
  const featured = (e?.featuredSkus ?? []).map((s) => getProductBySku(s)).filter((p): p is NonNullable<typeof p> => !!p);
  const cats = (e?.categoryPaths ?? []).map((p) => getCategory(p)).filter((c): c is NonNullable<typeof c> => !!c);
  // fall back to a few products from each category when the enrichment hasn't named SKUs
  const fallback = featured.length ? [] : cats.flatMap((c) => productsInSubtree(c.path).slice(0, 2)).slice(0, 8);
  const products = featured.length ? featured : fallback;

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ name: "Industries" }, { name: ind.name }]} />
      <header className="mt-4 max-w-3xl">
        <p className="eyebrow">Industry kit</p>
        <h1 className="display mt-1 text-4xl md:text-5xl">{e?.headline ?? `${ind.name}: what you buy every week, in one place.`}</h1>
        <p className="prose-mlr mt-4">{e?.intro ?? "Products these customers buy most, picked by the counter crew. Everything below is in the catalog and ready to quote."}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <AskMLRButton label={`Ask MLR about ${ind.short.toLowerCase()} supplies`} detail={{ message: `I run a ${ind.short.toLowerCase()} operation. What packaging and supplies should I be buying from you?`, send: true }} />
          <a href={PHONE_HREF} className="btn-outline">
            Call {PHONE_DISPLAY}
          </a>
        </div>
      </header>

      {products.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-3xl">The {ind.short.toLowerCase()} kit</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => (
              <li key={p.id}>
                <ProductGridCard p={p} priority={i < 4} blurb={getEnrichment(p.id)?.summary} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {cats.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-3xl">Categories {ind.short.toLowerCase()} customers shop</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cats.map((c) => (
              <li key={c.path}>
                <CategoryTile c={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {INDUSTRIES.filter((i) => i.key !== ind.key).map((i) => (
          <Link key={i.key} href={`/industries/${i.key}`} className="card p-4 hover:shadow-float">
            <p className="eyebrow">Also serving</p>
            <p className="display mt-1 text-xl">{i.name} →</p>
          </Link>
        ))}
      </section>

      <div className="mt-12">
        <DeliveryBanner />
      </div>
    </div>
  );
}
