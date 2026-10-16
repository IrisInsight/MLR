import Link from "next/link";
import { enriched, topLevelCategories, catalog } from "@/lib/catalog";
import { CatalogImage } from "@/components/product/CatalogImage";
import { SearchBar } from "@/components/site/SearchBar";
import { DeliveryBanner } from "@/components/site/DeliveryBanner";
import { AskChip, AskMLRButton } from "@/components/chat/AskButtons";
import { COUNTIES, INDUSTRIES, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

const ASKS = ["I need to wrap 20 pallets a day", "Do you have white gloves?", "What strapping should I use for lumber bundles?", "Boxes for 12×12×12 — which ones?"];

export default function HomePage() {
  const cats = topLevelCategories();
  const productCount = catalog.products.length;
  const guides = enriched.buyingGuides.slice(0, 4);
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="flute absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-red/20 blur-3xl" aria-hidden="true" />
        <div className="container-x relative grid gap-10 py-14 md:grid-cols-12 md:py-20">
          <div className="md:col-span-7">
            <p className="eyebrow text-safety">Fullerton, CA · Family-owned since 2001</p>
            <h1 className="display mt-3 text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
              Packaging &amp; industrial supplies,
              <span className="block text-red"> delivered free across SoCal.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              Stretch film, strapping, boxes, tape, gloves, janitorial — {productCount.toLocaleString()} items from a counter crew that answers the phone. Ask MLR, our AI sales assistant, finds the right one in seconds.
            </p>
            <div className="mt-7">
              <SearchBar size="lg" />
              <div className="mt-3 flex flex-wrap gap-2">
                {ASKS.map((a) => (
                  <AskChip key={a} text={a} />
                ))}
              </div>
            </div>
          </div>
          <div className="md:col-span-5">
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                ["Free local delivery", "Orders over $600 · our own trucks"],
                ["Mon–Fri 7:30–5", "Will-call & same-week rush"],
                ["2 warehouses, 8+ trucks", `${COUNTIES.length} counties covered`],
                ["Special pricing", "Website prices are retail; quotes run lower"],
              ].map(([t, d]) => (
                <li key={t} className="rounded-card border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="font-display text-xl font-bold uppercase leading-tight">{t}</p>
                  <p className="mt-1 text-sm text-white/70">{d}</p>
                </li>
              ))}
            </ul>
            <a href={PHONE_HREF} className="btn-primary mt-4 w-full py-3 text-lg">
              Call {PHONE_DISPLAY}
            </a>
          </div>
        </div>
        <div className="stripe h-2" aria-hidden="true" />
      </section>

      {/* CATEGORIES */}
      <section className="container-x py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2 className="display mt-1 text-4xl">Everything that moves product out the door</h2>
          </div>
          <Link href="/search" className="hidden text-steel underline underline-offset-4 md:block">
            Browse all →
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {cats.map((c, i) => (
            <li key={c.path}>
              <Link href={c.path} className="group card flex h-full flex-col overflow-hidden transition-shadow hover:shadow-float">
                <div className="relative aspect-[4/3] bg-white">
                  <CatalogImage src={c.image} alt={c.name} sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw" priority={i < 4} className="p-3 transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="flex items-center justify-between border-t border-line px-3 py-2.5">
                  <span className="font-display text-lg font-bold uppercase leading-tight tracking-wide group-hover:text-red">{c.name}</span>
                  <span className="chip">{c.subtreeProductCount}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ASK MLR */}
      <section className="bg-paper-deep">
        <div className="container-x grid items-center gap-10 py-14 md:grid-cols-2">
          <div>
            <p className="eyebrow">New · Ask MLR</p>
            <h2 className="display mt-1 text-4xl">Like texting your sales rep. Open 24/7.</h2>
            <p className="prose-mlr mt-4">
              Describe what you&apos;re packing and how much of it. Ask MLR searches the real catalog, shows the items with links, suggests what customers usually buy with them, and hands you off to a human for pricing, availability, and lead times. It never invents a product or a price.
            </p>
            <ul className="mt-5 space-y-2 text-ink-soft">
              {["Finds the right gauge, size, or grade from the full catalog", "Builds your quote list as you chat", "Requests a call back after hours", "Knows the free-delivery and will-call rules"].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rotate-45 bg-red" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <AskMLRButton label="Try Ask MLR" />
              <Link href="/chat" className="btn-outline">
                Full-screen chat
              </Link>
            </div>
          </div>
          <div className="card p-5">
            <p className="chip">Example conversation</p>
            <div className="mt-4 space-y-3 text-[15px]">
              <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-white">I need to wrap 20 pallets a day. What should I use?</p>
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-paper px-4 py-3 text-ink-soft">
                <p>At 20 pallets a day you&apos;re right at the line where a machine pays for itself. Two good options:</p>
                <ul className="mt-2 list-disc pl-5">
                  <li>
                    <strong>Hand film, 80 gauge 18&quot; × 1500&apos;</strong> — our workhorse hand roll for mixed loads.
                  </li>
                  <li>
                    <strong>Eagle 2000B stretch wrapper</strong> + machine film — consistent wraps, 250% pre-stretch, less film per pallet.
                  </li>
                </ul>
                <p className="mt-2">Most folks hand-wrapping also grab a film dispenser — it saves your wrists and your film. Are the loads mostly uniform boxes, or mixed shapes?</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="container-x py-14">
        <p className="eyebrow">Who we serve</p>
        <h2 className="display mt-1 text-4xl">Built for the trades that ship heavy</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INDUSTRIES.map((ind) => {
            const e = enriched.industries.find((x) => x.key === ind.key);
            return (
              <li key={ind.key}>
                <Link href={`/industries/${ind.key}`} className="card group block h-full p-5 transition-shadow hover:shadow-float">
                  <p className="display text-2xl group-hover:text-red">{ind.name}</p>
                  <p className="mt-2 text-sm text-ink-muted">{e?.headline ?? "Products these customers buy every week, in one place."}</p>
                  <p className="mt-4 font-display text-sm font-semibold uppercase tracking-wider text-steel">See the kit →</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <DeliveryBanner />

      {/* SPECIAL PRICING + GUIDES */}
      <section className="container-x grid gap-10 py-14 md:grid-cols-2">
        <div className="rounded-card bg-ink p-8 text-white">
          <p className="eyebrow text-safety">Special pricing</p>
          <h2 className="display mt-1 text-3xl">Website prices are full retail. Quotes run lower.</h2>
          <p className="mt-3 text-white/80">Volume, standing orders, and multi-line quotes get our best pricing. Build a quote list here or call the counter.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/special-pricing" className="btn-primary">
              Request a quote
            </Link>
            <a href={PHONE_HREF} className="btn bg-white/10 text-white hover:bg-white/20">
              {PHONE_DISPLAY}
            </a>
          </div>
        </div>
        <div>
          <p className="eyebrow">Buying guides</p>
          <h2 className="display mt-1 text-3xl">Straight answers from the counter</h2>
          <ul className="mt-4 divide-y divide-line">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="group flex items-center justify-between py-3">
                  <span className="font-semibold group-hover:text-red">{g.title}</span>
                  <span className="text-steel">→</span>
                </Link>
              </li>
            ))}
            {!guides.length && <li className="py-3 text-ink-muted">Guides are being written.</li>}
          </ul>
        </div>
      </section>
    </>
  );
}
