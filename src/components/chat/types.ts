/** Client-side view of the tool outputs produced by src/lib/ai/tools.ts (kept loose on purpose). */
import type { Pricing } from "../../../scripts/lib/catalog-types";

export interface CardProduct {
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
  pricing: Pricing;
  attributes: { name: string; options: string[] }[];
  priceLine?: string;
}

export interface SearchOutput {
  query: string;
  count: number;
  products: CardProduct[];
  note?: string;
}

export interface ProductOutput {
  found: boolean;
  product?: CardProduct;
}

export interface ComplementaryOutput {
  found: boolean;
  products: CardProduct[];
  for?: { sku: string; name: string };
}

export interface AddToQuoteOutput {
  ok: boolean;
  error?: string;
  message?: string;
  item?: { id: string; sku: string; name: string; path: string; image?: string; qty: number; unit?: string; note?: string };
}

export interface CallbackOutput {
  ok: boolean;
  error?: string;
  message?: string;
  leadId?: string;
}
