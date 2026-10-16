import { describe, expect, it } from "vitest";
import { buildSearch } from "./helpers";
import { expandSynonyms, normalizeText } from "../src/lib/search";

const { catalog, enriched, search } = buildSearch();

const inCategory = (p: { categoryPaths: string[] }, prefix: string) => p.categoryPaths.some((c) => c === prefix || c.startsWith(prefix + "/"));

describe("catalog search", () => {
  it("loads a real catalog", () => {
    expect(catalog.products.length).toBeGreaterThan(1000);
    expect(catalog.categories.length).toBeGreaterThan(100);
  });

  it("'white gloves' returns gloves", () => {
    const hits = search.search("white gloves", { limit: 8 });
    expect(hits.length).toBeGreaterThan(0);
    const gloves = hits.filter((h) => inCategory(h.product, "/gloves"));
    expect(gloves.length).toBeGreaterThanOrEqual(Math.ceil(hits.length / 2));
    expect(hits.some((h) => /white/i.test(h.product.name + " " + (h.product.shortDescription ?? "")))).toBe(true);
  });

  it("'stretch film' returns film and its dispenser", () => {
    const hits = search.search("stretch film", { limit: 12 });
    expect(hits[0] && inCategory(hits[0].product, "/stretch-film")).toBe(true);
    expect(hits.filter((h) => inCategory(h.product, "/stretch-film")).length).toBeGreaterThanOrEqual(6);
    expect(hits.some((h) => inCategory(h.product, "/tools/stretch-film-dispensers") || /dispenser/i.test(h.product.name))).toBe(true);
    // the dispenser is flagged as a companion ("goes with it"), not a keyword match
    expect(hits.some((h) => h.companion && /dispenser/i.test(h.product.name))).toBe(true);
    // and the cross-sell data points hand-film buyers at a dispenser (extended-core rolls excepted: they have handles)
    const dispenserSkus = new Set(catalog.products.filter((p) => inCategory(p, "/tools/stretch-film-dispensers")).map((p) => p.sku));
    const handFilm = catalog.products.filter((p) => inCategory(p, "/stretch-film/hand-film") && !inCategory(p, "/stretch-film/hand-film/extended-core"));
    const withDispenser = handFilm.filter((p) => enriched.products.find((e) => e.id === p.id)!.complementary.some((sku) => dispenserSkus.has(sku)));
    expect(withDispenser.length).toBe(handFilm.length);
  });

  it("maps buyer vocabulary: 'pallet wrap' and 'shrink wrap' find stretch film", () => {
    for (const q of ["pallet wrap", "shrink wrap"]) {
      const hits = search.search(q, { limit: 10 });
      expect(hits.length, q).toBeGreaterThan(0);
      expect(hits.filter((h) => inCategory(h.product, "/stretch-film")).length, q).toBeGreaterThanOrEqual(Math.ceil(hits.length / 2));
    }
  });

  it("finds strapping for 'steel banding' and poly strapping for 'plastic strapping'", () => {
    const steel = search.search("steel banding", { limit: 10 });
    expect(steel.some((h) => inCategory(h.product, "/strapping/steel"))).toBe(true);
    const poly = search.search("plastic strapping", { limit: 10 });
    expect(poly.some((h) => inCategory(h.product, "/strapping/plastic-strapping"))).toBe(true);
  });

  it("matches an exact SKU first", () => {
    const sample = catalog.products.find((p) => p.sku && p.listingType === "table")!;
    const hits = search.search(sample.sku);
    expect(hits[0].product.id).toBe(sample.id);
  });

  it("finds boxes by dimensions like 12x12x12", () => {
    const hits = search.search("12x12x12 boxes", { limit: 10 });
    expect(hits.some((h) => inCategory(h.product, "/corrugated-boxes"))).toBe(true);
  });

  it("does not pretend to carry forklifts (only forklift accessories and labels exist)", () => {
    const hits = search.search("forklift", { limit: 5 });
    // MLR sells a forklift-mounted strap dispenser and "Do Not Forklift" labels — never a forklift
    expect(hits.every((h) => /dispenser|label|do not|no forklift/i.test(h.product.name) || inCategory(h.product, "/labels"))).toBe(true);
    expect(hits.every((h) => !inCategory(h.product, "/machines"))).toBe(true);
  });

  it("normalizes dimensions and synonyms", () => {
    expect(normalizeText('18" x 1500\' 80 gauge')).toContain("18 in x 1500 ft 80 gauge");
    expect(expandSynonyms("I need pallet wrap").expanded).toContain("stretch film");
    expect(expandSynonyms("cardboard boxes").expanded).toContain("corrugated boxes");
  });
});
