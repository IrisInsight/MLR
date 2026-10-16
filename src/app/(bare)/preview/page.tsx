import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { LIVE_SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Step 1: Ask MLR on the current site", robots: { index: false, follow: false } };

/**
 * Shows a full-page screenshot of the CURRENT mlrpackaging.com homepage with the real
 * embeddable Ask MLR bubble floating over it — exactly what the one-script-tag embed does.
 */
export default function PreviewPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <div className="sticky top-0 z-[70] bg-ink text-white">
        <div className="container-x flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow text-safety">Step 1 · This week</p>
            <p className="font-display text-xl font-bold uppercase leading-tight">Drop Ask MLR on the existing site with one script tag.</p>
            <p className="text-sm text-white/75">Below is a screenshot of mlrpackaging.com as it is today, with the live widget floating in the corner. Nothing else changes.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/" className="btn bg-white/10 text-white hover:bg-white/20">
              Step 2: the redesign →
            </Link>
            <a href={LIVE_SITE} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Live site ↗
            </a>
          </div>
        </div>
        <div className="container-x pb-3">
          <code className="block overflow-x-auto rounded-md bg-black/40 px-3 py-2 font-mono text-[12px] text-white/90">{'<script src="https://mlr-packaging.vercel.app/embed.js" defer></script>'}</code>
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/preview/current-homepage.png" alt="Screenshot of the current mlrpackaging.com homepage" className="mx-auto block w-full max-w-[1366px] border-x border-line bg-white" />
      <Script src="/embed.js" strategy="afterInteractive" />
    </div>
  );
}
