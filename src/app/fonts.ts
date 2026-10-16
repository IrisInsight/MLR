import localFont from "next/font/local";

// Only the weights the design actually uses are shipped (every declared face is preloaded,
// so each extra weight costs ~22 KB on the critical path for mobile LCP).
export const barlow = localFont({
  src: [
    { path: "../../public/fonts/Barlow-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Barlow-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-barlow",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const barlowCondensed = localFont({
  src: [
    { path: "../../public/fonts/BarlowCondensed-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/BarlowCondensed-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
  adjustFontFallback: "Arial",
});
