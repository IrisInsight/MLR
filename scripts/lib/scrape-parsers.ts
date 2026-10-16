/**
 * HTML parsers for mlrpackaging.com (nopCommerce 3.x + custom MLR_2016 theme).
 *
 * Two listing formats exist on the live site:
 *  - "pTable": a custom spec table (div.ptContainer > table.pTable) whose rows are
 *    products with spec columns, optional tier prices and an add-to-cart input.
 *  - "grid": the standard nopCommerce product grid (div.product-item) with
 *    pagination (?pagenumber=N).
 * Intermediate categories list subcategories as tiles (mlr-inside-category-box)
 * or the standard sub-category-grid.
 */
import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

export const BASE = "https://www.mlrpackaging.com";

export type CheerioRoot = ReturnType<typeof cheerio.load>;

export interface PriceTier {
  minQty: string;
  price: number;
}

export interface Pricing {
  status: "listed" | "call_for_price" | "login_required" | "unknown";
  currency: "USD";
  unit?: string;
  unitNote?: string;
  price?: number;
  tiers?: PriceTier[];
}

export interface ListedProduct {
  id: string;
  sku: string;
  name: string;
  path: string;
  listingType: "table" | "grid";
  shortDescription?: string;
  thumbnail?: string;
  specs: Record<string, string>;
  pricing: Pricing;
  tableId?: string;
  tableHeading?: string;
}

export interface SubcategoryLink {
  id?: number;
  name: string;
  path: string;
  image?: string;
}

export interface ParsedCategoryPage {
  title: string;
  description?: string;
  descriptionHtml?: string;
  image?: string;
  subcategories: SubcategoryLink[];
  products: ListedProduct[];
  tables: { id: string; heading?: string; columns: string[] }[];
  pageNumbers: number[];
  breadcrumb: { name: string; path: string }[];
}

export interface ProductAttribute {
  name: string;
  description?: string;
  required: boolean;
  options: string[];
}

export interface ParsedProductPage {
  id?: string;
  name: string;
  sku?: string;
  vendorSku?: string;
  shortDescription?: string;
  shortDescriptionHtml?: string;
  fullDescription?: string;
  fullDescriptionHtml?: string;
  pricing: Pricing;
  specs: Record<string, string>;
  attributes: ProductAttribute[];
  images: string[];
  imageIsCategoryImage: boolean;
  videoId?: string;
  relatedProducts: { path: string; name: string; id?: string }[];
  tags: string[];
  breadcrumb: { name: string; path: string }[];
  meta: { title?: string; description?: string; keywords?: string };
  listingType: "table" | "grid";
  tableId?: string;
  tableHeading?: string;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export function cleanText(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert a fragment of HTML into readable plain text (paragraphs separated by newlines). */
export function htmlToText($: CheerioRoot, el: AnyNode | AnyNode[] | undefined): string {
  if (!el) return "";
  const html = $(el as never).html() ?? "";
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ");
  const text = cheerio.load(`<div>${withBreaks}</div>`)("div").text();
  return text
    .replace(/ /g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function normalizePath(href: string | undefined): string | null {
  if (!href) return null;
  let h = href.trim();
  if (h.startsWith("#") || h.startsWith("javascript:")) return null;
  try {
    const u = new URL(h, BASE);
    if (!/(^|\.)mlrpackaging\.com$/i.test(u.hostname)) return null;
    let p = u.pathname;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return (p || "/") + (u.search || "");
  } catch {
    return null;
  }
}

export function absoluteUrl(src: string | undefined): string | undefined {
  if (!src) return undefined;
  try {
    const u = new URL(src.trim(), BASE);
    // The theme mixes www and bare hostnames; normalize to www.
    if (u.hostname === "mlrpackaging.com") u.hostname = "www.mlrpackaging.com";
    return u.toString();
  } catch {
    return undefined;
  }
}

export function parsePrice(text: string): number | null {
  const t = cleanText(text).replace(/,/g, "");
  if (!t) return null;
  if (/call/i.test(t) || /log\s*in/i.test(t)) return null;
  const m = t.match(/\$?\s*(\d*\.?\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function headerLabel(html: string): string {
  return cleanText(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "));
}

interface Cell {
  html: string;
  text: string;
  classes: string;
  link?: { href: string; text: string };
  isHeader: boolean;
}

/** Expand a <table> into a rectangular matrix, honoring rowspan/colspan. */
function tableMatrix($: CheerioRoot, table: Element): Cell[][] {
  const rows: Cell[][] = [];
  const pending = new Map<number, { cell: Cell; remaining: number }>();
  $(table)
    .find("tr")
    .each((_, tr) => {
      const row: Cell[] = [];
      let col = 0;
      const place = (cell: Cell, span: number) => {
        for (let i = 0; i < span; i++) row[col++] = cell;
      };
      const flushPending = () => {
        while (pending.has(col)) {
          const p = pending.get(col)!;
          row[col++] = p.cell;
          p.remaining -= 1;
          if (p.remaining <= 0) pending.delete(col - 1);
        }
      };
      $(tr)
        .children("td,th")
        .each((_, td) => {
          flushPending();
          const $td = $(td);
          const a = $td.find("a[href]").first();
          const cell: Cell = {
            html: $td.html() ?? "",
            text: cleanText($td.text()),
            classes: $td.attr("class") ?? "",
            link: a.length ? { href: a.attr("href") ?? "", text: cleanText(a.text()) } : undefined,
            isHeader: td.tagName.toLowerCase() === "th" || /\bptHead\b/.test($td.attr("class") ?? ""),
          };
          const rowspan = Number($td.attr("rowspan") ?? 1) || 1;
          const colspan = Number($td.attr("colspan") ?? 1) || 1;
          const startCol = col;
          place(cell, colspan);
          if (rowspan > 1) {
            for (let c = startCol; c < startCol + colspan; c++) {
              pending.set(c, { cell, remaining: rowspan - 1 });
            }
          }
        });
      flushPending();
      rows.push(row);
    });
  return rows;
}

export interface ParsedTable {
  id: string;
  heading?: string;
  columns: string[];
  products: ListedProduct[];
}

/**
 * Parse one pTable. Header rows carry class ptHead; data rows class ptTR (or any row
 * with a SKU cell). Tier-price headers span two rows ("Price per Case" / "1 | 10 | 20+").
 */
export function parseProductTable($: CheerioRoot, table: Element, heading?: string): ParsedTable {
  const id = $(table).attr("id") ?? "";
  const matrix = tableMatrix($, table);
  const headerRows = matrix.filter((r) => r.length && r.every((c) => c.isHeader));
  const dataRows = matrix.filter((r) => r.length && !r.every((c) => c.isHeader));
  const width = Math.max(...matrix.map((r) => r.length), 0);

  const columns: string[] = [];
  const colRole: ("sku" | "price" | "skip" | "spec")[] = [];
  const tierLabel: (string | undefined)[] = [];
  const priceUnit: (string | undefined)[] = [];
  for (let c = 0; c < width; c++) {
    const top = headerRows[0]?.[c];
    const sub = headerRows[1]?.[c];
    let label = top ? headerLabel(top.html) : `col${c + 1}`;
    let tier: string | undefined;
    if (top && sub && sub !== top) {
      tier = headerLabel(sub.html);
      label = `${label} (${tier})`;
    }
    columns.push(label);
    tierLabel.push(tier);
    const lower = label.toLowerCase();
    if (/item\s*number|^sku$|item\s*#/.test(lower)) colRole.push("sku");
    else if (/price/.test(lower)) {
      colRole.push("price");
      priceUnit.push(top ? headerLabel(top.html) : undefined);
      continue;
    } else if (/add\s*to\s*cart|qty|quantity\s*to/.test(lower) && !/per/.test(lower)) colRole.push("skip");
    else colRole.push("spec");
    priceUnit.push(undefined);
  }

  const products: ListedProduct[] = [];
  for (const row of dataRows) {
    const skuIdx = colRole.indexOf("sku");
    const skuCell = skuIdx >= 0 ? row[skuIdx] : row.find((c) => c?.link);
    if (!skuCell) continue;
    const sku = cleanText(skuCell.link?.text || skuCell.text);
    const href = skuCell.link?.href;
    const path = normalizePath(href);
    // product id from the add-to-cart quantity input
    let pid = "";
    for (const cell of row) {
      const m = cell?.html.match(/data-pt-q-prodid="(\d+)"/) ?? cell?.html.match(/\/addproducttocart\/catalog\/(\d+)\//);
      if (m) {
        pid = m[1];
        break;
      }
    }
    if (!sku && !pid) continue;
    const specs: Record<string, string> = {};
    const tiers: PriceTier[] = [];
    let unit: string | undefined;
    let seen: Cell | undefined;
    for (let c = 0; c < width; c++) {
      const cell = row[c];
      if (!cell) continue;
      const role = colRole[c];
      if (role === "spec") {
        if (cell === seen) continue; // colspan duplicate
        const v = cleanText(cell.text);
        if (v) specs[columns[c]] = v;
      } else if (role === "price") {
        const p = parsePrice(cell.text);
        unit = unit ?? priceUnit[c];
        if (p !== null) tiers.push({ minQty: tierLabel[c] ?? "1", price: p });
      }
      seen = cell;
    }
    const pricing: Pricing = { status: tiers.length ? "listed" : "call_for_price", currency: "USD" };
    if (unit) pricing.unit = unit;
    if (tiers.length) {
      pricing.price = tiers[0].price;
      if (tiers.length > 1) pricing.tiers = tiers;
    }
    products.push({
      id: pid || `sku:${sku}`,
      sku,
      name: "",
      path: path ?? "",
      listingType: "table",
      specs,
      pricing,
      tableId: id,
      tableHeading: heading,
    });
  }
  // collapse colspan duplicates ("Add to Cart", "Add to Cart")
  const dedupedColumns = columns.filter((c, i) => i === 0 || c !== columns[i - 1]);
  return { id, heading, columns: dedupedColumns, products };
}

/* ------------------------------------------------------------------ */
/* category page                                                        */
/* ------------------------------------------------------------------ */

export function parseBreadcrumb($: CheerioRoot, root?: AnyNode): { name: string; path: string }[] {
  const scope = root ? $(root as never) : $(".mlr-breadcrumbs-top, .mlr-breadcrumbs-bottom").first();
  const crumbs: { name: string; path: string }[] = [];
  scope.find("ul li").each((_, li) => {
    const a = $(li).find("a").first();
    if (a.length) {
      const p = normalizePath(a.attr("href"));
      if (p) crumbs.push({ name: cleanText(a.text()), path: p });
    } else {
      const cur = cleanText($(li).find(".current-item").text());
      if (cur) crumbs.push({ name: cur, path: "" });
    }
  });
  return crumbs;
}

export function parseCategoryPage(html: string): ParsedCategoryPage {
  const $ = cheerio.load(html);
  const page = $(".mlr-category-page").first();
  const descBox = page.find(".mlr-product-description-container").first();

  let title =
    cleanText(page.find(".mlr-page-title h1").first().text()) ||
    cleanText(page.find(".page-title h1").first().text()) ||
    cleanText(descBox.find("h2").first().text()) ||
    cleanText($("h1").first().text());

  let descriptionHtml: string | undefined;
  if (page.find(".mlr-category-description").length) {
    descriptionHtml = page.find(".mlr-category-description").first().html()?.trim() || undefined;
  } else if (descBox.length) {
    const col = descBox.find(".col-md-7").first().clone();
    col.find("h2").remove();
    descriptionHtml = col.html()?.trim() || undefined;
  }
  const description = descriptionHtml ? htmlToText($, cheerio.load(`<div>${descriptionHtml}</div>`)("div").get(0)) : undefined;
  const image = absoluteUrl(descBox.find("img").first().attr("src"));

  const subcategories: SubcategoryLink[] = [];
  const seenSub = new Set<string>();
  page.find(".mlr-inside-category-box").each((_, box) => {
    const a = $(box).find("a[href]").first();
    const path = normalizePath(a.attr("href"));
    if (!path || seenSub.has(path)) return;
    seenSub.add(path);
    const idMatch = ($(box).find("span[id^=cat]").attr("id") ?? "").match(/cat(\d+)Title/);
    subcategories.push({
      id: idMatch ? Number(idMatch[1]) : undefined,
      name: cleanText($(box).find(".mlr-category-title").text()) || cleanText(a.attr("title")?.replace(/^Show products in category\s*/i, "") ?? ""),
      path,
      image: absoluteUrl($(box).find("img").attr("src")),
    });
  });
  page.find(".sub-category-item").each((_, box) => {
    const a = $(box).find("h2.title a, a[href]").first();
    const path = normalizePath(a.attr("href"));
    if (!path || seenSub.has(path)) return;
    seenSub.add(path);
    const img = $(box).find("img").attr("src");
    const idMatch = (img ?? "").match(/\/(\d+)_/);
    subcategories.push({
      id: undefined,
      name: cleanText(a.text()),
      path,
      image: absoluteUrl(img),
    });
    void idMatch;
  });

  const tables: ParsedCategoryPage["tables"] = [];
  const products: ListedProduct[] = [];
  page.find("div.ptContainer").each((_, container) => {
    const table = $(container).find("table").first().get(0);
    if (!table) return;
    const prev = $(container).prev();
    const heading = prev.is(".ptTopLeft") ? cleanText(prev.text()) : undefined;
    const parsed = parseProductTable($, table, heading);
    tables.push({ id: parsed.id, heading: parsed.heading, columns: parsed.columns });
    products.push(...parsed.products);
  });

  page.find(".product-item").each((_, item) => {
    const $it = $(item);
    const id = $it.attr("data-productid") ?? "";
    const a = $it.find("h2.product-title a").first();
    const path = normalizePath(a.attr("href"));
    if (!path) return;
    const priceText = cleanText($it.find(".prices").text());
    const p = parsePrice($it.find(".prices .price, .prices .actual-price").first().text() || priceText);
    const pricing: Pricing = {
      status: p !== null ? "listed" : /log\s*in/i.test(priceText) ? "login_required" : /call/i.test(priceText) ? "call_for_price" : "unknown",
      currency: "USD",
    };
    if (p !== null) pricing.price = p;
    products.push({
      id,
      sku: cleanText($it.find(".product-sku").text()),
      name: cleanText(a.text()),
      path,
      listingType: "grid",
      shortDescription: htmlToText($, $it.find(".description").get(0)) || undefined,
      thumbnail: absoluteUrl($it.find(".picture img").attr("src")),
      specs: {},
      pricing,
    });
  });

  const pageNumbers = new Set<number>();
  page.find(".pager a[href*='pagenumber=']").each((_, a) => {
    const m = ($(a).attr("href") ?? "").match(/pagenumber=(\d+)/i);
    if (m) pageNumbers.add(Number(m[1]));
  });

  // Some leaf tables repeat the category name; fall back to the breadcrumb name.
  const breadcrumb = parseBreadcrumb($);
  if (!title) title = breadcrumb[breadcrumb.length - 1]?.name ?? "";

  return {
    title,
    description,
    descriptionHtml,
    image,
    subcategories,
    products,
    tables,
    pageNumbers: [...pageNumbers].sort((a, b) => a - b),
    breadcrumb,
  };
}

/* ------------------------------------------------------------------ */
/* product page                                                         */
/* ------------------------------------------------------------------ */

export function parseProductPage(html: string): ParsedProductPage {
  const $ = cheerio.load(html);
  const meta = {
    title: cleanText($("title").first().text()) || undefined,
    description: cleanText($('meta[name="description"]').attr("content")) || undefined,
    keywords: cleanText($('meta[name="keywords"]').attr("content")) || undefined,
  };
  const breadcrumb = parseBreadcrumb($, $(".mlr-breadcrumbs-top").get(0));
  const videoMatch = html.match(/SetYouTubeVideoPopupSrc\('([^']+)'/);
  const videoId = videoMatch ? videoMatch[1] : undefined;

  const detail = $(".ptDetailContainer").first();
  if (detail.length) {
    // ---- custom table product ----
    const descBox = $(".mlr-product-description-container").first();
    const name = cleanText(descBox.find("h2").first().text()) || breadcrumb[breadcrumb.length - 1]?.name || "";
    const shortHtml = descBox.find(".ptDetailShortDesc").html()?.trim() || undefined;
    const fullHtml = descBox.find(".ptDetailFullDesc").html()?.trim() || undefined;
    const table = detail.find("table").first().get(0);
    let specs: Record<string, string> = {};
    let pricing: Pricing = { status: "unknown", currency: "USD" };
    let id: string | undefined;
    let sku: string | undefined;
    let tableId: string | undefined;
    if (table) {
      const parsed = parseProductTable($, table);
      tableId = parsed.id;
      const row = parsed.products[0];
      if (row) {
        specs = row.specs;
        pricing = row.pricing;
        id = row.id.startsWith("sku:") ? undefined : row.id;
        sku = row.sku;
      }
    }
    // The table-product page shows the category picture next to the name.
    const image =
      absoluteUrl(descBox.find("img").first().attr("src")) ||
      absoluteUrl($(".mlr-content-body-wrapper img[alt^='Picture']").first().attr("src")) ||
      absoluteUrl($(".mlr-content-body-wrapper .col-md-5 img, .ptDetailContainer img").first().attr("src"));
    return {
      id,
      name,
      sku,
      shortDescription: shortHtml ? htmlToText($, cheerio.load(`<div>${shortHtml}</div>`)("div").get(0)) : undefined,
      shortDescriptionHtml: shortHtml,
      fullDescription: fullHtml ? htmlToText($, cheerio.load(`<div>${fullHtml}</div>`)("div").get(0)) : undefined,
      fullDescriptionHtml: fullHtml,
      pricing,
      specs,
      attributes: [],
      images: image ? [image] : [],
      imageIsCategoryImage: true,
      videoId,
      relatedProducts: [],
      tags: [],
      breadcrumb,
      meta,
      listingType: "table",
      tableId,
    };
  }

  // ---- standard nopCommerce product ----
  const root = $("[itemtype='http://schema.org/Product']").first();
  const id = root.attr("data-productid") ?? undefined;
  const name = cleanText(root.find("h1[itemprop=name]").first().text()) || cleanText($("h1").first().text());
  let sku: string | undefined;
  let vendorSku: string | undefined;
  const skuBox = root.find(".sku").first();
  const labels = skuBox.find(".label").toArray().map((e) => cleanText($(e).text()).toLowerCase());
  const values = skuBox.find(".value").toArray().map((e) => cleanText($(e).text()));
  labels.forEach((l, i) => {
    if (/vendor/.test(l)) vendorSku = values[i] || undefined;
    else if (/item|sku/.test(l)) sku = values[i] || undefined;
  });
  if (!sku && values[0]) sku = values[0];

  const shortBox = root.find(".short-description").first().clone();
  shortBox.find("button, .pricing-unit-container, br").remove();
  const shortHtml = shortBox.html()?.trim() || undefined;
  const fullBox = root.find(".full-description").first();
  const fullHtml = fullBox.length ? fullBox.html()?.trim() || undefined : undefined;

  const unit = cleanText(root.find(".pricing-unit").first().text()) || undefined;
  const unitNote = cleanText(root.find(".pricing-quantity").first().text()) || undefined;
  const priceBox = root.find(".prices").first();
  const priceText = cleanText(priceBox.text());
  const price = parsePrice(priceBox.find(".product-price").first().text() || priceText);
  const pricing: Pricing = {
    status:
      price !== null
        ? "listed"
        : priceBox.find(".call-for-price").length || /call/i.test(priceText)
          ? "call_for_price"
          : /log\s*in/i.test(priceText)
            ? "login_required"
            : "unknown",
    currency: "USD",
  };
  if (unit) pricing.unit = unit.replace(/\.$/, "");
  if (unitNote) pricing.unitNote = unitNote;
  if (price !== null) pricing.price = price;

  const attributes: ProductAttribute[] = [];
  root.find(".attributes dl").each((_, dl) => {
    const dts = $(dl).children("dt").toArray();
    const dds = $(dl).children("dd").toArray();
    dts.forEach((dt, i) => {
      const dd = dds[i];
      const options: string[] = [];
      if (dd) {
        $(dd)
          .find("option")
          .each((_, o) => {
            const t = cleanText($(o).text());
            if (t && !/^---/.test(t) && !/select/i.test(t)) options.push(t);
          });
        $(dd)
          .find("label")
          .each((_, l) => {
            const t = cleanText($(l).text());
            if (t) options.push(t);
          });
      }
      attributes.push({
        name: cleanText($(dt).find(".text-prompt").text()) || cleanText($(dt).text()),
        description: cleanText($(dt).find(".attribute-description").text()) || undefined,
        required: $(dt).find(".required").length > 0,
        options,
      });
    });
  });

  const images: string[] = [];
  const pushImg = (src?: string) => {
    const u = absoluteUrl(src);
    if (u && !images.includes(u)) images.push(u);
  };
  pushImg(root.find(".gallery .picture img").first().attr("src"));
  root.find(".gallery .picture-thumbs img, .gallery .thumbs img").each((_, img) => {
    pushImg($(img).attr("data-full") || $(img).attr("data-defaultsize") || $(img).attr("src"));
  });

  const specs: Record<string, string> = {};
  $(".product-specs-box table tr").each((_, tr) => {
    const k = cleanText($(tr).find("td").first().text());
    const v = cleanText($(tr).find("td").last().text());
    if (k && v) specs[k] = v;
  });

  const tags: string[] = [];
  $(".product-tags-box a, .product-tags-list a").each((_, a) => {
    const t = cleanText($(a).text());
    if (t) tags.push(t);
  });

  const relatedProducts: ParsedProductPage["relatedProducts"] = [];
  $(".related-products-grid .product-item, .also-purchased-products-grid .product-item").each((_, it) => {
    const a = $(it).find("h2.product-title a").first();
    const p = normalizePath(a.attr("href"));
    if (p) relatedProducts.push({ path: p, name: cleanText(a.text()), id: $(it).attr("data-productid") ?? undefined });
  });

  return {
    id,
    name,
    sku,
    vendorSku,
    shortDescription: shortHtml ? htmlToText($, cheerio.load(`<div>${shortHtml}</div>`)("div").get(0)) || undefined : undefined,
    shortDescriptionHtml: shortHtml,
    fullDescription: fullHtml ? htmlToText($, cheerio.load(`<div>${fullHtml}</div>`)("div").get(0)) || undefined : undefined,
    fullDescriptionHtml: fullHtml,
    pricing,
    specs,
    attributes,
    images,
    imageIsCategoryImage: false,
    videoId,
    relatedProducts,
    tags,
    breadcrumb,
    meta,
    listingType: "grid",
  };
}

/* ------------------------------------------------------------------ */
/* misc pages                                                           */
/* ------------------------------------------------------------------ */

export function parseMegaMenu(html: string): { name: string; path: string }[] {
  const $ = cheerio.load(html);
  const out: { name: string; path: string }[] = [];
  const seen = new Set<string>();
  $("ul.mega-menu .categoryListRowMega a[href], ul.mega-menu a[href]").each((_, a) => {
    const p = normalizePath($(a).attr("href"));
    if (!p || p === "/" || seen.has(p)) return;
    seen.add(p);
    out.push({ name: cleanText($(a).text()), path: p });
  });
  return out;
}

export function parseHomeCategories(html: string): { id: number; name: string; path: string; image?: string }[] {
  const $ = cheerio.load(html);
  const out: { id: number; name: string; path: string; image?: string }[] = [];
  $(".mlr-home-category-box").each((_, box) => {
    const a = $(box).find("a[href]").first();
    const p = normalizePath(a.attr("href"));
    const idm = ($(box).find("span[id^=cat]").attr("id") ?? "").match(/cat(\d+)Title/);
    if (!p || !idm) return;
    out.push({ id: Number(idm[1]), name: cleanText($(box).find(".mlr-category-title").text()), path: p, image: absoluteUrl($(box).find("img").attr("src")) });
  });
  return out;
}

export function parseTopicPage(html: string): { title: string; html: string; text: string } {
  const $ = cheerio.load(html);
  $("script, style, #YoutubeVideoModal, .mlr-breadcrumb-goback, form").remove();
  const body = $(".mlr-content-body-wrapper").first();
  const scope = body.find(".topic-page, .page-body, .page").first().length ? body.find(".topic-page, .page-body, .page").first() : body;
  const title = cleanText(scope.find("h1, h2, .page-title").first().text()) || cleanText($("title").text());
  const inner = (scope.html() ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return { title, html: inner, text: htmlToText($, scope.get(0)) };
}

export function parseSitemapXml(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

export function parseHtmlSitemap(html: string): { name: string; path: string }[] {
  const $ = cheerio.load(html);
  const out: { name: string; path: string }[] = [];
  $(".sitemap-page a[href], .page.sitemap-page a[href], .entity a[href]").each((_, a) => {
    const p = normalizePath($(a).attr("href"));
    if (p) out.push({ name: cleanText($(a).text()), path: p });
  });
  return out;
}

export function parseHeaderContact(html: string): { phone?: string; address?: string; tagline?: string; promos: string[] } {
  const $ = cheerio.load(html);
  const text = cleanText($(".mlr-header-container, .mlr-top-header, header").first().text() || $("body").text().slice(0, 2000));
  const phone = text.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0];
  const addr = text.match(/\d{3,5}\s+[A-Z][\w.]*\s+[A-Za-z. ]+?(?:Drive|Dr\.?|Street|St\.?|Ave\.?|Avenue|Blvd\.?)\s+[A-Za-z ]+,\s*CA\s*\d{5}/)?.[0];
  const tagline = cleanText($(".mlr-home-tagline").first().text()) || undefined;
  const promos: string[] = [];
  $(".mlr-home-cta, .mlr-home-cta-2, .mlr-home-tagline-2, .mlr-home-promo, .home-promo-container").each((_, e) => {
    const t = cleanText($(e).text());
    if (t) promos.push(t);
  });
  return { phone, address: addr, tagline, promos };
}
