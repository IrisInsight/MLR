import "server-only";
import catalogJson from "../../data/catalog.json";
import enrichedJson from "../../data/enriched.json";
import type { BuyingGuide, Catalog, CatalogCategory, CatalogProduct, CategoryEnrichment, Enriched, EnrichedProduct } from "../../scripts/lib/catalog-types";

export const catalog = catalogJson as unknown as Catalog;
export const enriched = enrichedJson as unknown as Enriched;
export const company = catalog.company;

/* ------------------------------------------------------------------ */
/* indexes (built once per server instance)                            */
/* ------------------------------------------------------------------ */

const productByPath = new Map<string, CatalogProduct>();
const productById = new Map<string, CatalogProduct>();
const productBySku = new Map<string, CatalogProduct>();
const categoryByPath = new Map<string, CatalogCategory>();
const enrichedById = new Map<string, EnrichedProduct>();
const enrichedCategoryByPath = new Map<string, CategoryEnrichment>();
const productsByCategory = new Map<string, CatalogProduct[]>();

for (const p of catalog.products) {
  productByPath.set(p.path, p);
  if (p.canonicalPath && p.canonicalPath !== p.path) productByPath.set(p.canonicalPath, p);
  productById.set(p.id, p);
  if (p.sku) productBySku.set(p.sku.toUpperCase(), p);
  for (const cp of p.categoryPaths) {
    const arr = productsByCategory.get(cp) ?? [];
    arr.push(p);
    productsByCategory.set(cp, arr);
  }
}
for (const c of catalog.categories) categoryByPath.set(c.path, c);
for (const e of enriched.products) enrichedById.set(e.id, e);
for (const c of enriched.categories) enrichedCategoryByPath.set(c.path, c);

/* ------------------------------------------------------------------ */
/* accessors                                                           */
/* ------------------------------------------------------------------ */

export const allProducts = (): CatalogProduct[] => catalog.products;
export const allCategories = (): CatalogCategory[] => catalog.categories;

export function getProductByPath(path: string): CatalogProduct | undefined {
  return productByPath.get(path);
}
export function getProductById(id: string): CatalogProduct | undefined {
  return productById.get(id);
}
export function getProductBySku(sku: string): CatalogProduct | undefined {
  return productBySku.get(sku.trim().toUpperCase());
}
export function getCategory(path: string): CatalogCategory | undefined {
  return categoryByPath.get(path);
}
export function getEnrichment(productId: string): EnrichedProduct | undefined {
  return enrichedById.get(productId);
}
export function getCategoryEnrichment(path: string): CategoryEnrichment | undefined {
  return enrichedCategoryByPath.get(path);
}
export function getBuyingGuides(categoryPath?: string): BuyingGuide[] {
  if (!categoryPath) return enriched.buyingGuides;
  return enriched.buyingGuides.filter((g) => categoryPath === g.categoryPath || categoryPath.startsWith(g.categoryPath + "/"));
}
export function getIndustry(key: string) {
  return enriched.industries.find((i) => i.key === key);
}

/** Direct products of a category (listed on that page). */
export function productsIn(categoryPath: string): CatalogProduct[] {
  return productsByCategory.get(categoryPath) ?? [];
}

/** Every product in a category subtree, deduplicated. */
export function productsInSubtree(categoryPath: string): CatalogProduct[] {
  const seen = new Set<string>();
  const out: CatalogProduct[] = [];
  const walk = (path: string) => {
    for (const p of productsIn(path)) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
    for (const child of getCategory(path)?.children ?? []) walk(child);
  };
  walk(categoryPath);
  return out;
}

export function childCategories(path: string | null): CatalogCategory[] {
  if (path === null) return catalog.categories.filter((c) => c.parentPath === null).sort(byNavOrder);
  const cat = getCategory(path);
  return (cat?.children ?? []).map((c) => getCategory(c)).filter((c): c is CatalogCategory => !!c);
}

const navOrder = new Map(catalog.nav.megaMenu.map((m, i) => [m.path, i]));
function byNavOrder(a: CatalogCategory, b: CatalogCategory) {
  return (navOrder.get(a.path) ?? 999) - (navOrder.get(b.path) ?? 999) || a.name.localeCompare(b.name);
}

export function topLevelCategories(): CatalogCategory[] {
  return childCategories(null).filter((c) => c.subtreeProductCount > 0 || c.children.length > 0);
}

/** Ancestors of a category path, root first, including itself. */
export function categoryChain(path: string): CatalogCategory[] {
  const segs = path.split("/").filter(Boolean);
  const chain: CatalogCategory[] = [];
  for (let i = 1; i <= segs.length; i++) {
    const c = getCategory("/" + segs.slice(0, i).join("/"));
    if (c) chain.push(c);
  }
  return chain;
}

/** Complementary products for a product, in enrichment order, only real catalog items. */
export function complementaryProducts(productId: string, limit = 6): CatalogProduct[] {
  const e = getEnrichment(productId);
  if (!e) return [];
  const out: CatalogProduct[] = [];
  for (const sku of e.complementary) {
    const p = getProductBySku(sku);
    if (p && p.id !== productId && !out.some((x) => x.id === p.id)) out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

/** A compact, display-ready summary used by the assistant and the product cards. */
export interface ProductSummary {
  id: string;
  sku: string;
  name: string;
  path: string;
  url: string;
  category: string;
  categoryPath: string;
  image?: string;
  summary?: string;
  specs: Record<string, string>;
  pricing: CatalogProduct["pricing"];
  attributes: { name: string; options: string[] }[];
}

export function summarize(p: CatalogProduct): ProductSummary {
  const e = getEnrichment(p.id);
  const specs: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.specs).slice(0, 6)) specs[k] = v;
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    path: p.path,
    url: p.url,
    category: p.categoryNames[0] ?? "",
    categoryPath: p.categoryPath,
    image: p.images[0] ?? p.thumbnail,
    summary: e?.summary ?? p.shortDescription?.slice(0, 220),
    specs,
    pricing: p.pricing,
    attributes: p.attributes.map((a) => ({ name: a.name, options: a.options })),
  };
}

export function isOpenNow(date = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: company.hours.timezone, weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const day = company.hours.days.find((d) => d.day === parts.weekday);
  if (!day) return false;
  const now = `${parts.hour}:${parts.minute}`;
  return now >= day.open && now < day.close;
}

/* ------------------------------------------------------------------ */
/* search                                                               */
/* ------------------------------------------------------------------ */
import { createProductSearch } from "./search";
export const productSearch = createProductSearch(
  catalog.products,
  (id) => enrichedById.get(id),
  (path) => categoryChain(path).map((c) => c.name),
  catalog.categories.map((c) => ({ path: c.path, name: c.name, title: c.title })),
  (path) => enrichedCategoryByPath.get(path)?.complementaryCategories ?? [],
);
