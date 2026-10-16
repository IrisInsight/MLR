/** Shared shape of data/catalog.json (written by scripts/scrape.ts, read by the app). */

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

export interface ProductAttribute {
  name: string;
  description?: string;
  required: boolean;
  options: string[];
}

export interface Crumb {
  name: string;
  path: string;
}

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
  breadcrumb: Crumb[];
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
  /** The flat nopCommerce SeName path that always resolves on the live site. */
  canonicalPath: string;
  categoryPath: string;
  categoryPaths: string[];
  categoryNames: string[];
  breadcrumb: Crumb[];
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

export interface CompanyHours {
  summary: string;
  days: { day: string; open: string; close: string }[];
  timezone: string;
  source: string;
  verifiedOnWebsite: boolean;
  note: string;
}

export interface CompanyInfo {
  name: string;
  legalName: string;
  tagline: string;
  homePromos: string[];
  founded: number;
  phone: string;
  phoneHref: string;
  fax: string;
  email: string;
  address: { street: string; city: string; state: string; zip: string; full: string };
  hours: CompanyHours;
  freeLocalDelivery: { headline: string; detail: string; willCall: string; source: string };
  serviceArea: { counties: string[]; state: string; source: string };
  industries: { key: string; name: string }[];
  fleet?: string;
  about: string;
  mission?: string;
  inspiration?: string;
  specialPricing: string;
  shippingReturns: string;
  prop65: string;
  website: string;
  logo: string;
  platform: string;
}

export interface TopicPage {
  path: string;
  url: string;
  title: string;
  text: string;
  html: string;
}

export interface Catalog {
  source: string;
  scrapedAt: string;
  robotsDisallow: string[];
  company: CompanyInfo;
  topics: Record<string, TopicPage>;
  nav: { megaMenu: { name: string; path: string }[]; homeCategories: { id: number; name: string; path: string; image?: string }[] };
  sitemap: { xmlUrls: string[]; htmlLinks: { name: string; path: string }[] };
  categories: CatalogCategory[];
  products: CatalogProduct[];
}

/** Shape of data/enriched.json (hand-written by Claude, validated by scripts/validate-enrichment.ts). */
export interface EnrichedProduct {
  id: string;
  sku: string;
  path: string;
  summary: string;
  useCases: string[];
  searchTerms: string[];
  keyQuestions: string[];
  /** SKUs of complementary products; every one must exist in the catalog. */
  complementary: string[];
}

export interface BuyingGuide {
  slug: string;
  title: string;
  categoryPath: string;
  intro: string;
  sections: { heading: string; body: string }[];
  quickPicks?: { label: string; sku: string }[];
}

export interface CategoryEnrichment {
  path: string;
  summary: string;
  searchTerms: string[];
  useCases: string[];
  keyQuestions: string[];
  /** Category paths whose products go with this category (cross-sell rules). */
  complementaryCategories: string[];
}

export interface Enriched {
  generatedAt: string;
  products: EnrichedProduct[];
  categories: CategoryEnrichment[];
  buyingGuides: BuyingGuide[];
  industries: { key: string; name: string; headline: string; intro: string; categoryPaths: string[]; featuredSkus: string[] }[];
}
