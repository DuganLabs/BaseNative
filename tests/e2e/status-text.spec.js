import { test, expect } from '@playwright/test';

// The site's --success and --danger paint text (compare wins, status
// marks, the copied state). When those names came back from the dead
// they pointed at the system fills, which read 2.2 to 1 on white. Text
// in a status color holds the AA floor (4.5) against what it sits on.
const PAGES = ['/compare', '/', '/components'];

for (const path of PAGES) {
  test(`${path}: status-colored text holds AA contrast in light and dark`, async ({ page }) => {
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      const problems = await page.evaluate(() => {
        const lin = (v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        const parse = (c) => {
          const m = String(c).match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const p = m[1].split(',').map(parseFloat);
          return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
        };
        const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
        const over = (top, base) => ({
          r: top.r * top.a + base.r * (1 - top.a),
          g: top.g * top.a + base.g * (1 - top.a),
          b: top.b * top.a + base.b * (1 - top.a),
          a: 1,
        });
        const token = (name) => {
          const probe = document.createElement('span');
          probe.style.color = `var(${name})`;
          document.body.appendChild(probe);
          const v = getComputedStyle(probe).color;
          probe.remove();
          return v;
        };
        const paints = new Set([token('--success'), token('--danger')]);
        const background = (el) => {
          const layers = [];
          for (let n = el; n; n = n.parentElement) {
            const c = parse(getComputedStyle(n).backgroundColor);
            if (c && c.a > 0) {
              layers.push(c);
              if (c.a >= 1) break;
            }
          }
          let base = { r: 255, g: 255, b: 255, a: 1 };
          if (layers.length && layers[layers.length - 1].a >= 1) base = layers.pop();
          for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
          return base;
        };
        const out = [];
        for (const el of document.querySelectorAll('main *')) {
          if (!el.getClientRects().length) continue;
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!own) continue;
          const cs = getComputedStyle(el);
          if (!paints.has(cs.color)) continue;
          const fg = parse(cs.color);
          const bg = background(el);
          const a = lum(fg);
          const b = lum(bg);
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          if (ratio < 4.5) out.push(`${el.textContent.trim().slice(0, 30)} ${ratio.toFixed(2)}`);
        }
        return out;
      });
      expect(problems, `${path} ${scheme}`).toEqual([]);
    }
  });
}
