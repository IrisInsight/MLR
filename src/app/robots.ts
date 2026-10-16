import type { MetadataRoute } from "next";

// Concept preview: keep search engines out entirely.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
