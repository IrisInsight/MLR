"use client";

import { openAskMLR, type AskEventDetail } from "@/lib/site";

export function AskMLRButton({ label = "Ask MLR", className = "btn-dark", detail }: { label?: string; className?: string; detail?: AskEventDetail }) {
  return (
    <button type="button" className={className} onClick={() => openAskMLR(detail)}>
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {label}
    </button>
  );
}

export function AskChip({ text }: { text: string }) {
  return (
    <button type="button" onClick={() => openAskMLR({ message: text, send: true })} className="rounded-full border border-white/25 bg-white/5 px-3 py-1 text-sm text-white/85 hover:border-safety hover:text-white">
      “{text}”
    </button>
  );
}

export function AskAboutProduct({ product }: { product: { id: string; sku: string; name: string; path: string } }) {
  return (
    <AskMLRButton
      label="Ask about this product"
      className="btn-outline"
      detail={{ product, message: `Tell me about ${product.name} (${product.sku}). What is it best for, and what goes with it?`, send: true }}
    />
  );
}
