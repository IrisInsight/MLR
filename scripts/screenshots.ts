#!/usr/bin/env tsx
/** npm run screenshots -- --url http://localhost:3000  → docs/screenshots/*.png (desktop + mobile) */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const { values: args } = parseArgs({ options: { url: { type: "string", default: "http://localhost:3000" }, out: { type: "string", default: "docs/screenshots" }, product: { type: "string" }, category: { type: "string" } } });
const base = (args.url ?? "").replace(/\/$/, "");
const out = path.resolve(process.cwd(), args.out ?? "docs/screenshots");
mkdirSync(out, { recursive: true });

const pages: { name: string; path: string; action?: "chat" | "quote"; full?: boolean }[] = [
  { name: "home", path: "/", full: true },
  { name: "category", path: args.category ?? "/stretch-film/hand-film", full: true },
  { name: "product", path: args.product ?? "/stretch-film/hand-film/cast/hand-film-cast-80-gauge-18-x-1500", full: true },
  { name: "quote", path: args.product ?? "/stretch-film/hand-film/cast/hand-film-cast-80-gauge-18-x-1500", action: "quote", full: true },
  { name: "chat", path: "/chat", action: "chat" },
  { name: "preview", path: "/preview" },
];
const viewports = { desktop: { width: 1366, height: 900 }, mobile: { width: 390, height: 844 } };

(async () => {
  const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (process.platform === "linux" ? "/opt/pw-browsers/chromium" : undefined);
  const browser = await chromium.launch({ args: ["--no-sandbox"], ...(exe ? { executablePath: exe } : {}) }).catch(() => chromium.launch({ args: ["--no-sandbox"] }));
  for (const [vpName, vp] of Object.entries(viewports)) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vpName === "mobile", hasTouch: vpName === "mobile" });
    for (const pg of pages) {
      const page = await ctx.newPage();
      await page.goto(base + pg.path, { waitUntil: "networkidle", timeout: 90_000 });
      await page.waitForTimeout(400);
      if (pg.action === "quote") {
        await page.getByRole("button", { name: /add to quote/i }).first().click();
        await page.waitForTimeout(300);
        await page.goto(base + "/quote", { waitUntil: "networkidle" });
        await page.waitForTimeout(400);
      }
      if (pg.action === "chat") {
        const q = "I need to wrap 20 pallets a day";
        await page.getByRole("textbox", { name: /message ask mlr/i }).fill(q);
        await page.keyboard.press("Enter");
        // wait for the stream to finish (Send button returns) or the fallback to appear
        await page.waitForFunction(() => !!document.querySelector("article") || !!document.querySelector("[role=alert]") || /Thinking/.test(document.body.innerText) === false, undefined, { timeout: 60_000 }).catch(() => {});
        await page.waitForTimeout(4000);
      }
      const file = path.join(out, `${pg.name}-${vpName}.png`);
      await page.screenshot({ path: file, fullPage: !!pg.full });
      console.log("saved", path.relative(process.cwd(), file));
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
})();
