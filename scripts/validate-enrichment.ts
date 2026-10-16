#!/usr/bin/env tsx
/** npm run validate — fails (exit 1) if data/enriched.json references anything not in data/catalog.json. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { validateEnrichment } from "./lib/validate";
import type { Catalog, Enriched } from "./lib/catalog-types";

const root = process.cwd();
const catalog: Catalog = JSON.parse(readFileSync(path.join(root, "data/catalog.json"), "utf8"));
const enriched: Enriched = JSON.parse(readFileSync(path.join(root, "data/enriched.json"), "utf8"));
const result = validateEnrichment(catalog, enriched);
console.log(`validate-enrichment: ${result.stats.enriched}/${result.stats.products} products enriched, ${result.stats.complementaryLinks} complementary links, ${result.stats.guides} guides, ${result.stats.categories} categories`);
if (result.warnings.length) console.log(`warnings: ${result.warnings.length} (first 5)\n  ` + result.warnings.slice(0, 5).join("\n  "));
if (result.errors.length) {
  console.error(`ERRORS: ${result.errors.length}\n  ` + result.errors.slice(0, 30).join("\n  "));
  process.exit(1);
}
console.log("OK — every complementary SKU, category path and quick pick exists in the catalog.");
