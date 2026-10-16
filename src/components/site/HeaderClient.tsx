"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useQuote } from "@/components/quote/QuoteProvider";
import { PHONE_DISPLAY, PHONE_HREF, openAskMLR } from "@/lib/site";
import { QuoteIcon } from "./MobileCallBar";

interface NavCat {
  name: string;
  path: string;
  image?: string;
  count: number;
}

export function QuoteCount() {
  const { count, hydrated } = useQuote();
  return (
    <Link href="/quote" className="btn-outline relative hidden md:inline-flex" aria-label={`Quote list, ${count} items`}>
      <QuoteIcon className="h-4 w-4" />
      Quote
      {hydrated && count > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-red px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{count}</span>}
    </Link>
  );
}

export function HeaderClient({ cats, industries }: { cats: NavCat[]; industries: { name: string; path: string }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost -ml-2 px-2 md:hidden" aria-label="Open menu" aria-expanded={open}>
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-[88%] max-w-sm flex-col overflow-y-auto bg-white shadow-float animate-rise">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <Image src="/logo.png" alt="MLR Packaging" width={70} height={53} className="h-10 w-auto" />
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2" aria-label="Close menu">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <a href={PHONE_HREF} className="btn-primary">
                Call {PHONE_DISPLAY}
              </a>
              <button
                type="button"
                className="btn-dark"
                onClick={() => {
                  setOpen(false);
                  openAskMLR();
                }}
              >
                Ask MLR
              </button>
            </div>
            <p className="eyebrow px-4 pt-2">Products</p>
            <ul className="px-2 pb-2">
              {cats.map((c) => (
                <li key={c.path}>
                  <Link href={c.path} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-paper">
                    {c.image ? (
                      <Image src={c.image} alt="" width={40} height={40} className="h-10 w-10 rounded-sm object-cover" unoptimized />
                    ) : (
                      <span className="h-10 w-10 rounded-sm bg-kraft" />
                    )}
                    <span className="font-display text-lg font-semibold uppercase tracking-wide">{c.name}</span>
                    <span className="ml-auto text-xs text-ink-muted">{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="eyebrow px-4 pt-2">Industries</p>
            <ul className="px-2 pb-2">
              {industries.map((i) => (
                <li key={i.path}>
                  <Link href={i.path} onClick={() => setOpen(false)} className="block rounded-md px-2 py-2 font-display text-lg font-semibold uppercase tracking-wide hover:bg-paper">
                    {i.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="eyebrow px-4 pt-2">Company</p>
            <ul className="px-2 pb-24">
              {[
                ["/special-pricing", "Special pricing & quotes"],
                ["/quote", "Your quote list"],
                ["/about", "About MLR"],
                ["/shipping-returns", "Shipping & returns"],
                ["/contact", "Contact"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} onClick={() => setOpen(false)} className="block rounded-md px-2 py-2 font-medium hover:bg-paper">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
