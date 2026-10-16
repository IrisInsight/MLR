import localFont from "next/font/local";

export const barlow = localFont({
  src: [
    { path: "../../public/fonts/Barlow-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Barlow-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/Barlow-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/Barlow-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-barlow",
  display: "swap",
});

export const barlowCondensed = localFont({
  src: [
    { path: "../../public/fonts/BarlowCondensed-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/BarlowCondensed-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/BarlowCondensed-700.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/BarlowCondensed-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
});
