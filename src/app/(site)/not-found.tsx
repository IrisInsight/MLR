import Link from "next/link";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-2 text-4xl">We couldn&apos;t find that page</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-muted">The product or category may have moved. Try a search, or call us — we source a lot more than what&apos;s online.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn-dark">Back home</Link>
        <a href={PHONE_HREF} className="btn-primary">Call {PHONE_DISPLAY}</a>
      </div>
    </div>
  );
}
