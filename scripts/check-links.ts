#!/usr/bin/env tsx
/**
 * npm run check-links — confirms every product URL the app can link to resolves inside the catalog:
 *  - every product path and canonical path is unique and maps back to its product
 *  - every category path referenced by a product exists
 *  - every "related product" and complementary reference exists
 *  - (optional, --live) HEAD-checks a sample of live mlrpackaging.com product URLs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Catalog, Enriched } from "./lib/catalog-types";

const live = process.argv.includes("--live");
const root = process.cwd();
const catalog: Catalog = JSON.parse(readFileSync(path.join(root, "data/catalog.json"), "utf8"));
const enriched: Enriched = JSON.parse(readFileSync(path.join(root, "data/enriched.json"), "utf8"));

const errors: string[] = [];
const paths = new Map<string, string>();
const catPaths = new Set(catalog.categories.map((c) => c.path));
const bySku = new Map(catalog.products.map((p) => [p.sku.toUpperCase(), p]));

for (const p of catalog.products) {
  if (!p.path.startsWith("/")) errors.push(`${p.sku}: bad path ${p.path}`);
  if (paths.has(p.path) && paths.get(p.path) !== p.id) errors.push(`${p.sku}: path ${p.path} collides with product ${paths.get(p.path)}`);
  paths.set(p.path, p.id);
  if (!p.url.startsWith("https://www.mlrpackaging.com/")) errors.push(`${p.sku}: live url ${p.url} is not on mlrpackaging.com`);
  for (const cp of p.categoryPaths) if (!catPaths.has(cp)) errors.push(`${p.sku}: category ${cp} missing`);
  for (const r of p.relatedProducts) if (!paths.has(r.path) && !catalog.products.some((x) => x.path === r.path)) errors.push(`${p.sku}: related product ${r.path} missing`);
}
for (const e of enriched.products) for (const sku of e.complementary) if (!bySku.has(sku.toUpperCase())) errors.push(`${e.sku}: complementary ${sku} missing`);
for (const c of catalog.categories) {
  if (c.parentPath && !catPaths.has(c.parentPath)) errors.push(`category ${c.path}: parent ${c.parentPath} missing`);
  for (const ch of c.children) if (!catPaths.has(ch)) errors.push(`category ${c.path}: child ${ch} missing`);
}

console.log(`check-links: ${catalog.products.length} products, ${catalog.categories.length} categories, ${paths.size} unique product paths`);

async function liveCheck() {
  const sample = catalog.products.filter((_, i) => i % Math.ceil(catalog.products.length / 25) === 0).slice(0, 25);
  let bad = 0;
  for (const p of sample) {
    try {
      const res = await fetch(p.url, { method: "GET", headers: { "user-agent": "Mozilla/5.0 MLR-concept-link-check" }, signal: AbortSignal.timeout(20000) });
      const html = await res.text();
      const ok = res.status === 200 && !/Page not found/i.test(html);
      if (!ok) {
        bad += 1;
        errors.push(`live ${p.url} → ${res.status}${/Page not found/i.test(html) ? " (soft 404)" : ""}`);
      }
    } catch (err) {
      bad += 1;
      errors.push(`live ${p.url} → ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  console.log(`live sample: ${sample.length - bad}/${sample.length} product URLs resolve on mlrpackaging.com`);
}

(async () => {
  if (live) await liveCheck();
  if (errors.length) {
    console.error(`ERRORS: ${errors.length}\n  ` + errors.slice(0, 30).join("\n  "));
    process.exit(1);
  }
  console.log("OK — every product URL exists in the catalog and every reference resolves.");
})();
