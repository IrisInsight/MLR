#!/usr/bin/env tsx
/**
 * Polite, rerunnable crawler for https://www.mlrpackaging.com (nopCommerce).
 *
 *   npm run scrape                 # uses scrape-cache/ when available
 *   npm run scrape -- --fresh      # ignore the cache and refetch everything
 *   npm run scrape -- --only /stretch-film --limit 40   # quick subset for testing
 *
 * Etiquette: at most 2 concurrent requests, a delay after every network request,
 * a descriptive user agent, retries with backoff, and all raw HTML cached under
 * scrape-cache/ (gitignored) so reruns don't hit the site again.
 *
 * Outputs: data/catalog.json, data/scrape-report.json, data/scrape-report.md
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  BASE,
  cleanText,
  parseCategoryPage,
  parseHeaderContact,
  parseHomeCategories,
  parseHtmlSitemap,
  parseMegaMenu,
  parseProductPage,
  parseSitemapXml,
  parseTopicPage,
  type ListedProduct,
  type ParsedCategoryPage,
  type ParsedProductPage,
  type Pricing,
  type ProductAttribute,
} from "./lib/scrape-parsers";

/* ------------------------------------------------------------------ */
/* CLI                                                                  */
/* ------------------------------------------------------------------ */

const { values: args } = parseArgs({
  options: {
    fresh: { type: "boolean", default: false },
    concurrency: { type: "string", default: "2" },
    delay: { type: "string", default: "500" },
    only: { type: "string" },
    limit: { type: "string" },
    "skip-products": { type: "boolean", default: false },
    out: { type: "string", default: "data" },
  },
});

const CONCURRENCY = Math.min(2, Math.max(1, Number(args.concurrency) || 2)); // never more than 2
const DELAY_MS = Math.max(250, Number(args.delay) || 600);
const ONLY = args.only ? args.only.replace(/\/$/, "") : undefined;
const LIMIT = args.limit ? Number(args.limit) : undefined;
const OUT_DIR = path.resolve(process.cwd(), args.out ?? "data");
const CACHE_DIR = path.resolve(process.cwd(), "scrape-cache");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 MLR-concept-catalog-mirror/1.0 (family-authorized; contact: site owner)";

/* ------------------------------------------------------------------ */
/* fetcher with cache + politeness                                      */
/* ------------------------------------------------------------------ */

interface CacheEntry {
  file: string;
  status: number;
  fetchedAt: string;
  finalUrl?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Fetcher {
  private index: Record<string, CacheEntry> = {};
  private slots = CONCURRENCY;
  private waiters: (() => void)[] = [];
  stats = { network: 0, cached: 0, failed: 0, retries: 0, bytes: 0 };

  async init() {
    await mkdir(path.join(CACHE_DIR, "pages"), { recursive: true });
    try {
      this.index = JSON.parse(await readFile(path.join(CACHE_DIR, "index.json"), "utf8"));
    } catch {
      this.index = {};
    }
  }

  async saveIndex() {
    await writeFile(path.join(CACHE_DIR, "index.json"), JSON.stringify(this.index, null, 1));
  }

  private async acquire() {
    if (this.slots > 0) {
      this.slots -= 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  private release() {
    const next = this.waiters.shift();
    if (next) next();
    else this.slots += 1;
  }

  async get(url: string, opts: { bypassCache?: boolean } = {}): Promise<{ html: string; status: number; fromCache: boolean }> {
    const key = createHash("sha1").update(url).digest("hex");
    const file = path.join(CACHE_DIR, "pages", `${key}.html`);
    const entry = this.index[url];
    // Only reuse successful fetches; failed/soft-404 pages are retried on every run.
    if (!args.fresh && !opts.bypassCache && entry && entry.status === 200) {
      try {
        await access(file);
        const html = await readFile(file, "utf8");
        this.stats.cached += 1;
        return { html, status: entry.status, fromCache: true };
      } catch {
        /* fall through to network */
      }
    }
    await this.acquire();
    try {
      let lastErr: unknown;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await fetch(url, {
            headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "accept-language": "en-US,en;q=0.9" },
            redirect: "follow",
            signal: AbortSignal.timeout(45_000),
          });
          const html = await res.text();
          this.stats.network += 1;
          this.stats.bytes += html.length;
          if (res.status >= 500 || res.status === 429) {
            lastErr = new Error(`HTTP ${res.status}`);
            this.stats.retries += 1;
            await sleep(DELAY_MS * (attempt + 2) * 2);
            continue;
          }
          // nopCommerce returns its "Page not found" view with HTTP 200 (soft 404)
          const status = res.status === 200 && /<title>[^<]*Page not found/i.test(html) ? 404 : res.status;
          await writeFile(file, html);
          this.index[url] = { file: path.basename(file), status, fetchedAt: new Date().toISOString(), finalUrl: res.url !== url ? res.url : undefined };
          await sleep(DELAY_MS);
          return { html, status, fromCache: false };
        } catch (err) {
          lastErr = err;
          this.stats.retries += 1;
          await sleep(DELAY_MS * (attempt + 2) * 2);
        }
      }
      this.stats.failed += 1;
      throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    } finally {
      this.release();
    }
  }
}

/* ------------------------------------------------------------------ */
/* data model                                                           */
/* ------------------------------------------------------------------ */

export interface CatalogCategory {
  id?: number;
  path: string;
  slug: string;
  seName?: string;
  name: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  image?: string;
  parentPath: string | null;
  depth: number;
  children: string[];
  listingType: "subcategories" | "table" | "grid" | "mixed" | "empty";
  tables: { id: string; heading?: string; columns: string[] }[];
  productIds: string[];
  productCount: number;
  subtreeProductCount: number;
  pagesFetched: number;
  discoveredVia: "nav" | "subcategory" | "sitemap";
  breadcrumb: { name: string; path: string }[];
  /** Other live-site paths that show the same category (flat SeNames from the sitemap). */
  aliases?: string[];
}

export interface CatalogProduct {
  id: string;
  sku: string;
  vendorSku?: string;
  name: string;
  url: string;
  path: string;
  /** The flat nopCommerce SeName path that always resolves on the live site (e.g. /hand-film-cast-55-gauge-175-x-1000). */
  canonicalPath: string;
  categoryPath: string;
  categoryPaths: string[];
  categoryNames: string[];
  breadcrumb: { name: string; path: string }[];
  listingType: "table" | "grid";
  tableId?: string;
  tableHeading?: string;
  shortDescription?: string;
  fullDescription?: string;
  specs: Record<string, string>;
  attributes: ProductAttribute[];
  pricing: Pricing;
  images: string[];
  thumbnail?: string;
  imageIsCategoryImage: boolean;
  videoId?: string;
  relatedProducts: { path: string; name: string; id?: string }[];
  tags: string[];
  meta: { title?: string; description?: string; keywords?: string };
  detailStatus: "ok" | "missing" | "error";
}

interface CategoryWork {
  record: CatalogCategory;
  listed: ListedProduct[];
  subcats: { id?: number; name: string; path: string; image?: string }[];
}

/* ------------------------------------------------------------------ */
/* crawl                                                                */
/* ------------------------------------------------------------------ */

const fetcher = new Fetcher();
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

/** name (lowercased) -> flat slugs, learned from the HTML sitemap; used when a nested theme URL 404s. */
const slugsByName = new Map<string, string[]>();

async function fetchCategory(pathname: string, discoveredVia: CatalogCategory["discoveredVia"], parentPath: string | null, navName?: string, navId?: number): Promise<CategoryWork | null> {
  let url = BASE + pathname;
  let res: Awaited<ReturnType<Fetcher["get"]>> | undefined;
  try {
    res = await fetcher.get(url);
  } catch (err) {
    log("✗ category fetch failed", pathname, (err as Error).message);
    return null;
  }
  let resolvedPath = pathname;
  if (res.status !== 200 && navName) {
    // The theme builds nested URLs from category *names*; when a category's SeName differs
    // (e.g. "Bulk Pre-Stretched" -> /bulk-pre-stretched-hand-film) the nested link 404s.
    const expectedParent = parentPath ?? "";
    for (const slug of slugsByName.get(navName.toLowerCase()) ?? []) {
      try {
        const r = await fetcher.get(`${BASE}/${slug}`);
        if (r.status !== 200) continue;
        const parsed = parseCategoryPage(r.html);
        const crumbs = parsed.breadcrumb.filter((c) => c.path && c.path !== "/");
        const parentCrumb = crumbs.length ? crumbs[crumbs.length - 1].path : "";
        if (parentCrumb === expectedParent || !expectedParent) {
          res = r;
          url = `${BASE}/${slug}`;
          resolvedPath = `/${slug}`;
          log(`↪ ${pathname} resolved via sitemap slug /${slug}`);
          break;
        }
      } catch {
        /* try next candidate */
      }
    }
  }
  if (!res || res.status !== 200) {
    log("✗ category", pathname, "HTTP", res?.status);
    return null;
  }
  const first = parseCategoryPage(res.html);
  const pages: ParsedCategoryPage[] = [first];
  // pagination: nopCommerce shows a window of page links; iterate until no new page appears
  const known = new Set<number>([1, ...first.pageNumbers]);
  const fetched = new Set<number>([1]);
  while (true) {
    const next = [...known].filter((n) => !fetched.has(n)).sort((a, b) => a - b)[0];
    if (!next) break;
    fetched.add(next);
    try {
      const r = await fetcher.get(`${url}?pagenumber=${next}`);
      if (r.status === 200) {
        const parsed = parseCategoryPage(r.html);
        pages.push(parsed);
        parsed.pageNumbers.forEach((n) => known.add(n));
      }
    } catch (err) {
      log("✗ page fetch failed", pathname, next, (err as Error).message);
    }
  }
  const listed: ListedProduct[] = [];
  const seenIds = new Set<string>();
  for (const p of pages) {
    for (const lp of p.products) {
      const key = lp.id || lp.path;
      if (seenIds.has(key)) continue;
      seenIds.add(key);
      listed.push(lp);
    }
  }
  const slug = pathname.split("/").filter(Boolean).pop() ?? "";
  const hasSub = first.subcategories.length > 0;
  const hasTable = first.tables.length > 0;
  const hasGrid = pages.some((p) => p.products.some((x) => x.listingType === "grid"));
  const listingType: CatalogCategory["listingType"] = hasSub && (hasTable || hasGrid) ? "mixed" : hasSub ? "subcategories" : hasTable ? "table" : hasGrid ? "grid" : "empty";
  const record: CatalogCategory = {
    id: navId,
    path: pathname,
    slug,
    name: navName || first.breadcrumb[first.breadcrumb.length - 1]?.name || first.title,
    title: first.title,
    description: first.description,
    descriptionHtml: first.descriptionHtml,
    image: first.image,
    parentPath,
    depth: pathname.split("/").filter(Boolean).length,
    children: first.subcategories.map((s) => s.path),
    listingType,
    tables: first.tables,
    productIds: [],
    productCount: listed.length,
    subtreeProductCount: 0,
    pagesFetched: pages.length,
    discoveredVia,
    breadcrumb: first.breadcrumb,
    seName: resolvedPath !== pathname ? resolvedPath.replace(/^\//, "") : undefined,
  };
  return { record, listed, subcats: first.subcategories };
}

async function crawlCategories(seeds: { name: string; path: string; id?: number; image?: string }[]): Promise<Map<string, CategoryWork>> {
  const work = new Map<string, CategoryWork>();
  const tileImage = new Map<string, string>(seeds.flatMap((s) => (s.image ? [[s.path, s.image] as const] : [])));
  const pendingParents = new Map<string, { parent: string | null; name?: string; id?: number; via: CatalogCategory["discoveredVia"] }>();
  type Frontier = { path: string; parent: string | null; name?: string; id?: number; via: CatalogCategory["discoveredVia"] }[];
  let frontier: Frontier = seeds.map((s) => ({ path: s.path, parent: null, name: s.name, id: s.id, via: "nav" }));
  while (frontier.length) {
    const results = await Promise.all(
      frontier.map(async (f) => {
        if (work.has(f.path)) return null;
        const w = await fetchCategory(f.path, f.via, f.parent, f.name, f.id);
        if (w) {
          if (!w.record.image && tileImage.has(f.path)) w.record.image = tileImage.get(f.path);
          work.set(f.path, w);
        }
        return w ? { w, f } : null;
      }),
    );
    const next: Frontier = [];
    for (const r of results) {
      if (!r) continue;
      for (const sub of r.w.subcats) {
        if (sub.image && !/default-image/.test(sub.image)) tileImage.set(sub.path, sub.image);
        if (work.has(sub.path) || pendingParents.has(sub.path)) continue;
        pendingParents.set(sub.path, { parent: r.f.path, name: sub.name, id: sub.id, via: "subcategory" });
        next.push({ path: sub.path, parent: r.f.path, name: sub.name, id: sub.id, via: "subcategory" });
      }
    }
    log(`categories: ${work.size} crawled, ${next.length} discovered`);
    frontier = next;
  }
  return work;
}

async function fetchProduct(p: ListedProduct, categoryPaths: string[], categoryNames: string[]): Promise<CatalogProduct> {
  const url = BASE + p.path;
  const base: CatalogProduct = {
    id: p.id,
    sku: p.sku,
    name: p.name,
    url,
    path: p.path,
    canonicalPath: p.path,
    categoryPath: categoryPaths[0],
    categoryPaths,
    categoryNames,
    breadcrumb: [],
    listingType: p.listingType,
    tableId: p.tableId,
    tableHeading: p.tableHeading,
    shortDescription: p.shortDescription,
    specs: { ...p.specs },
    attributes: [],
    pricing: p.pricing,
    images: [],
    thumbnail: p.thumbnail,
    imageIsCategoryImage: false,
    relatedProducts: [],
    tags: [],
    meta: {},
    detailStatus: "missing",
  };
  let detail: ParsedProductPage | undefined;
  // nopCommerce always routes the flat SeName (/{slug}); the theme's nested product URLs
  // (/{category}/{slug}) only resolve while the server's category cache is warm, so try flat first.
  const segs = p.path.split("/").filter(Boolean);
  const flatPath = "/" + segs[segs.length - 1];
  const categoryDir = segs.length > 1 ? "/" + segs.slice(0, -1).join("/") : undefined;
  // When two products share a name nopCommerce suffixes the SeName (-2, -3); the theme's nested link
  // sometimes omits that suffix, so try the suffixed flat slugs as a last resort.
  const candidates: { path: string; warm?: boolean }[] =
    segs.length > 1
      ? [{ path: flatPath }, { path: p.path, warm: true }, { path: flatPath }, { path: `${flatPath}-2` }, { path: `${flatPath}-3` }]
      : [{ path: p.path }, { path: p.path }, { path: `${p.path}-2` }];
  let lastStatus = 0;
  for (const { path: cand, warm } of candidates) {
    try {
      if (warm && categoryDir) {
        // nested theme URLs only resolve while the server's category cache is warm
        await fetcher.get(BASE + categoryDir, { bypassCache: true }).catch(() => undefined);
      }
      const res = await fetcher.get(BASE + cand);
      lastStatus = res.status;
      if (res.status === 200) {
        const parsed = parseProductPage(res.html);
        const suffixed = /-\d$/.test(cand) && !/-\d$/.test(p.path);
        if (parsed.name && (!suffixed || !parsed.sku || !p.sku || parsed.sku.toUpperCase() === p.sku.toUpperCase())) {
          detail = parsed;
          base.detailStatus = "ok";
          const og = res.html.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
          const ogPath = og ? new URL(og).pathname.replace(/\/$/, "") : undefined;
          base.canonicalPath = ogPath || cand;
          base.url = BASE + base.canonicalPath;
          break;
        }
      }
    } catch (err) {
      log("✗ product fetch failed", cand, (err as Error).message);
    }
  }
  if (!detail) {
    log("✗ product", p.path, "HTTP", lastStatus);
    base.detailStatus = "error";
    return base;
  }
  const merged: CatalogProduct = {
    ...base,
    id: detail.id || base.id,
    sku: detail.sku || base.sku,
    vendorSku: detail.vendorSku,
    name: detail.name || base.name,
    breadcrumb: detail.breadcrumb,
    shortDescription: detail.shortDescription || base.shortDescription,
    fullDescription: detail.fullDescription,
    specs: { ...base.specs, ...detail.specs },
    attributes: detail.attributes,
    pricing: detail.pricing.status === "unknown" ? base.pricing : mergePricing(base.pricing, detail.pricing),
    images: detail.images.length ? detail.images : base.thumbnail ? [base.thumbnail.replace(/_415\.(\w+)$/, "_550.$1")] : [],
    imageIsCategoryImage: detail.imageIsCategoryImage,
    videoId: detail.videoId,
    relatedProducts: detail.relatedProducts,
    tags: detail.tags,
    meta: detail.meta,
    tableId: detail.tableId || base.tableId,
  };
  if (!merged.thumbnail && merged.images[0]) merged.thumbnail = merged.images[0];
  return merged;
}

function mergePricing(listing: Pricing, detail: Pricing): Pricing {
  const out: Pricing = { ...listing, ...detail };
  if (listing.tiers && !detail.tiers) out.tiers = listing.tiers;
  if (listing.unit && !detail.unit) out.unit = listing.unit;
  return out;
}

/* ------------------------------------------------------------------ */
/* main                                                                 */
/* ------------------------------------------------------------------ */

async function main() {
  const started = Date.now();
  await fetcher.init();
  await mkdir(OUT_DIR, { recursive: true });

  // --- robots.txt (recorded for the report; the site only disallows cart/account paths) ---
  const robots = await fetcher.get(`${BASE}/robots.txt`).catch(() => ({ html: "", status: 0, fromCache: false }));
  const disallowed = robots.html
    .split("\n")
    .filter((l) => /^disallow:/i.test(l))
    .map((l) => l.split(":")[1]?.trim())
    .filter(Boolean) as string[];
  const isAllowed = (p: string) => !disallowed.some((d) => p.startsWith(d.replace(/\*$/, "")));

  // --- home / sitemap / nav ---
  const home = await fetcher.get(`${BASE}/`);
  const sitemapXml = await fetcher.get(`${BASE}/sitemap.xml`);
  const sitemapHtml = await fetcher.get(`${BASE}/sitemap`);
  const megaMenu = parseMegaMenu(home.html);
  const homeCats = parseHomeCategories(home.html);
  const sitemapUrls = parseSitemapXml(sitemapXml.html);
  const htmlSitemap = parseHtmlSitemap(sitemapHtml.html);
  const header = parseHeaderContact(home.html);
  for (const l of htmlSitemap) {
    const slug = l.path.split("/").filter(Boolean).pop();
    if (!slug || l.path.includes("/", 1)) continue;
    const key = l.name.toLowerCase();
    const arr = slugsByName.get(key) ?? [];
    if (!arr.includes(slug)) arr.push(slug);
    slugsByName.set(key, arr);
  }
  log(`nav: ${megaMenu.length} mega-menu links, ${homeCats.length} home tiles, sitemap.xml ${sitemapUrls.length} urls, html sitemap ${htmlSitemap.length} links`);

  const topicPaths = ["/about-mlr-packaging-supplies-and-equipment", "/shipping-returns", "/call-for-quote", "/proposition-65", "/contactus", "/privacy-notice", "/terms-of-service"];
  const nonCategory = new Set(["/", "/search", "/contactus", "/cart", "/login", "/register", "/sitemap", "/customer/info", ...topicPaths]);

  // --- seeds: every mega-menu category (nested paths), plus home tiles for ids ---
  const idByPath = new Map(homeCats.map((c) => [c.path, c.id]));
  const imgByPath = new Map(homeCats.map((c) => [c.path, c.image]));
  let seeds = megaMenu
    .filter((m) => !nonCategory.has(m.path) && isAllowed(m.path))
    .map((m) => ({ name: m.name, path: m.path, id: idByPath.get(m.path), image: imgByPath.get(m.path) }));
  // Nested nav entries (e.g. /strapping/baling-wire) are children of a top-level seed; keep the
  // top-level ones as roots so the tree is built from parents down.
  const roots = seeds.filter((s) => s.path.split("/").filter(Boolean).length === 1);
  const nestedSeeds = seeds.filter((s) => s.path.split("/").filter(Boolean).length > 1);
  seeds = roots;
  if (ONLY) seeds = seeds.filter((s) => s.path === ONLY || ONLY.startsWith(s.path + "/") || s.path.startsWith(ONLY));

  // --- crawl the category tree ---
  const work = await crawlCategories(seeds);
  // nested nav seeds that weren't reached (should not happen, but keep them)
  for (const s of nestedSeeds) {
    if (work.has(s.path) || (ONLY && !s.path.startsWith(ONLY))) continue;
    const parent = "/" + s.path.split("/").filter(Boolean).slice(0, -1).join("/");
    const w = await fetchCategory(s.path, "nav", work.has(parent) ? parent : null, s.name);
    if (w) work.set(s.path, w);
  }

  // --- sitemap sweep: categories in sitemap.xml that the nav tree never reached ---
  const knownSlugs = new Set([...work.keys()].map((p) => p.split("/").filter(Boolean).pop()!));
  const sitemapOnly: string[] = [];
  if (!ONLY) {
    for (const u of sitemapUrls) {
      const p = new URL(u).pathname.replace(/\/$/, "") || "/";
      if (nonCategory.has(p) || !isAllowed(p)) continue;
      const slug = p.split("/").filter(Boolean).pop()!;
      if (knownSlugs.has(slug) || slug.replace(/-\d+$/, "") && knownSlugs.has(slug.replace(/-\d+$/, ""))) continue;
      sitemapOnly.push(p);
    }
    log(`sitemap sweep: ${sitemapOnly.length} candidate slugs not seen in the nav tree`);
    for (const p of sitemapOnly) {
      const w = await fetchCategory(p, "sitemap", null);
      if (!w) continue;
      const crumbs = w.record.breadcrumb.filter((c) => c.path && c.path !== "/");
      const parent = crumbs.length ? crumbs[crumbs.length - 1].path : null;
      const nestedPath = parent ? `${parent}/${w.record.slug}` : p;
      if (work.has(nestedPath)) continue; // same category, already crawled via the nav
      // The sitemap often carries a second SeName for a category the nav already reached
      // (e.g. /12-13-inch-boxes-200-lb-test vs /12-13-inch-boxes). Same products ⇒ alias, not a new category.
      const sig = w.listed.map((l) => l.id || l.path).sort().join("|");
      const twin = [...work.values()].find((x) => x.record.parentPath === parent && x.listed.length === w.listed.length && x.listed.map((l) => l.id || l.path).sort().join("|") === sig);
      if (twin) {
        if (!twin.record.seName) twin.record.seName = w.record.slug;
        twin.record.aliases = [...(twin.record.aliases ?? []), p];
        log(`= ${p} is an alias of ${twin.record.path}`);
        continue;
      }
      w.record.parentPath = parent;
      w.record.path = nestedPath;
      w.record.depth = nestedPath.split("/").filter(Boolean).length;
      if (w.listed.length || w.record.children.length) {
        work.set(nestedPath, w);
        log(`+ sitemap-only category ${nestedPath} (${w.listed.length} products)`);
      }
    }
  }

  // --- resolve parents/children ---
  for (const [p, w] of work) {
    if (w.record.parentPath && work.has(w.record.parentPath)) {
      const parent = work.get(w.record.parentPath)!.record;
      if (!parent.children.includes(p)) parent.children.push(p);
    }
    w.record.children = w.record.children.filter((c) => work.has(c));
  }

  // --- products ---
  const listingByKey = new Map<string, { listed: ListedProduct; categoryPaths: string[]; categoryNames: string[] }>();
  for (const [catPath, w] of work) {
    for (const lp of w.listed) {
      const key = lp.id && !lp.id.startsWith("sku:") ? `id:${lp.id}` : `path:${lp.path}`;
      const existing = listingByKey.get(key);
      if (existing) {
        if (!existing.categoryPaths.includes(catPath)) {
          existing.categoryPaths.push(catPath);
          existing.categoryNames.push(w.record.name);
        }
        // prefer the richer listing (table rows carry specs)
        if (!Object.keys(existing.listed.specs).length && Object.keys(lp.specs).length) existing.listed = { ...lp };
      } else {
        listingByKey.set(key, { listed: { ...lp }, categoryPaths: [catPath], categoryNames: [w.record.name] });
      }
    }
  }
  let listings = [...listingByKey.values()];
  if (LIMIT) listings = listings.slice(0, LIMIT);
  log(`products: ${listings.length} unique listings to fetch`);

  const products: CatalogProduct[] = [];
  if (!args["skip-products"]) {
    let done = 0;
    const results = await Promise.all(
      listings.map(async (l) => {
        const prod = await fetchProduct(l.listed, l.categoryPaths, l.categoryNames);
        done += 1;
        if (done % 100 === 0) log(`  products fetched: ${done}/${listings.length}`);
        return prod;
      }),
    );
    // dedupe by final id (detail pages are authoritative)
    const byId = new Map<string, CatalogProduct>();
    for (const r of results) {
      const key = r.id && !r.id.startsWith("sku:") ? r.id : `path:${r.path}`;
      const ex = byId.get(key);
      if (ex) {
        for (const cp of r.categoryPaths) if (!ex.categoryPaths.includes(cp)) ex.categoryPaths.push(cp);
        for (const cn of r.categoryNames) if (!ex.categoryNames.includes(cn)) ex.categoryNames.push(cn);
      } else byId.set(key, r);
    }
    products.push(...byId.values());
  } else {
    for (const l of listings) products.push(await fetchProduct(l.listed, l.categoryPaths, l.categoryNames).catch(() => null as never));
  }

  // --- primary category: table products live under their category path; grid products use the listing category ---
  for (const prod of products) {
    if (!prod.name) {
      // detail page 404s on the live site: build a name from the category title and the size spec
      const cat = work.get("/" + prod.path.split("/").filter(Boolean).slice(0, -1).join("/"))?.record;
      const size = Object.entries(prod.specs).find(([k]) => /size|dimension/i.test(k))?.[1];
      prod.name = [cat?.title || cat?.name, size].filter(Boolean).join(" ") || prod.sku;
      if (!prod.images.length && cat?.image) {
        prod.images = [cat.image];
        prod.imageIsCategoryImage = true;
      }
    }
    if (prod.listingType === "table") {
      const dir = "/" + prod.path.split("/").filter(Boolean).slice(0, -1).join("/");
      if (work.has(dir)) prod.categoryPath = dir;
    } else if (prod.breadcrumb.length > 1) {
      // match the breadcrumb chain (names) to one of the listing categories
      const names = prod.breadcrumb.slice(1, -1).map((c) => c.name.toLowerCase());
      const match = prod.categoryPaths.find((cp) => {
        const chain = cp.split("/").filter(Boolean).map((seg) => work.get("/" + cp.split("/").filter(Boolean).slice(0, cp.split("/").filter(Boolean).indexOf(seg) + 1).join("/"))?.record.name.toLowerCase() ?? seg);
        return chain.join(">") === names.join(">");
      });
      if (match) prod.categoryPath = match;
    }
    if (!prod.categoryPaths.includes(prod.categoryPath)) prod.categoryPaths.unshift(prod.categoryPath);
    prod.categoryNames = prod.categoryPaths.map((cp) => work.get(cp)?.record.name ?? cp);
    // seName for categories, learned from flat product breadcrumbs
    const segs = prod.categoryPath.split("/").filter(Boolean);
    const crumbs = prod.breadcrumb.filter((c) => c.path && c.path !== "/");
    if (crumbs.length === segs.length) {
      segs.forEach((_, i) => {
        const cat = work.get("/" + segs.slice(0, i + 1).join("/"))?.record;
        if (cat && !cat.seName) cat.seName = crumbs[i].path.replace(/^\//, "");
      });
    }
  }

  // --- category product ids & subtree counts ---
  for (const prod of products) {
    for (const cp of prod.categoryPaths) {
      const cat = work.get(cp)?.record;
      if (cat && !cat.productIds.includes(prod.id)) cat.productIds.push(prod.id);
    }
  }
  const subtree = (p: string, memo = new Map<string, Set<string>>()): Set<string> => {
    if (memo.has(p)) return memo.get(p)!;
    const cat = work.get(p)!.record;
    const ids = new Set(cat.productIds);
    for (const c of cat.children) for (const id of subtree(c, memo)) ids.add(id);
    memo.set(p, ids);
    return ids;
  };
  const memo = new Map<string, Set<string>>();
  for (const [p, w] of work) w.record.subtreeProductCount = subtree(p, memo).size;

  // --- topics / company info ---
  const topics: Record<string, { path: string; url: string; title: string; text: string; html: string }> = {};
  for (const tp of topicPaths) {
    try {
      const r = await fetcher.get(BASE + tp);
      if (r.status === 200) {
        const t = parseTopicPage(r.html);
        topics[tp.replace(/^\//, "")] = { path: tp, url: BASE + tp, ...t };
      }
    } catch (err) {
      log("✗ topic", tp, (err as Error).message);
    }
  }
  const contactText = topics["contactus"]?.text ?? "";
  const email = contactText.match(/[\w.+-]+@mlrpackaging\.com/i)?.[0] ?? "Sales@MlrPackaging.com";
  const fax = contactText.match(/Fax\s*\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/i);
  const quoteText = topics["call-for-quote"]?.text ?? "";
  const freeDelivery = quoteText.match(/free delivery[^.]*\./i)?.[0] ?? "Free delivery within many local zip codes on orders over $600.";
  const willCall = quoteText.match(/\$\d+ minimum for all "?Will Call"? orders/i)?.[0] ?? 'There is a $300 minimum for all "Will Call" orders.';
  const about = topics["about-mlr-packaging-supplies-and-equipment"]?.text ?? "";

  const company = {
    name: "MLR Packaging Supplies & Equipment",
    legalName: "MLR Packaging, Inc.",
    tagline: header.tagline ?? "Your New Favorite Packaging Company.",
    homePromos: header.promos,
    founded: Number(about.match(/established in (\d{4})/i)?.[1] ?? 2001),
    phone: "(714) 738-0031",
    phoneHref: "tel:+17147380031",
    fax: fax ? `(${fax[1]}) ${fax[2]}-${fax[3]}` : "(714) 738-0007",
    email,
    address: { street: "1388 E Valencia Dr", city: "Fullerton", state: "CA", zip: "92831", full: "1388 E Valencia Dr, Fullerton, CA 92831" },
    hours: {
      summary: "Mon–Fri 7:30 AM – 5:00 PM",
      days: [
        { day: "Monday", open: "07:30", close: "17:00" },
        { day: "Tuesday", open: "07:30", close: "17:00" },
        { day: "Wednesday", open: "07:30", close: "17:00" },
        { day: "Thursday", open: "07:30", close: "17:00" },
        { day: "Friday", open: "07:30", close: "17:00" },
      ],
      timezone: "America/Los_Angeles",
      source: "business listings (Yelp, Yellow Pages, Yahoo Local, MapQuest agree on 7:30–5; one listing says 5:30 PM close, another 9–6)",
      verifiedOnWebsite: false,
      note: "mlrpackaging.com does not publish hours. Mon–Fri 7:30 AM–5:00 PM is the schedule most listings agree on; confirm by phone before a will-call pickup.",
    },
    freeLocalDelivery: { headline: "Free Local Deliveries", detail: freeDelivery, willCall, source: "/call-for-quote and /shipping-returns" },
    serviceArea: { counties: ["Ventura", "Los Angeles", "Riverside", "Orange", "San Diego"], state: "CA", source: "owner-provided" },
    industries: [
      { key: "metal", name: "Metal" },
      { key: "lumber", name: "Lumber" },
      { key: "janitorial", name: "Janitorial" },
      { key: "food-service", name: "Food Service" },
    ],
    fleet: about.match(/two large warehouses and over 8 trucks/i) ? "Two warehouses and a fleet of 8+ delivery trucks" : undefined,
    about,
    mission: about.match(/Our Mission\n([^\n]+)/)?.[1],
    inspiration: about.match(/Our Inspiration\n([\s\S]+)$/)?.[1]?.trim(),
    specialPricing: quoteText,
    shippingReturns: topics["shipping-returns"]?.text ?? "",
    prop65: topics["proposition-65"]?.text ?? "",
    socialOrOther: {},
    website: BASE,
    logo: `${BASE}/Themes/MLR_2016/Content/images/logo.png`,
    platform: "nopCommerce (MLR_2016 theme)",
  };

  // --- assemble catalog ---
  const categories = [...work.values()].map((w) => w.record).sort((a, b) => a.path.localeCompare(b.path));
  products.sort((a, b) => a.categoryPath.localeCompare(b.categoryPath) || a.sku.localeCompare(b.sku));
  const catalog = {
    source: BASE,
    scrapedAt: new Date().toISOString(),
    robotsDisallow: disallowed,
    company,
    topics,
    nav: { megaMenu, homeCategories: homeCats },
    sitemap: { xmlUrls: sitemapUrls, htmlLinks: htmlSitemap },
    categories,
    products,
  };
  await writeFile(path.join(OUT_DIR, "catalog.json"), JSON.stringify(catalog, null, 2));

  // --- report ---
  const productById = new Map(products.map((p) => [p.id, p]));
  const mismatches: { path: string; listed: number; captured: number; missing: string[] }[] = [];
  for (const [p, w] of work) {
    const listedIds = w.listed.map((l) => (l.id && !l.id.startsWith("sku:") ? l.id : l.path));
    const captured = listedIds.filter((id) => productById.has(id) || products.some((pr) => pr.path === id)).length;
    const okCaptured = w.listed.filter((l) => {
      const pr = productById.get(l.id) ?? products.find((pr) => pr.path === l.path);
      return pr && pr.detailStatus === "ok";
    }).length;
    if (!LIMIT && (captured !== listedIds.length || okCaptured !== listedIds.length)) {
      mismatches.push({ path: p, listed: listedIds.length, captured: okCaptured, missing: w.listed.filter((l) => !(productById.get(l.id)?.detailStatus === "ok")).map((l) => l.sku || l.path) });
    }
  }
  const missingFields = products
    .map((p) => {
      const missing: string[] = [];
      if (!p.sku) missing.push("sku");
      if (!p.name) missing.push("name");
      if (!p.images.length) missing.push("image");
      if (!p.shortDescription && !p.fullDescription && !Object.keys(p.specs).length) missing.push("description/specs");
      if (p.pricing.status === "unknown") missing.push("price");
      if (p.detailStatus !== "ok") missing.push("detail-page");
      return missing.length ? { id: p.id, sku: p.sku, path: p.path, missing } : null;
    })
    .filter(Boolean) as { id: string; sku: string; path: string; missing: string[] }[];
  const perTop = categories
    .filter((c) => c.depth === 1)
    .map((c) => ({ path: c.path, name: c.name, products: c.subtreeProductCount, subcategories: categories.filter((x) => x.path.startsWith(c.path + "/")).length }));
  const perLeaf = categories.filter((c) => c.productCount > 0).map((c) => ({ path: c.path, name: c.name, listingType: c.listingType, products: c.productCount, pages: c.pagesFetched }));
  const priceStatus = products.reduce<Record<string, number>>((acc, p) => ((acc[p.pricing.status] = (acc[p.pricing.status] ?? 0) + 1), acc), {});
  const report = {
    scrapedAt: catalog.scrapedAt,
    durationSec: Math.round((Date.now() - started) / 1000),
    options: { fresh: args.fresh, concurrency: CONCURRENCY, delayMs: DELAY_MS, only: ONLY, limit: LIMIT },
    fetchStats: fetcher.stats,
    totals: {
      categories: categories.length,
      leafCategoriesWithProducts: perLeaf.length,
      products: products.length,
      productsWithDetailPage: products.filter((p) => p.detailStatus === "ok").length,
      tableProducts: products.filter((p) => p.listingType === "table").length,
      gridProducts: products.filter((p) => p.listingType === "grid").length,
      withTierPricing: products.filter((p) => p.pricing.tiers?.length).length,
      withAttributes: products.filter((p) => p.attributes.length).length,
      withVideo: products.filter((p) => p.videoId).length,
      inMultipleCategories: products.filter((p) => p.categoryPaths.length > 1).length,
      priceStatus,
      sitemapXmlUrls: sitemapUrls.length,
      sitemapOnlyCategoriesFound: categories.filter((c) => c.discoveredVia === "sitemap").length,
    },
    perTopLevelCategory: perTop,
    perLeafCategory: perLeaf,
    completeness: { categoriesChecked: work.size, mismatches },
    productsMissingFields: missingFields,
  };
  await writeFile(path.join(OUT_DIR, "scrape-report.json"), JSON.stringify(report, null, 2));
  const md = [
    `# Scrape report — mlrpackaging.com`,
    ``,
    `Scraped ${report.scrapedAt} in ${report.durationSec}s (concurrency ${CONCURRENCY}, delay ${DELAY_MS} ms, network ${fetcher.stats.network} / cached ${fetcher.stats.cached} / failed ${fetcher.stats.failed}).`,
    ``,
    `## Totals`,
    ``,
    ...Object.entries(report.totals).map(([k, v]) => `- **${k}**: ${typeof v === "object" ? JSON.stringify(v) : v}`),
    ``,
    `## Products per top-level category (subtree)`,
    ``,
    `| Category | Products | Subcategories |`,
    `|---|---:|---:|`,
    ...perTop.map((c) => `| [${c.name}](${BASE}${c.path}) | ${c.products} | ${c.subcategories} |`),
    ``,
    `## Completeness check`,
    ``,
    mismatches.length
      ? [`${mismatches.length} categories where listed ≠ captured:`, ``, `| Category | Listed | Captured | Missing |`, `|---|---:|---:|---|`, ...mismatches.map((m) => `| ${m.path} | ${m.listed} | ${m.captured} | ${m.missing.slice(0, 8).join(", ")} |`)].join("\n")
      : `All ${work.size} category pages: every listed product (across all pagination pages) was captured with its detail page. ✅`,
    ``,
    `## Products missing fields`,
    ``,
    missingFields.length
      ? [`${missingFields.length} products are missing at least one field:`, ``, `| SKU | Path | Missing |`, `|---|---|---|`, ...missingFields.slice(0, 200).map((m) => `| ${m.sku} | ${m.path} | ${m.missing.join(", ")} |`), missingFields.length > 200 ? `… and ${missingFields.length - 200} more (see scrape-report.json)` : ""].join("\n")
      : `None.`,
    ``,
    `## Leaf categories`,
    ``,
    `| Category | Type | Products | Pages |`,
    `|---|---|---:|---:|`,
    ...perLeaf.map((c) => `| ${c.path} | ${c.listingType} | ${c.products} | ${c.pages} |`),
    ``,
  ].join("\n");
  await writeFile(path.join(OUT_DIR, "scrape-report.md"), md);
  await fetcher.saveIndex();
  log(`done: ${categories.length} categories, ${products.length} products, ${mismatches.length} mismatches, ${missingFields.length} products with missing fields → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
