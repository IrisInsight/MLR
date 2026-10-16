import Link from "next/link";
import { topLevelCategories } from "@/lib/catalog";
import { ADDRESS, COUNTIES, EMAIL, HOURS_SHORT, INDUSTRIES, LIVE_SITE, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export function Footer() {
  const cats = topLevelCategories();
  return (
    <footer className="mt-16 bg-ink text-white/85 pb-20 md:pb-0">
      <div className="stripe h-2" aria-hidden="true" />
      <div className="container-x grid gap-10 py-12 md:grid-cols-4">
        <div>
          <p className="display text-2xl text-white">MLR Packaging</p>
          <p className="mt-2 text-sm leading-relaxed">
            Family-owned packaging and industrial supplies distributor since 2001. Two warehouses, our own trucks, and people who pick up the phone.
          </p>
          <a href={PHONE_HREF} className="mt-4 inline-block font-display text-2xl font-bold text-white hover:text-safety">
            {PHONE_DISPLAY}
          </a>
          <p className="text-sm">{HOURS_SHORT}</p>
          <p className="mt-2 text-sm">{ADDRESS}</p>
          <a href={`mailto:${EMAIL}`} className="text-sm underline underline-offset-2 hover:text-white">
            {EMAIL}
          </a>
        </div>
        <div>
          <p className="eyebrow text-safety">Products</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {cats.map((c) => (
              <li key={c.path}>
                <Link href={c.path} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow text-safety">Industries</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {INDUSTRIES.map((i) => (
              <li key={i.key}>
                <Link href={`/industries/${i.key}`} className="hover:text-white">
                  {i.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="eyebrow mt-6 text-safety">Free local delivery</p>
          <p className="mt-2 text-sm leading-relaxed">
            Our trucks run {COUNTIES.join(", ")} counties. Free delivery within many local zip codes on orders over $600; $300 minimum on will-call.
          </p>
        </div>
        <div>
          <p className="eyebrow text-safety">Company</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li><Link href="/special-pricing" className="hover:text-white">Special pricing &amp; quotes</Link></li>
            <li><Link href="/about" className="hover:text-white">About MLR</Link></li>
            <li><Link href="/shipping-returns" className="hover:text-white">Shipping &amp; returns</Link></li>
            <li><Link href="/proposition-65" className="hover:text-white">Proposition 65</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link href="/chat" className="hover:text-white">Ask MLR (full screen)</Link></li>
            <li><Link href="/preview" className="hover:text-white">Widget preview on the current site</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-start justify-between gap-2 py-4 text-xs text-white/60 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} MLR Packaging Supplies &amp; Equipment, Inc. Concept preview — product data and images belong to MLR Packaging.</p>
          <p>
            <a href={LIVE_SITE} className="underline underline-offset-2 hover:text-white" target="_blank" rel="noopener noreferrer">
              Current live site ↗
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
