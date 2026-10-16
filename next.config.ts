import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Product photos are hot-linked from the live MLR site (concept only).
    remotePatterns: [
      { protocol: "https", hostname: "www.mlrpackaging.com" },
      { protocol: "https", hostname: "mlrpackaging.com" },
    ],
  },
  async headers() {
    return [
      {
        // Concept preview: keep every page out of search engines.
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        // The embeddable chat widget is loaded cross-origin by the script tag.
        source: "/embed.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300" },
        ],
      },
      {
        source: "/embed/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
    ];
  },
};

export default nextConfig;
