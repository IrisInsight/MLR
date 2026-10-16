#!/usr/bin/env tsx
/**
 * npm run enrich — expands the hand-written enrichment sources in data/enrichment/ into
 * data/enriched.json (one entry per catalog product), then validates every reference.
 *
 * Sources (all written by hand, no model calls):
 *   data/enrichment/families*.json  — per category path: plain-English summary, use cases,
 *                                     buyer search terms, key qualifying questions, cross-sell rules
 *   data/enrichment/products.json   — per-SKU overrides / one-off products (machines, tools…)
 *   data/enrichment/guides.json     — buying guides
 *   data/enrichment/industries.json — industry kits
 *
 * A product inherits the nearest family up its category chain; its summary is the family blurb
 * plus a sentence built from the product's own catalog specs, so nothing is invented.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BuyingGuide, Catalog, CatalogProduct, Enriched, EnrichedProduct } from "./lib/catalog-types";
import { validateEnrichment } from "./lib/validate";

export interface Family {
  /** One or two sentences describing the family in plain English. */
  summary: string;
  useCases: string[];
  searchTerms: string[];
  keyQuestions: string[];
  /** Complementary rules: explicit SKUs and/or category paths to pick representative items from. */
  complementary: { skus?: string[]; categories?: string[]; max?: number };
  /** Optional per-product summary template; {name} {sku} {spec:Gauge} {specs} are substituted. */
  template?: string;
  /** Extra words to add to each product's search terms. */
  productTerms?: string[];
}

export interface ProductOverride {
  summary?: string;
  useCases?: string[];
  searchTerms?: string[];
  keyQuestions?: string[];
  complementary?: string[];
}

const root = process.cwd();
const read = <T>(p: string): T => JSON.parse(readFileSync(path.join(root, p), "utf8"));
const catalog = read<Catalog>("data/catalog.json");
// families may be split across several files (families.json, families-janitorial.json, …)
const families: Record<string, Family> = Object.assign(
  {},
  ...readdirSync(path.join(root, "data/enrichment"))
    .filter((f) => /^families.*\.json$/.test(f))
    .sort()
    .map((f) => read<Record<string, Family>>(`data/enrichment/${f}`)),
);
const overrides = read<Record<string, ProductOverride>>("data/enrichment/products.json");
const guides = read<BuyingGuide[]>("data/enrichment/guides.json");
const industries = read<Enriched["industries"]>("data/enrichment/industries.json");

const catByPath = new Map(catalog.categories.map((c) => [c.path, c]));
const bySku = new Map(catalog.products.map((p) => [p.sku.toUpperCase(), p]));
const productsByCat = new Map<string, CatalogProduct[]>();
for (const p of catalog.products) {
  for (const cp of p.categoryPaths) {
    const arr = productsByCat.get(cp) ?? [];
    arr.push(p);
    productsByCat.set(cp, arr);
  }
}
const subtree = (cp: string): CatalogProduct[] => {
  const out: CatalogProduct[] = [];
  const seen = new Set<string>();
  const walk = (p: string) => {
    for (const x of productsByCat.get(p) ?? []) if (!seen.has(x.id)) (seen.add(x.id), out.push(x));
    for (const c of catByPath.get(p)?.children ?? []) walk(c);
  };
  walk(cp);
  return out;
};

/** Nearest family definition walking up the category chain (most specific wins). */
function familyFor(p: CatalogProduct): { path: string; family: Family } | undefined {
  for (const cp of [p.categoryPath, ...p.categoryPaths]) {
    const segs = cp.split("/").filter(Boolean);
    for (let i = segs.length; i > 0; i--) {
      const path = "/" + segs.slice(0, i).join("/");
      if (families[path]) return { path, family: families[path] };
    }
  }
  return undefined;
}

function specSentence(p: CatalogProduct): string {
  const entries = Object.entries(p.specs).filter(([k, v]) => v && !/price|add to cart/i.test(k));
  if (!entries.length) return "";
  const parts = entries.slice(0, 6).map(([k, v]) => {
    const key = k.replace(/\s*\(.*\)$/, "").trim();
    if (/^size$/i.test(key) || /box size/i.test(key)) return `${v}`;
    if (/gauge/i.test(key)) return `${v} gauge`;
    if (/thickness/i.test(key)) return `${v} thick`;
    if (/^width$/i.test(key)) return `${v} wide`;
    if (/length/i.test(key)) return `${v} long`;
    if (/break strength/i.test(key)) return `${v} break strength`;
    return `${key.toLowerCase()}: ${v}`;
  });
  return `This item: ${parts.join(", ")}.`;
}

function fill(template: string, p: CatalogProduct): string {
  return template
    .replace(/\{name\}/g, p.name)
    .replace(/\{sku\}/g, p.sku)
    .replace(/\{specs\}/g, specSentence(p))
    .replace(/\{spec:([^}]+)\}/g, (_, key: string) => {
      const hit = Object.entries(p.specs).find(([k]) => k.toLowerCase().startsWith(key.toLowerCase()));
      return hit ? hit[1] : "";
    })
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Words from the product name/description that buyers also type (colors, grades, sizes). */
function productTerms(p: CatalogProduct): string[] {
  const text = `${p.name} ${p.shortDescription ?? ""}`.toLowerCase();
  const terms = new Set<string>();
  for (const w of ["white", "black", "blue", "clear", "red", "green", "yellow", "orange", "pink", "tan", "natural", "kraft", "brown", "indigo", "lavender", "gray", "grey", "silver"]) if (new RegExp(`\\b${w}\\b`).test(text)) terms.add(w);
  for (const w of ["industrial grade", "exam grade", "powder-free", "powder free", "heavy duty", "light duty", "medium duty", "economy", "premium", "pre-stretched", "extended core", "cast", "blown", "hand grade", "machine grade", "anti-static", "flame retardant", "latex-free", "textured", "lined", "unlined", "disposable", "reclosable", "gusseted", "flat", "clear", "printed"]) if (text.includes(w)) terms.add(w);
  const dims = text.match(/\d+(?:\.\d+)?\s*(?:"|in|inch)?\s*x\s*\d+(?:\.\d+)?(?:\s*(?:"|'|ft|in))?(?:\s*x\s*\d+(?:\.\d+)?)?/g);
  for (const d of dims ?? []) terms.add(d.replace(/\s+/g, " ").trim());
  const gauge = text.match(/\b(\d{2,3})\s*gauge\b/);
  if (gauge) terms.add(`${gauge[1]} gauge`);
  const mil = text.match(/\b(\d+(?:\.\d+)?)\s*mil\b/);
  if (mil) terms.add(`${mil[1]} mil`);
  return [...terms];
}

function pickFromCategory(catPath: string, exclude: Set<string>, n: number, salt: number): CatalogProduct[] {
  const pool = subtree(catPath).filter((x) => !exclude.has(x.id));
  if (!pool.length) return [];
  // deterministic but varied: rotate the pool by the product's index so siblings don't all point at the same item
  const start = pool.length ? salt % pool.length : 0;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  return rotated.slice(0, n);
}

function complementaryFor(p: CatalogProduct, fam: Family, salt: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>([p.id]);
  const push = (x?: CatalogProduct) => {
    if (x && !seen.has(x.id)) {
      seen.add(x.id);
      out.push(x.sku);
    }
  };
  for (const sku of fam.complementary.skus ?? []) push(bySku.get(sku.toUpperCase()));
  for (const cp of fam.complementary.categories ?? []) {
    if (!catByPath.has(cp)) throw new Error(`family complementary category ${cp} does not exist`);
    for (const x of pickFromCategory(cp, seen, 1, salt)) push(x);
  }
  const max = fam.complementary.max ?? 6;
  return out.slice(0, max);
}

const enrichedProducts: EnrichedProduct[] = [];
const missingFamily = new Map<string, number>();
catalog.products.forEach((p, i) => {
  const hit = familyFor(p);
  const ov = overrides[p.sku] ?? overrides[p.sku.toUpperCase()];
  if (!hit && !ov?.summary) {
    missingFamily.set(p.categoryPath, (missingFamily.get(p.categoryPath) ?? 0) + 1);
  }
  const fam: Family = hit?.family ?? { summary: p.shortDescription ?? p.name, useCases: [], searchTerms: [], keyQuestions: [], complementary: {} };
  const summary = ov?.summary ?? (fam.template ? fill(fam.template, p) : [fam.summary, specSentence(p)].filter(Boolean).join(" "));
  const searchTerms = [...new Set([...(ov?.searchTerms ?? []), ...fam.searchTerms, ...(fam.productTerms ?? []), ...productTerms(p)])];
  let complementary = ov?.complementary ?? complementaryFor(p, fam, i);
  complementary = complementary.filter((s, idx, arr) => bySku.has(s.toUpperCase()) && arr.indexOf(s) === idx && bySku.get(s.toUpperCase())!.id !== p.id);
  enrichedProducts.push({
    id: p.id,
    sku: p.sku,
    path: p.path,
    summary,
    useCases: ov?.useCases ?? fam.useCases,
    searchTerms,
    keyQuestions: ov?.keyQuestions ?? fam.keyQuestions,
    complementary,
  });
});

const categories = Object.entries(families)
  .filter(([path]) => catByPath.has(path))
  .map(([path, f]) => ({ path, summary: f.summary, searchTerms: f.searchTerms, useCases: f.useCases, keyQuestions: f.keyQuestions, complementaryCategories: (f.complementary.categories ?? []).filter((c) => catByPath.has(c)) }));

const enriched: Enriched = { generatedAt: new Date().toISOString(), products: enrichedProducts, categories, buyingGuides: guides, industries };
const result = validateEnrichment(catalog, enriched);
if (missingFamily.size) {
  console.log(`categories without a family (products fall back to their short description): ${missingFamily.size}`);
  for (const [cp, n] of [...missingFamily.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`  ${cp} (${n})`);
}
if (result.errors.length) {
  console.error(`ERRORS (${result.errors.length}):\n  ` + result.errors.slice(0, 40).join("\n  "));
  process.exit(1);
}
writeFileSync(path.join(root, "data/enriched.json"), JSON.stringify(enriched, null, 1));
console.log(`enriched ${enrichedProducts.length} products (${enrichedProducts.filter((e) => e.complementary.length >= 3).length} with 3+ complementary items), ${categories.length} categories, ${guides.length} guides, ${industries.length} industries → data/enriched.json`);
if (result.warnings.length) console.log(`warnings: ${result.warnings.length}`);
