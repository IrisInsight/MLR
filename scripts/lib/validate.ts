import type { Catalog, Enriched } from "./catalog-types";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  stats: { products: number; enriched: number; complementaryLinks: number; guides: number; categories: number };
}

/** Fails if any complementary SKU, quick-pick SKU, featured SKU, category path or URL does not exist in the catalog. */
export function validateEnrichment(catalog: Catalog, enriched: Enriched): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const bySku = new Map(catalog.products.map((p) => [p.sku.toUpperCase(), p]));
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  const byPath = new Set(catalog.products.flatMap((p) => [p.path, p.canonicalPath]));
  const catPaths = new Set(catalog.categories.map((c) => c.path));
  let links = 0;

  for (const e of enriched.products) {
    const p = byId.get(e.id);
    if (!p) {
      errors.push(`enriched product ${e.id} (${e.sku}) is not in the catalog`);
      continue;
    }
    if (e.sku !== p.sku) errors.push(`${e.id}: sku mismatch (${e.sku} vs ${p.sku})`);
    if (e.path && !byPath.has(e.path)) errors.push(`${e.sku}: path ${e.path} not in catalog`);
    if (!e.summary || e.summary.length < 20) errors.push(`${e.sku}: summary too short`);
    if (!e.useCases?.length) warnings.push(`${e.sku}: no use cases`);
    if (!e.searchTerms?.length) warnings.push(`${e.sku}: no search terms`);
    if (!e.complementary?.length) warnings.push(`${e.sku}: no complementary products`);
    for (const sku of e.complementary ?? []) {
      links += 1;
      const target = bySku.get(sku.toUpperCase());
      if (!target) errors.push(`${e.sku}: complementary SKU ${sku} does not exist in the catalog`);
      else if (target.id === e.id) errors.push(`${e.sku}: lists itself as complementary`);
    }
  }
  for (const c of enriched.categories) if (!catPaths.has(c.path)) errors.push(`category enrichment path ${c.path} not in catalog`);
  for (const g of enriched.buyingGuides) {
    if (!catPaths.has(g.categoryPath)) errors.push(`guide ${g.slug}: category ${g.categoryPath} not in catalog`);
    for (const q of g.quickPicks ?? []) if (!bySku.has(q.sku.toUpperCase())) errors.push(`guide ${g.slug}: quick pick SKU ${q.sku} not in catalog`);
  }
  for (const ind of enriched.industries) {
    for (const p of ind.categoryPaths) if (!catPaths.has(p)) errors.push(`industry ${ind.key}: category ${p} not in catalog`);
    for (const s of ind.featuredSkus) if (!bySku.has(s.toUpperCase())) errors.push(`industry ${ind.key}: featured SKU ${s} not in catalog`);
  }
  return { errors, warnings, stats: { products: catalog.products.length, enriched: enriched.products.length, complementaryLinks: links, guides: enriched.buyingGuides.length, categories: enriched.categories.length } };
}
