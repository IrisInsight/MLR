"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { looksConversational, openAskMLR } from "@/lib/site";

const EXAMPLES = ["I need to wrap 20 pallets a day", "white nitrile gloves", "strapping for lumber bundles", "12x12x12 boxes"];

export function SearchBar({ size = "md", autoFocus = false, initial = "" }: { size?: "md" | "lg"; autoFocus?: boolean; initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    if (looksConversational(query)) {
      openAskMLR({ message: query, send: true });
    } else {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };
  const big = size === "lg";
  return (
    <form onSubmit={onSubmit} role="search" className={`flex w-full items-stretch overflow-hidden rounded-lg border-2 border-ink bg-white ${big ? "shadow-float" : ""}`}>
      <label className="sr-only" htmlFor={`site-search-${size}`}>
        Search products or ask a question
      </label>
      <input
        id={`site-search-${size}`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder={big ? `Search or ask — “${EXAMPLES[0]}”` : "Search products or ask a question…"}
        className={`min-w-0 flex-1 bg-transparent px-4 outline-none placeholder:text-ink-muted ${big ? "py-4 text-lg" : "py-2.5 text-[15px]"}`}
        autoComplete="off"
        enterKeyHint="search"
      />
      <button type="submit" className={`shrink-0 bg-ink px-4 font-display font-semibold uppercase tracking-wide text-white hover:bg-red ${big ? "text-base sm:px-6" : "text-sm"}`}>
        {big ? "Search / Ask" : "Go"}
      </button>
    </form>
  );
}
