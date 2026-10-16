/**
 * Catalog search: MiniSearch (fuzzy + prefix) over names, SKUs, enrichment search terms,
 * category chains, descriptions and specs, with buyer-vocabulary synonym expansion.
 * Pure module (no server-only imports) so it can be unit-tested directly.
 */
import MiniSearch from "minisearch";
import type { CatalogProduct, EnrichedProduct } from "../../scripts/lib/catalog-types";

/** What buyers say → what the catalog calls it. Keys are matched as whole phrases. */
export const SYNONYMS: Record<string, string> = {
  "pallet wrap": "stretch film",
  "pallet wrapping": "stretch film",
  "shrink wrap": "stretch film",
  "shrink film": "stretch film",
  "shrinkwrap": "stretch film",
  "stretch wrap": "stretch film",
  "cling wrap": "stretch film",
  "cling film": "stretch film",
  "plastic wrap": "stretch film",
  "machine wrap": "machine film",
  "hand wrap": "hand film",
  "pre stretched": "pre-stretched",
  "wrapping machine": "stretch wrap machine",
  "pallet wrapper": "stretch wrap machine",
  "stretch wrapper": "stretch wrap machine",
  "film dispenser": "stretch film dispenser",
  "wrap dispenser": "stretch film dispenser",
  "film handle": "stretch film dispenser",
  banding: "strapping",
  "steel banding": "steel strapping",
  "metal banding": "steel strapping",
  "metal strapping": "steel strapping",
  "plastic strapping": "poly strapping polyester strapping",
  "plastic banding": "poly strapping polyester strapping",
  "pp strapping": "polypropylene strapping",
  "pet strapping": "polyester strapping",
  "poly banding": "poly strapping",
  "strap clips": "seals buckles",
  "strapping clips": "seals buckles",
  "strap seals": "seals",
  "banding tool": "strapping tool",
  "strapping machine": "strapping tool",
  "strap tool": "strapping tool",
  crimper: "sealer",
  "crimping tool": "sealer",
  "bale wire": "baling wire",
  "bailing wire": "baling wire",
  "cardboard box": "corrugated box",
  "cardboard boxes": "corrugated boxes",
  "shipping box": "corrugated box",
  "shipping boxes": "corrugated boxes",
  "moving boxes": "corrugated boxes",
  "cardboard": "corrugated",
  "packing tape": "carton sealing tape",
  "box tape": "carton sealing tape",
  "shipping tape": "carton sealing tape",
  "clear tape": "carton sealing tape acrylic",
  "brown tape": "tan carton sealing tape",
  "gummed tape": "water activated tape",
  "paper tape": "water activated tape",
  "kraft tape": "water activated tape",
  "fiberglass tape": "filament strapping tape",
  "strapping tape": "filament strapping tape",
  "tape gun": "tape dispenser",
  "tape dispenser": "tape dispenser",
  "bubble wrap": "bubble wrap",
  "packing peanuts": "packing peanuts",
  "void fill": "packing peanuts kraft paper",
  "packing paper": "kraft paper newsprint",
  "wrapping paper": "kraft paper",
  "brown paper": "kraft paper",
  "foam sheets": "foam",
  "foam rolls": "foam",
  "corner protectors": "edge protectors",
  "corner boards": "edge protectors",
  "edge boards": "edge protectors",
  "angle boards": "edge protectors",
  "corner guards": "edge protectors",
  "trash bags": "trash liners",
  "garbage bags": "trash liners",
  "can liners": "trash liners",
  "garbage can liners": "trash liners",
  "ziplock": "reclosable bags",
  "zip lock": "reclosable bags",
  "ziploc": "reclosable bags",
  "zipper bags": "reclosable bags",
  "resealable bags": "reclosable bags",
  "plastic bags": "poly bags",
  "clear bags": "poly bags",
  "grocery bags": "t-shirt bags",
  "merchandise bags": "t-shirt bags",
  "plastic sheeting": "poly sheeting",
  "visqueen": "poly sheeting",
  "painters plastic": "poly sheeting paint and acoustic film",
  "drop cloth": "poly sheeting",
  "pallet bags": "pallet covers",
  "bin bags": "bin liners",
  "rubber gloves": "latex gloves nitrile gloves",
  "exam gloves": "nitrile gloves latex gloves vinyl gloves",
  "medical gloves": "nitrile gloves exam grade",
  "food gloves": "poly gloves vinyl gloves",
  "food service gloves": "poly gloves vinyl gloves",
  "work gloves": "gloves leather cotton string knit",
  "welding gloves": "welding gloves",
  "cut proof gloves": "cut-resistant gloves",
  "cut resistant": "cut-resistant",
  "dust mask": "face masks",
  "face mask": "face masks",
  "earplugs": "ear plugs",
  "ear muffs": "ear muffs",
  "hairnets": "hair nets",
  "hard hats": "hard hats",
  "safety glasses": "safety glasses and goggles",
  "goggles": "safety glasses and goggles",
  "hi vis": "safety vests",
  "high visibility": "safety vests",
  "reflective vest": "safety vests",
  "shoe covers": "disposable shoe covers",
  "booties": "disposable shoe covers",
  "toilet paper": "toilet paper",
  "bath tissue": "toilet paper",
  "paper towels": "paper towels",
  "hand towels": "paper towels multifold",
  "kleenex": "facial tissue",
  "tissues": "facial tissue",
  "hand sanitizer": "hand soap",
  "soap": "hand soap",
  "cleaner": "cleaners",
  "degreaser": "all purpose cleaners",
  "mop": "mop heads",
  "broom": "brooms",
  "sweeping compound": "floor sweep",
  "shop towels": "rags wipers",
  "shop rags": "rags",
  "cups": "disposable cups",
  "coffee cups": "disposable cups",
  "water cups": "disposable cups",
  "forks": "utensils",
  "spoons": "utensils",
  "knives": "utensils",
  "silverware": "utensils",
  "cutlery": "utensils",
  "plates": "plates and bowls",
  "bowls": "plates and bowls",
  "napkins": "napkins",
  "packing slip": "packing list envelopes",
  "packing slip envelopes": "packing list envelopes",
  "invoice envelopes": "packing list envelopes invoice enclosed",
  "mailing tube": "mailing tubes",
  "shipping tubes": "mailing tubes",
  "poster tubes": "mailing tubes",
  "padded envelopes": "bubble mailers",
  "padded mailers": "bubble mailers",
  "shipping envelopes": "mailers",
  "bubble bags": "bubble pouches",
  "fragile stickers": "fragile labels",
  "shipping labels": "labels",
  "thermal labels": "direct thermal labels",
  "zebra labels": "direct thermal labels thermal transfer labels",
  "barcode labels": "direct thermal labels thermal transfer labels",
  "printer ribbon": "printer ribbons",
  "sticker": "labels",
  "stickers": "labels",
  "truck rope": "california truck rope",
  "tie down rope": "rope",
  "string": "twine",
  "twine": "twine",
  "pull tape": "pull tape",
  "lumber wrap": "lumber bags and covers",
  "lumber covers": "lumber bags and covers",
  "lumber bags": "lumber bags and covers",
  "drywall covers": "drywall covers",
  "stretch wrap machine": "stretch wrap machine",
  "pallet jack": "",
  forklift: "",
};

const STOPWORDS = new Set(["i", "we", "a", "an", "the", "of", "for", "to", "and", "or", "in", "on", "with", "some", "any", "my", "our", "need", "needs", "want", "looking", "do", "does", "you", "have", "carry", "sell", "stock", "is", "are", "there", "what", "which", "that", "this", "it", "me", "can", "get", "buy", "please", "about", "like", "from", "at", "be", "your", "best", "good", "cheap", "cheapest", "price", "prices", "pricing", "quote", "day", "per", "much", "many", "how"]);

/** Normalize buyer text: lowercase, dimensions "12x12x12" → "12 x 12 x 12", inch/foot marks → words. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[“”"]/g, " in ")
    .replace(/[‘’']/g, " ft ")
    .replace(/(\d)\s*[x×*]\s*(?=\d)/g, "$1 x ")
    .replace(/(\d)\s*(?:gauge|ga)\b/g, "$1 gauge")
    .replace(/(\d)\s*mil\b/g, "$1 mil")
    .replace(/[^a-z0-9.+/#\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function expandSynonyms(query: string): { expanded: string; applied: string[] } {
  let q = ` ${normalizeText(query)} `;
  const applied: string[] = [];
  // longest keys first so "stretch wrap machine" wins over "stretch wrap"
  const keys = Object.keys(SYNONYMS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const needle = ` ${key} `;
    if (q.includes(needle)) {
      const repl = SYNONYMS[key];
      q = q.split(needle).join(` ${repl} `);
      applied.push(key);
    }
  }
  return { expanded: q.replace(/\s+/g, " ").trim(), applied };
}

function stripStopwords(q: string): string {
  return q
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t))
    .join(" ");
}

interface Doc {
  id: string;
  sku: string;
  name: string;
  terms: string;
  categories: string;
  desc: string;
  specs: string;
  summary: string;
  categoryPath: string;
}

export interface SearchHit {
  product: CatalogProduct;
  score: number;
  /** True when the hit was added because it goes with what was searched for (e.g. a dispenser for film). */
  companion?: boolean;
}

export interface ProductSearch {
  search: (query: string, opts?: { limit?: number; categoryPath?: string }) => SearchHit[];
  size: number;
}

export interface CategoryRef {
  path: string;
  name: string;
  title?: string;
}

export function createProductSearch(
  products: CatalogProduct[],
  getEnrichment: (id: string) => EnrichedProduct | undefined,
  categoryNames: (path: string) => string[],
  categories: CategoryRef[] = [],
  /** Cross-sell rules: category path → complementary category paths (from the enrichment families). */
  companionsOf: (categoryPath: string) => string[] = () => [],
): ProductSearch {
  const mini = new MiniSearch<Doc>({
    fields: ["sku", "name", "terms", "categories", "summary", "desc", "specs"],
    storeFields: ["id", "categoryPath"],
    tokenize: (text) => normalizeText(text).split(/[\s/]+/).filter(Boolean),
    processTerm: (term) => (term.length > 1 || /\d/.test(term) ? term : null),
    searchOptions: {
      prefix: (term) => term.length >= 3,
      fuzzy: (term) => (term.length >= 5 ? 0.2 : false),
      boost: { sku: 6, name: 3, terms: 2.5, categories: 2, summary: 1.2, desc: 1, specs: 1 },
      combineWith: "AND",
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const docs: Doc[] = products.map((p) => {
    const e = getEnrichment(p.id);
    const chain = categoryNames(p.categoryPath);
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      terms: (e?.searchTerms ?? []).join(" "),
      categories: [...chain, ...p.categoryNames].join(" "),
      summary: e?.summary ?? "",
      desc: p.shortDescription ?? "",
      specs: Object.entries(p.specs)
        .map(([k, v]) => `${k} ${v}`)
        .join(" "),
      categoryPath: p.categoryPath,
    };
  });
  mini.addAll(docs);
  const skuIndex = new Map(products.map((p) => [p.sku.toUpperCase(), p]));

  const run = (q: string, combineWith: "AND" | "OR") => (q ? mini.search(q, { combineWith }) : []);

  // Category intent: when the (expanded) query contains a category's name, products in that
  // subtree get a boost, so "pallet wrap" ranks film rolls above "Stretch Film Dispenser".
  const catIntent = categories
    .map((c) => ({ path: c.path, names: [...new Set([c.name, c.title ?? ""].map((n) => normalizeText(n)).filter((n) => n.length >= 4))] }))
    .filter((c) => c.names.length);
  const matchedCategories = (q: string): string[] => {
    const padded = ` ${q} `;
    return catIntent.filter((c) => c.names.some((n) => padded.includes(` ${n} `))).map((c) => c.path);
  };

  return {
    size: products.length,
    search(query, opts = {}) {
      const limit = opts.limit ?? 12;
      const scores = new Map<string, number>();
      const bump = (id: string, s: number) => scores.set(id, Math.max(scores.get(id) ?? 0, s));

      const raw = query.trim();
      const exactSku = skuIndex.get(raw.toUpperCase());
      if (exactSku) bump(exactSku.id, 1e6);

      const { expanded, applied } = expandSynonyms(raw);
      const expandedQ = stripStopwords(expanded);
      const rawQ = stripStopwords(normalizeText(raw));
      // when a synonym fired, the buyer's literal words matter less than what they mean
      const weighted: [string, number][] = applied.length && expandedQ !== rawQ ? [[expandedQ, 2], [rawQ, 0.5]] : [[expandedQ, 2]];
      let any = false;
      for (const [q, w] of weighted) {
        for (const r of run(q, "AND")) {
          any = true;
          bump(r.id, r.score * w);
        }
      }
      if (!any || scores.size < 3) {
        for (const [q, w] of weighted) for (const r of run(q, "OR")) bump(r.id, (r.score * w) / 2);
      }
      const intent = matchedCategories(expandedQ);
      let hits = [...scores.entries()]
        .map(([id, score]) => ({ product: byId.get(id)!, score }))
        .filter((h) => h.product)
        .map((h) => {
          const inIntent = intent.some((cp) => h.product.categoryPaths.some((x) => x === cp || x.startsWith(cp + "/")));
          return inIntent ? { ...h, score: h.score * 1.6 + 50 } : h;
        });
      if (opts.categoryPath) hits = hits.filter((h) => h.product.categoryPaths.some((cp) => cp === opts.categoryPath || cp.startsWith(opts.categoryPath + "/")));
      hits.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
      // diversify: cap how many results come from any one leaf category so a 150-roll film
      // family doesn't crowd out the dispenser that goes with it
      const perCategory = Math.max(3, Math.ceil(limit / 3));
      const counts = new Map<string, number>();
      const picked: SearchHit[] = [];
      const overflow: SearchHit[] = [];
      for (const h of hits) {
        const key = h.product.categoryPath;
        const n = counts.get(key) ?? 0;
        if (n < perCategory) {
          counts.set(key, n + 1);
          picked.push(h);
        } else overflow.push(h);
        if (picked.length >= limit) break;
      }
      let results = [...picked, ...overflow].slice(0, limit);
      // Companions: when the query names a category, reserve up to two slots for what goes with it
      // ("stretch film" → film rolls + a film dispenser), walking up the chain for the rule.
      if (intent.length && limit >= 6) {
        const companionCats: string[] = [];
        for (const cp of intent) {
          const segs = cp.split("/").filter(Boolean);
          for (let i = segs.length; i > 0 && !companionCats.length; i--) companionCats.push(...companionsOf("/" + segs.slice(0, i).join("/")));
        }
        const chosen: SearchHit[] = [];
        for (const cc of companionCats) {
          if (chosen.length >= 2) break;
          if (results.some((h) => h.product.categoryPaths.some((x) => x === cc || x.startsWith(cc + "/")))) continue;
          const best = hits.find((h) => h.product.categoryPaths.some((x) => x === cc || x.startsWith(cc + "/"))) ?? (() => {
            const p = products.find((x) => x.categoryPaths.some((y) => y === cc || y.startsWith(cc + "/")));
            return p ? { product: p, score: 0 } : undefined;
          })();
          if (best && !chosen.some((c) => c.product.id === best.product.id)) chosen.push({ ...best, companion: true });
        }
        if (chosen.length) results = [...results.slice(0, limit - chosen.length), ...chosen];
      }
      return results;
    },
  };
}
