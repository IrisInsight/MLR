#!/usr/bin/env tsx
/** npm run lighthouse -- --url http://localhost:3000 [--pages /,/stretch-film] [--cookie "_vercel_jwt=..."]  → lighthouse-report/*.json + summary (mobile) */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    pages: { type: "string", default: "/,/stretch-film/hand-film/cast,/stretch-film/hand-film/cast/hand-film-cast-80-gauge-18-x-1500" },
    /** Cookie header for protected Vercel previews, e.g. "_vercel_jwt=..." (from a share link). */
    cookie: { type: "string" },
  },
});
const base = (args.url ?? "").replace(/\/$/, "");
const out = path.resolve(process.cwd(), "lighthouse-report");
mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";

for (const p of (args.pages ?? "/").split(",")) {
  const name = p === "/" ? "home" : p.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const file = path.join(out, `${name}.json`);
  const extra = args.cookie ? ` --extra-headers='${JSON.stringify({ Cookie: args.cookie })}'` : "";
  execSync(`npx --yes lighthouse "${base}${p}" --quiet --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile --screenEmulation.mobile --output=json --output-path="${file}" --chrome-flags="--headless=new --no-sandbox --disable-gpu"${extra}`, {
    stdio: "inherit",
    env: { ...process.env, CHROME_PATH: chrome },
  });
  const r = JSON.parse(readFileSync(file, "utf8"));
  const c = r.categories;
  const score = (k: string) => Math.round((c[k]?.score ?? 0) * 100);
  console.log(`${p}: performance ${score("performance")} · accessibility ${score("accessibility")} · best-practices ${score("best-practices")} · seo ${score("seo")}  (LCP ${Math.round(r.audits["largest-contentful-paint"]?.numericValue ?? 0)} ms, CLS ${r.audits["cumulative-layout-shift"]?.displayValue})`);
}
