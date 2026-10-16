# MLR Packaging — concept redesign with “Ask MLR”

A concept rebuild of [mlrpackaging.com](https://www.mlrpackaging.com) (nopCommerce, 2017 theme) as a modern Next.js site with **Ask MLR**, an AI sales assistant that searches the real catalog, cross-sells, builds quote lists and hands off to the counter at (714) 738-0031.

> **Concept preview — not the live MLR Packaging site.** Every page is `noindex` and `robots.txt` blocks crawlers. Product data and images belong to MLR Packaging and are hot-linked from the live site.

## What's in the box

| Area | Where |
|---|---|
| Polite, rerunnable catalog scraper (2 concurrent requests, delay, real UA, cached HTML) | `scripts/scrape.ts` → `data/catalog.json`, `data/scrape-report.md` |
| Hand-written enrichment (summaries, use cases, buyer synonyms, qualifying questions, cross-sells, buying guides, industry kits) | `data/enrichment/*.json` → `scripts/enrich.ts` → `data/enriched.json` |
| Validator: fails if any complementary SKU / category / quick pick doesn't exist | `scripts/validate-enrichment.ts`, `scripts/check-links.ts` |
| Site: home, every category & subcategory, every product, search, industries, guides, about, special pricing, shipping & returns, Prop 65, contact, quote list | `src/app/(site)/**` |
| Ask MLR: streaming chat with tools, product cards, quote list, call-back leads, rate limits | `src/app/api/chat/route.ts`, `src/lib/ai/*`, `src/components/chat/*` |
| Full-screen chat demo | `/chat` |
| “Step 1” preview: the current homepage screenshot with the real widget floating on it | `/preview` |
| One-script-tag embed for any site (incl. nopCommerce) | `public/embed.js` + `/embed` |
| Admin (password protected): leads + anonymized top questions | `/admin` |
| Tests: search, tools, enrichment validator; live evals; screenshots; Lighthouse | `tests/*`, `scripts/eval.ts`, `scripts/screenshots.ts`, `scripts/lighthouse.ts` |

URLs keep the live site's slugs (`/stretch-film/hand-film/cast/...`, `/elite-blue-nitrile-industrial-grade-glove`), and the flat nopCommerce product slugs resolve too, so a real migration keeps its SEO.

## Running it

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
```

Scripts:

```bash
npm run scrape                       # crawl mlrpackaging.com → data/catalog.json (uses scrape-cache/ when present)
npm run scrape -- --fresh            # ignore the cache
npm run enrich                       # expand data/enrichment/*.json → data/enriched.json (and validate)
npm run validate                     # fail if enrichment references anything not in the catalog
npm run check-links [-- --live]      # every product URL exists; --live also HEAD-checks a sample on mlrpackaging.com
npm test                             # vitest: search ("white gloves" → gloves, "stretch film" → film + dispenser), tools, validator
npm run typecheck
npm run eval -- --url https://<deployment>   # ~25 live questions against /api/chat → data/eval-report.md
npm run screenshots -- --url http://localhost:3000   # docs/screenshots/*.png (desktop + mobile)
npm run lighthouse -- --url http://localhost:3000    # mobile Lighthouse for home / category / product
```

## Environment

Everything is optional; the app runs in **demo mode** with nothing set (see `.env.example`).

| Variable | Effect |
|---|---|
| *(none on Vercel)* | Ask MLR calls `anthropic/claude-sonnet-5.5` through the **Vercel AI Gateway**, authenticated by OIDC automatically. |
| `AI_GATEWAY_API_KEY` | Same, for non-Vercel hosts. |
| `ANTHROPIC_API_KEY` | Calls Anthropic directly with `claude-sonnet-5-5` instead (takes precedence). |
| `AI_MODEL` | Overrides the model id (gateway form, e.g. `anthropic/claude-sonnet-5.5`). Note: the AI Gateway **free tier does not serve Claude Sonnet 5.5** — add gateway credits or set `ANTHROPIC_API_KEY`; until then the chat shows its call/call-back fallback. |
| `BLOB_READ_WRITE_TOKEN` | Leads and question logs are stored as **private** objects in Vercel Blob. Without it: leads are logged server-side and kept in memory, the user still sees a success message, and `/admin` says “Connect a Blob store to save leads.” |
| `ADMIN_PASSWORD_SHA256` | SHA-256 hex of the admin password. The repo commits only the hash of the generated concept password. |

If the model call fails (no credits, no auth, outage), the chat shows a friendly fallback with tap-to-call and the call-back form, and the reason is logged server-side (`[ask-mlr] ...`).

## Ask MLR

- **Stack:** Next.js App Router + Vercel AI SDK (`streamText`, UI message stream) with the AI Gateway provider; Anthropic prompt caching on the static system prompt (which includes a compact catalog index).
- **Tools:** `search_products` (MiniSearch fuzzy + keyword + buyer synonyms), `get_product`, `get_complementary`, `get_company_info`, `add_to_quote`, `request_callback`.
- **Behavior:** finds real products first, asks one qualifying question, suggests 1–3 complementary items, ends with a next step (call, call back, add to quote, product link), mentions free local delivery, never invents products/prices/stock (“availability confirmed by phone”), declines off-topic requests and prompt injection.
- **Abuse protection:** per-IP sliding-window rate limit, caps on turns and transcript size, input length limit, honeypot on forms.

## Embed on any site (one script tag)

```html
<script src="https://mlr-packaging.vercel.app/embed.js" defer></script>
```

Optional attributes: `data-label="Ask MLR"`, `data-color="#d71920"`, `data-position="left|right"`. It injects a floating button that opens `/embed` in an iframe; `window.AskMLR.open()` / `.close()` are available for custom buttons. See it on the current site at `/preview`.

## Data notes

- The live site has **no product URLs in its sitemap** — products were discovered by crawling every category (including pagination) and visiting every product page. Category pages come in two formats (custom spec tables and standard grids); both are parsed.
- Nested theme URLs (`/stretch-film/hand-film/cast/...`) only resolve while the server's category cache is warm, so the scraper fetches the flat nopCommerce slug first and records it as `canonicalPath`; “View product” links use that URL.
- Store hours are not published on the website; Mon–Fri 7:30 AM–5 PM comes from business listings (Yelp, Yellow Pages, Yahoo Local, MapQuest agree; two outliers) and the assistant says to confirm by phone.
- Service area (Ventura, LA, Riverside, Orange, San Diego counties) and industries served come from the owner's brief.
