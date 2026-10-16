import { describe, expect, it } from "vitest";
import { loadCatalog, loadEnriched } from "./helpers";
import { validateEnrichment } from "../scripts/lib/validate";

describe("enrichment", () => {
  const catalog = loadCatalog();
  const enriched = loadEnriched();
  it("validates against the catalog (every complementary SKU/URL exists)", () => {
    const result = validateEnrichment(catalog, enriched);
    expect(result.errors, result.errors.slice(0, 10).join("\n")).toHaveLength(0);
  });
  it("covers every product", () => {
    const ids = new Set(enriched.products.map((e) => e.id));
    const missing = catalog.products.filter((p) => !ids.has(p.id));
    expect(missing.length, `missing enrichment for ${missing.slice(0, 5).map((m) => m.sku).join(", ")}`).toBe(0);
  });
});
