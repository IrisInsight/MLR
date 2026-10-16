import Link from "next/link";
import type { CatalogCategory } from "../../../scripts/lib/catalog-types";
import { CatalogImage } from "./CatalogImage";

export function CategoryTile({ c, priority = false }: { c: CatalogCategory; priority?: boolean }) {
  return (
    <Link href={c.path} className="group card flex h-full flex-col overflow-hidden transition-shadow hover:shadow-float">
      <div className="relative aspect-[4/3] bg-white">
        <CatalogImage src={c.image} alt={c.name} priority={priority} className="p-3 transition-transform duration-300 group-hover:scale-105" sizes="(min-width: 1024px) 25vw, 50vw" />
      </div>
      <div className="flex items-center justify-between border-t border-line px-3 py-2.5">
        <span className="font-display text-lg font-bold uppercase leading-tight tracking-wide group-hover:text-red">{c.name}</span>
        <span className="chip">{c.subtreeProductCount}</span>
      </div>
    </Link>
  );
}
