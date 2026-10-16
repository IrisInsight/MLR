import type { Metadata } from "next";
import Link from "next/link";
import { enriched, getCategory } from "@/lib/catalog";

export const metadata: Metadata = { title: "Buying guides" };

export default function GuidesIndex() {
  return (
    <div className="container-x py-8">
      <p className="eyebrow">Buying guides</p>
      <h1 className="display mt-1 text-4xl">Straight answers from the counter</h1>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enriched.buyingGuides.map((g) => {
          const cat = getCategory(g.categoryPath);
          return (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="card block h-full p-5 hover:shadow-float">
                <p className="eyebrow">{cat?.name ?? "Guide"}</p>
                <p className="display mt-1 text-2xl">{g.title}</p>
                <p className="mt-2 text-sm text-ink-muted">{g.intro}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
