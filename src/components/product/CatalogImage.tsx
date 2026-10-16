import Image from "next/image";

/**
 * Product/category photo hot-linked from the live MLR site, with a kraft placeholder.
 * Remote photos are served `unoptimized` on purpose: they are already small (415–550 px JPEG/PNG
 * thumbnails), and routing 6,000+ of them through the image optimizer would add seconds of
 * first-hit latency and burn the optimization quota for a concept site.
 */
export function CatalogImage({ src, alt, className = "", sizes = "(min-width: 1024px) 25vw, 50vw", priority = false, fill = true, width, height }: { src?: string; alt: string; className?: string; sizes?: string; priority?: boolean; fill?: boolean; width?: number; height?: number }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-kraft text-kraft-deep ${className}`} aria-hidden="true">
        <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 16l16-8 16 8v16l-16 8-16-8z M8 16l16 8 16-8 M24 24v16" />
        </svg>
      </div>
    );
  }
  const remote = /^https?:\/\//.test(src);
  if (fill) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} fetchPriority={priority ? "high" : undefined} unoptimized={remote} className={`object-contain ${className}`} />;
  }
  return <Image src={src} alt={alt} width={width ?? 400} height={height ?? 400} sizes={sizes} priority={priority} fetchPriority={priority ? "high" : undefined} unoptimized={remote} className={className} />;
}
