"use client";

import { useState } from "react";
import { useQuote, type QuoteItem } from "./QuoteProvider";

export function AddToQuoteButton({ item, className = "btn-primary", compact = false, showQty = false }: { item: Omit<QuoteItem, "qty">; className?: string; compact?: boolean; showQty?: boolean }) {
  const { add } = useQuote();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const onAdd = () => {
    add({ ...item, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };
  return (
    <div className={compact ? "flex items-center gap-1" : "flex flex-wrap items-center gap-2"}>
      {showQty && (
        <label className="flex items-center gap-1 text-sm">
          <span className="sr-only">Quantity</span>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-16 rounded-md border border-line bg-white px-2 py-2 text-center font-semibold"
            aria-label="Quantity"
          />
        </label>
      )}
      <button type="button" onClick={onAdd} className={`${className} ${compact ? "btn-sm" : ""}`} aria-live="polite">
        {added ? "✓ Added to quote" : compact ? "+ Quote" : "Add to quote"}
      </button>
    </div>
  );
}
