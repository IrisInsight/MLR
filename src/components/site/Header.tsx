import Image from "next/image";
import Link from "next/link";
import { topLevelCategories } from "@/lib/catalog";
import { HOURS_SHORT, INDUSTRIES, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { HeaderClient, QuoteCount } from "./HeaderClient";
import { SearchBar } from "./SearchBar";
import { PhoneIcon } from "./MobileCallBar";

export function Header() {
  const cats = topLevelCategories().map((c) => ({ name: c.name, path: c.path, image: c.image, count: c.subtreeProductCount }));
  const industries = INDUSTRIES.map((i) => ({ name: i.short, path: `/industries/${i.key}` }));
  return (
    <header className="relative z-40 bg-white">
      {/* utility strip */}
      <div className="hidden bg-ink-soft text-[13px] text-white/90 md:block">
        <div className="container-x flex h-8 items-center justify-between">
          <p>
            Family-owned since 2001 · Fullerton, CA · <span className="text-white">{HOURS_SHORT}</span>
          </p>
          <p className="flex items-center gap-4">
            <span className="text-safety">★ Free local delivery on orders over $600</span>
            <a href={PHONE_HREF} className="font-semibold text-white hover:text-safety">
              {PHONE_DISPLAY}
            </a>
          </p>
        </div>
      </div>
      {/* main bar */}
      <div className="border-b border-line">
        <div className="container-x flex items-center gap-3 py-3 md:gap-6">
          <HeaderClient cats={cats} industries={industries} />
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="MLR Packaging home">
            <Image src="/logo.png" alt="MLR Packaging Supplies & Equipment" width={92} height={70} priority className="h-12 w-auto md:h-16" />
            <span className="hidden font-display text-sm font-semibold uppercase leading-tight tracking-wide text-ink-muted lg:block">
              Packaging &amp; industrial
              <br />
              supplies · SoCal
            </span>
          </Link>
          <div className="hidden min-w-0 flex-1 md:block">
            <SearchBar />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <QuoteCount />
            <a href={PHONE_HREF} className="btn-primary hidden md:inline-flex">
              <PhoneIcon className="h-4 w-4" />
              {PHONE_DISPLAY}
            </a>
          </div>
        </div>
        <div className="container-x pb-3 md:hidden">
          <SearchBar />
        </div>
      </div>
      {/* category rail */}
      <nav aria-label="Product categories" className="hidden border-b border-line bg-paper md:block">
        <div className="container-x no-scrollbar flex items-center gap-1 overflow-x-auto">
          {cats.map((c) => (
            <Link key={c.path} href={c.path} className="shrink-0 whitespace-nowrap px-3 py-2.5 font-display text-[15px] font-semibold uppercase tracking-wide text-ink-soft hover:text-red">
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
