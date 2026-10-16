import type { Metadata } from "next";
import { QuotePageClient } from "@/components/quote/QuotePageClient";

export const metadata: Metadata = { title: "Your quote list", robots: { index: false, follow: false } };

export default function QuotePage() {
  return <QuotePageClient />;
}
