import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { enriched, getCategory, getEnrichment, getProductBySku } from "@/lib/catalog";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";
import { ProductGridCard } from "@/components/product/ProductGridCard";
import { AskMLRButton } from "@/components/chat/AskButtons";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export function generateStaticParams() {
  return enriched.buyingGuides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = enriched.buyingGuides.find((x) => x.slug === slug);
  return { title: g ? g.title : "Buying guide" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = enriched.buyingGuides.find((x) => x.slug === slug);
  if (!g) notFound();
  const cat = getCategory(g.categoryPath);
  const picks = (g.quickPicks ?? []).map((q) => ({ ...q, product: getProductBySku(q.sku) })).filter((q) => q.product);
  const others = enriched.buyingGuides.filter((x) => x.slug !== g.slug).slice(0, 6);
  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[...(cat ? [{ name: cat.name, href: cat.path }] : []), { name: g.title }]} />
      <div className="mt-4 grid gap-10 lg:grid-cols-12">
        <article className="lg:col-span-8">
          <p className="eyebrow">Buying guide</p>
          <h1 className="display mt-1 text-4xl md:text-5xl">{g.title}</h1>
          <p className="prose-mlr mt-4 text-xl">{g.intro}</p>
          <div className="prose-mlr mt-6">
            {g.sections.map((s) => (
              <section key={s.heading}>
                <h2>{s.heading}</h2>
                {s.body.split("\n").filter(Boolean).map((p, i) => (p.startsWith("- ") ? <ul key={i}><li>{p.slice(2)}</li></ul> : <p key={i}>{p}</p>))}
              </section>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <AskMLRButton label="Ask MLR which one fits" detail={{ message: `I read the "${g.title}" guide. Help me pick the right option for my situation.`, send: true }} />
            {cat && (
              <Link href={cat.path} className="btn-outline">
                Shop {cat.name}
              </Link>
            )}
            <a href={PHONE_HREF} className="btn-ghost">
              {PHONE_DISPLAY}
            </a>
          </div>
        </article>
        <aside className="lg:col-span-4">
          {picks.length > 0 && (
            <>
              <p className="display text-xl">Counter picks</p>
              <ul className="mt-3 grid gap-3">
                {picks.map((q) => (
                  <li key={q.sku}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">{q.label}</p>
                    <ProductGridCard p={q.product!} blurb={getEnrichment(q.product!.id)?.summary} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {others.length > 0 && (
            <div className="mt-8">
              <p className="display text-xl">More guides</p>
              <ul className="mt-2 divide-y divide-line">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/guides/${o.slug}`} className="block py-2 font-semibold hover:text-red">
                      {o.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
