/**
 * Social cards (Open Graph / Twitter), one per published route.
 *
 *   node scripts/og-cards.mjs            # writes dist/og-src/<slug>.html
 *   # then capture each at 1200×630 into examples/express/public/og/<slug>.png
 *   # (any headless browser; the cards are static HTML on the site's sheets)
 *
 * The cards compose the site's own system — the layered component sheets,
 * the code-block component and the shared highlighter — so a card can
 * never drift from the page it advertises. page.js maps each route to
 * its card (ogImageFor); a route without one falls back to the home card.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OG_CARDS } from '../examples/express/page.js';
import { highlightCodeBlocks } from '../examples/express/highlight.js';
import { renderTrinity } from '../examples/express/trinity.js';
import { HERO_DEMO_SOURCE } from '../examples/express/site-data.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'og-src');
mkdirSync(out, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const window = highlightCodeBlocks(
  renderTrinity('code-block', { caption: 'counter.html', code: HERO_DEMO_SOURCE }),
);

for (const card of OG_CARDS) {
  writeFileSync(
    join(out, `${card.slug}.html`),
    `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="/bn-css/layers.css" />
<link rel="stylesheet" href="/bn-css/reset.css" />
<link rel="stylesheet" href="/bn-css/trinity.css" />
<style>
  html, body { margin: 0; inline-size: 1200px; block-size: 630px; overflow: hidden; }
  body {
    display: grid;
    grid-template-columns: 440px minmax(0, 1fr);
    align-items: center;
    gap: 48px;
    padding: 64px;
    box-sizing: border-box;
    background: var(--color-background-grouped);
    color: var(--color-text-label);
    font-family: var(--font-body-family);
    color-scheme: light;
  }
  header { display: flex; align-items: center; gap: 16px; margin-block-end: 36px; }
  header img { inline-size: 56px; block-size: 56px; border-radius: 13px; }
  header p { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.02em; }
  small { display: block; margin-block-end: 12px; font-size: 22px; font-weight: 600; color: var(--color-tint-strong); }
  h1 { margin: 0; font-size: 58px; line-height: 1.04; font-weight: 700; letter-spacing: -0.035em; text-wrap: balance; }
  article > p { margin: 20px 0 0; font-size: 24px; line-height: 1.35; color: var(--color-text-label-2); text-wrap: pretty; }
  footer { margin-block-start: 32px; font-size: 22px; font-weight: 600; color: var(--color-text-label-2); }
  aside { min-inline-size: 0; }
  aside figure[variant='code'] { margin: 0; box-shadow: var(--shadow-float); }
  aside figcaption { font-size: 15px !important; }
  aside pre { font-size: 16.5px !important; line-height: 1.6 !important; overflow: hidden !important; }
</style>
</head>
<body>
<article>
  <header><img src="/apple-touch-icon.png" alt="" /><p>BaseNative</p></header>
  ${card.eyebrow ? `<small>${esc(card.eyebrow)}</small>` : ''}
  <h1>${esc(card.title)}</h1>
  <p>${esc(card.lede)}</p>
  <footer>basenative.com</footer>
</article>
<aside>${window}</aside>
</body>
</html>
`,
  );
  console.log(`dist/og-src/${card.slug}.html`);
}
