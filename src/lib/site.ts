/** Static site constants safe to import from client components. */
export const SITE_NAME = "MLR Packaging Supplies & Equipment";
export const SITE_SHORT = "MLR Packaging";
export const PHONE_DISPLAY = "(714) 738-0031";
export const PHONE_HREF = "tel:+17147380031";
export const EMAIL = "Sales@MlrPackaging.com";
export const ADDRESS = "1388 E Valencia Dr, Fullerton, CA 92831";
export const HOURS_SHORT = "Mon–Fri 7:30 AM–5 PM";
export const LIVE_SITE = "https://www.mlrpackaging.com";
export const FREE_DELIVERY = "Free local delivery on orders over $600";
export const COUNTIES = ["Orange", "Los Angeles", "Riverside", "San Diego", "Ventura"];

export const INDUSTRIES = [
  { key: "lumber", name: "Lumber & Building Materials", short: "Lumber" },
  { key: "metal", name: "Metal & Steel", short: "Metal" },
  { key: "food-service", name: "Food Service", short: "Food Service" },
  { key: "janitorial", name: "Janitorial & Facilities", short: "Janitorial" },
] as const;

/** Custom DOM event used to open the Ask MLR widget from anywhere on the page. */
export const ASK_EVENT = "askmlr:open";

export interface AskEventDetail {
  message?: string;
  /** Send the message immediately instead of just prefilling it. */
  send?: boolean;
  product?: { id: string; sku: string; name: string; path: string };
}

export function openAskMLR(detail: AskEventDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<AskEventDetail>(ASK_EVENT, { detail }));
}

/** Heuristic: route plain-language requests to the assistant, keyword lookups to /search. */
export function looksConversational(q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return false;
  if (s.endsWith("?")) return true;
  const words = s.split(/\s+/);
  if (words.length >= 5) return true;
  return /\b(i|we|need|want|looking|help|how|what|which|should|recommend|best|per day|a day|wrap|ship|pack|protect|do you|can you|have)\b/.test(s) && words.length >= 3;
}
