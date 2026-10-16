import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";

export function TopicPage({ eyebrow, title, intro, children, aside }: { eyebrow: string; title: string; intro?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ name: title }]} />
      <div className="mt-4 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display mt-1 text-4xl md:text-5xl">{title}</h1>
          {intro && <p className="prose-mlr mt-4 text-xl">{intro}</p>}
          <div className="prose-mlr mt-6">{children}</div>
        </div>
        {aside && <aside className="lg:col-span-4">{aside}</aside>}
      </div>
    </div>
  );
}

/** Render scraped topic text (paragraph-per-line) as paragraphs. */
export function TextBlocks({ text }: { text: string }) {
  return (
    <>
      {text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line, i) => {
          const isHeading = line.length < 60 && !/[.:]$/.test(line) && /^[A-Z]/.test(line) && line.split(" ").length <= 6;
          return isHeading ? <h2 key={i}>{line}</h2> : <p key={i}>{line}</p>;
        })}
    </>
  );
}

export function ContactAside() {
  return (
    <div className="card sticky top-4 p-5">
      <p className="display text-2xl">Talk to a person</p>
      <a href="tel:+17147380031" className="mt-2 block font-display text-3xl font-bold text-red">
        (714) 738-0031
      </a>
      <p className="text-sm text-ink-muted">Mon–Fri 7:30 AM–5 PM · Fax (714) 738-0007</p>
      <a href="mailto:Sales@MlrPackaging.com" className="mt-2 block text-steel underline underline-offset-2">
        Sales@MlrPackaging.com
      </a>
      <p className="mt-3 text-sm text-ink-soft">
        1388 E Valencia Dr
        <br />
        Fullerton, CA 92831
      </p>
      <a href="https://maps.google.com/?q=1388+E+Valencia+Dr+Fullerton+CA+92831" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-steel underline underline-offset-2">
        Directions ↗
      </a>
    </div>
  );
}
