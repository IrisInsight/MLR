import { readFileSync } from "node:fs";
import path from "node:path";
import type { Catalog, Enriched } from "../scripts/lib/catalog-types";
import { createProductSearch } from "../src/lib/search";

export function loadCatalog(): Catalog {
  return JSON.parse(readFileSync(path.resolve(__dirname, "../data/catalog.json"), "utf8"));
}

export function loadEnriched(): Enriched {
  return JSON.parse(readFileSync(path.resolve(__dirname, "../data/enriched.json"), "utf8"));
}

export function buildSearch() {
  const catalog = loadCatalog();
  const enriched = loadEnriched();
  const byId = new Map(enriched.products.map((e) => [e.id, e]));
  const catByPath = new Map(catalog.categories.map((c) => [c.path, c]));
  const chainNames = (p: string) => {
    const segs = p.split("/").filter(Boolean);
    return segs.map((_, i) => catByPath.get("/" + segs.slice(0, i + 1).join("/"))?.name ?? "").filter(Boolean);
  };
  const search = createProductSearch(
    catalog.products,
    (id) => byId.get(id),
    chainNames,
    catalog.categories.map((c) => ({ path: c.path, name: c.name, title: c.title })),
    (path) => enriched.categories.find((c) => c.path === path)?.complementaryCategories ?? [],
  );
  return { catalog, enriched, search };
}
