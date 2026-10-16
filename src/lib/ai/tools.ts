import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { company, complementaryProducts, getCategory, getProductById, getProductByPath, getProductBySku, isOpenNow, productSearch, summarize, type ProductSummary } from "@/lib/catalog";
import { saveLead, type Lead } from "@/lib/leads";
import { describePricing } from "@/lib/format";

export interface ToolDeps {
  transcript: () => { role: string; text: string }[];
  page?: string;
}

function withPriceLine(p: ProductSummary) {
  return { ...p, priceLine: describePricing(p.pricing) };
}

function resolveProduct(ref: string) {
  const r = ref.trim();
  return getProductBySku(r) ?? getProductById(r) ?? getProductByPath(r.startsWith("/") ? r : `/${r}`) ?? getProductByPath(r.replace(/^https?:\/\/(www\.)?mlrpackaging\.com/, ""));
}

export function makeTools(deps: ToolDeps) {
  return {
    search_products: tool({
      description:
        "Search MLR's catalog (fuzzy + keyword, with buyer synonyms such as 'pallet wrap' → stretch film). Returns up to `limit` matching products with SKU, category, key specs, list price (if the website shows one) and the catalog path. Call this before recommending products.",
      inputSchema: z.object({
        query: z.string().min(1).max(200).describe("What the customer is looking for, in their words or product terms"),
        limit: z.number().int().min(1).max(12).optional().describe("Max results (default 6)"),
        categoryPath: z.string().optional().describe("Restrict to a catalog category path such as /gloves or /strapping/steel"),
      }),
      execute: async ({ query, limit, categoryPath }) => {
        const hits = productSearch.search(query, { limit: limit ?? 6, categoryPath });
        return {
          query,
          count: hits.length,
          products: hits.map((h) => ({ ...withPriceLine(summarize(h.product)), ...(h.companion ? { goesWith: true } : {}) })),
          note: hits.length ? "Availability and lead time are confirmed by phone; the website has no live inventory." : "No catalog match. Say so, offer the closest alternative or a call — MLR sources more than what is online.",
        };
      },
    }),

    get_product: tool({
      description: "Get full details for one product by SKU (item number), catalog path, or product id: description, every spec, variants/sizes, list pricing tiers, and the live-site URL.",
      inputSchema: z.object({ ref: z.string().min(1).max(200).describe("SKU, product id, or catalog path") }),
      execute: async ({ ref }) => {
        const p = resolveProduct(ref);
        if (!p) return { found: false, ref };
        const cat = getCategory(p.categoryPath);
        return {
          found: true,
          product: withPriceLine(summarize(p)),
          description: p.shortDescription ?? "",
          fullDescription: p.fullDescription ?? "",
          specs: p.specs,
          variants: p.attributes,
          pricing: p.pricing,
          category: { path: p.categoryPath, name: cat?.title ?? cat?.name ?? "" },
          vendorSku: p.vendorSku,
        };
      },
    }),

    get_complementary: tool({
      description: "Products customers typically buy together with the given SKU (curated 'customers also buy' list, real catalog items only). Use it to suggest 1–3 add-ons.",
      inputSchema: z.object({ sku: z.string().min(1).max(60) }),
      execute: async ({ sku }) => {
        const p = resolveProduct(sku);
        if (!p) return { found: false, sku, products: [] };
        return { found: true, for: { sku: p.sku, name: p.name }, products: complementaryProducts(p.id, 6).map((c) => withPriceLine(summarize(c))) };
      },
    }),

    get_company_info: tool({
      description: "MLR company facts: hours and whether the store is open right now, phone, address, free local delivery rules, will-call minimum, service area, returns and shipping policy, special pricing.",
      inputSchema: z.object({ topic: z.enum(["hours", "delivery", "contact", "returns", "pricing", "about", "all"]).optional() }),
      execute: async ({ topic }) => {
        const open = isOpenNow();
        const base = { openNow: open, hours: company.hours.summary, hoursNote: company.hours.note, phone: company.phone, phoneHref: company.phoneHref, email: company.email, address: company.address.full };
        switch (topic) {
          case "hours":
            return base;
          case "delivery":
            return { ...base, freeLocalDelivery: company.freeLocalDelivery, serviceArea: company.serviceArea, shipping: company.shippingReturns.split("Return Policy")[0] };
          case "returns":
            return { ...base, returns: company.shippingReturns };
          case "pricing":
            return { ...base, specialPricing: company.specialPricing };
          case "about":
            return { ...base, about: company.about, founded: company.founded, fleet: company.fleet };
          default:
            return { ...base, freeLocalDelivery: company.freeLocalDelivery, serviceArea: company.serviceArea, specialPricing: company.specialPricing, returns: company.shippingReturns, founded: company.founded };
        }
      },
    }),

    add_to_quote: tool({
      description: "Add a real catalog item to the visitor's quote list (no payment; a sales rep prices it). Only call after the visitor asks for it or agrees. Quantity is in the product's selling unit (case, roll, box, each).",
      inputSchema: z.object({
        sku: z.string().min(1).max(60),
        quantity: z.number().int().min(1).max(100000).default(1),
        note: z.string().max(200).optional().describe("Size/color variant or a note for the rep"),
      }),
      execute: async ({ sku, quantity, note }) => {
        const p = resolveProduct(sku);
        if (!p) return { ok: false, error: `No catalog item with SKU ${sku}` };
        return { ok: true, item: { id: p.id, sku: p.sku, name: p.name, path: p.path, image: p.images[0] ?? p.thumbnail, qty: quantity, unit: p.pricing.unit, note }, message: `Added ${quantity} × ${p.name} (${p.sku}) to the quote list.` };
      },
    }),

    request_callback: tool({
      description: "File a call-back / quote request with MLR's sales team. Requires at least a name and a phone number or email. Include the items and quantities discussed and any timeline. The chat transcript is attached automatically.",
      inputSchema: z.object({
        name: z.string().min(1).max(120),
        phone: z.string().max(40).optional(),
        email: z.string().max(120).optional(),
        company: z.string().max(120).optional(),
        preferredTime: z.string().max(120).optional().describe("When they want the call, e.g. 'tomorrow morning'"),
        timeline: z.string().max(200).optional().describe("When they need the product"),
        notes: z.string().max(1000).optional(),
        items: z.array(z.object({ sku: z.string(), quantity: z.number().int().min(1).default(1), note: z.string().max(200).optional() })).optional(),
      }),
      execute: async (input) => {
        if (!input.phone && !input.email) return { ok: false, error: "Need a phone number or email to call back." };
        const items: Lead["items"] = (input.items ?? []).map((it) => {
          const p = resolveProduct(it.sku);
          return { sku: p?.sku ?? it.sku, name: p?.name ?? it.sku, qty: it.quantity, note: it.note };
        });
        const lead = await saveLead({
          source: "callback",
          name: input.name,
          phone: input.phone,
          email: input.email,
          company: input.company,
          preferredTime: input.preferredTime,
          timeline: input.timeline,
          notes: input.notes,
          items,
          transcript: deps.transcript(),
          page: deps.page,
        });
        const open = isOpenNow();
        return { ok: true, leadId: lead.id, message: `Call-back request filed for ${input.name}. ${open ? "The sales team is in now and will call shortly." : "The team will call when they open (Mon–Fri 7:30 AM Pacific)."}` };
      },
    }),
  };
}

export type MlrTools = ReturnType<typeof makeTools>;
