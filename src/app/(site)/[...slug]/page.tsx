import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allCategories, allProducts, getCategory, getProductByPath } from "@/lib/catalog";
import { CategoryPage, categoryMetadata } from "@/components/product/CategoryPage";
import { ProductPage, productMetadata } from "@/components/product/ProductPage";

export const dynamicParams = true;
export const revalidate = false;

/** Pre-render every category and the first slice of products; the rest render on first request and are cached. */
export function generateStaticParams() {
  const cats = allCategories().map((c) => ({ slug: c.path.split("/").filter(Boolean) }));
  const prods = allProducts()
    .slice(0, 400)
    .map((p) => ({ slug: p.path.split("/").filter(Boolean) }));
  return [...cats, ...prods];
}

function resolve(slug: string[]) {
  const path = "/" + slug.map(decodeURIComponent).join("/");
  const product = getProductByPath(path);
  if (product) return { kind: "product" as const, product };
  const category = getCategory(path);
  if (category) return { kind: "category" as const, category };
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) return { title: "Not found" };
  return r.kind === "product" ? productMetadata(r.product) : categoryMetadata(r.category);
}

export default async function CatchAll({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) notFound();
  return r.kind === "product" ? <ProductPage product={r.product} /> : <CategoryPage category={r.category} />;
}
