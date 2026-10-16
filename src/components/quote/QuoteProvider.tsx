"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface QuoteItem {
  id: string;
  sku: string;
  name: string;
  path: string;
  image?: string;
  qty: number;
  unit?: string;
  note?: string;
}

interface QuoteContextValue {
  items: QuoteItem[];
  count: number;
  add: (item: Omit<QuoteItem, "qty"> & { qty?: number }) => void;
  update: (id: string, patch: Partial<QuoteItem>) => void;
  remove: (id: string) => void;
  clear: () => void;
  hydrated: boolean;
}

const QuoteContext = createContext<QuoteContextValue | null>(null);
const KEY = "mlr-quote-v1";

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  const add = useCallback<QuoteContextValue["add"]>((item) => {
    setItems((prev) => {
      const qty = Math.max(1, Math.round(item.qty ?? 1));
      const existing = prev.find((x) => x.id === item.id);
      if (existing) return prev.map((x) => (x.id === item.id ? { ...x, qty: x.qty + qty, note: item.note ?? x.note } : x));
      return [...prev, { ...item, qty }];
    });
  }, []);
  const update = useCallback<QuoteContextValue["update"]>((id, patch) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch, qty: Math.max(1, Math.round(patch.qty ?? x.qty)) } : x)));
  }, []);
  const remove = useCallback((id: string) => setItems((prev) => prev.filter((x) => x.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: items.reduce((n, x) => n + x.qty, 0), add, update, remove, clear, hydrated }),
    [items, add, update, remove, clear, hydrated],
  );
  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
}

export function useQuote(): QuoteContextValue {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used inside <QuoteProvider>");
  return ctx;
}
