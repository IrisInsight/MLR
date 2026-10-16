import type { Pricing } from "../../scripts/lib/catalog-types";

export const PHONE_DISPLAY = "(714) 738-0031";
export const PHONE_HREF = "tel:+17147380031";
export const LIVE_SITE = "https://www.mlrpackaging.com";

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

export function priceUnitLabel(pricing: Pricing): string {
  const unit = pricing.unit?.replace(/^price per\s*/i, "").replace(/\.$/, "").trim();
  return unit ? `per ${unit.toLowerCase()}` : "";
}

/** Human-readable pricing line that never invents a number. */
export function describePricing(pricing: Pricing): string {
  if (pricing.status === "listed" && typeof pricing.price === "number") {
    const unit = priceUnitLabel(pricing);
    const tiers = pricing.tiers && pricing.tiers.length > 1 ? ` (${pricing.tiers.map((t) => `${t.minQty}: ${formatMoney(t.price)}`).join(", ")})` : "";
    return `${formatMoney(pricing.price)}${unit ? " " + unit : ""} list${tiers}`;
  }
  if (pricing.status === "call_for_price") return "Call for pricing";
  if (pricing.status === "login_required") return "Log in on mlrpackaging.com for pricing";
  return "Call for pricing";
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/["'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(s: string | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}
