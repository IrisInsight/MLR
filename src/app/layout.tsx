import type { Metadata, Viewport } from "next";
import { barlow, barlowCondensed } from "./fonts";
import "./globals.css";
import { QuoteProvider } from "@/components/quote/QuoteProvider";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} — Concept`, template: `%s · MLR Packaging` },
  description: "Concept redesign of mlrpackaging.com with Ask MLR, an AI sales assistant. Packaging and industrial supplies, free local delivery across Southern California.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")),
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0f1720",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="flex min-h-screen flex-col">
        <QuoteProvider>{children}</QuoteProvider>
      </body>
    </html>
  );
}
