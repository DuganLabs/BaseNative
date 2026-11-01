import { test, expect } from '@playwright/test';

// The builder window at every width. Stacked (phone, or a column beside
// the app-shell rail) it used to split a fixed window height three ways
// into 128px scrollers: the canvas hint clipped, the palette a sliver,
// and empty space at the window's foot. At 1024 the stacked sections
// overlapped once a section was content-sized under the fixed height.
// The host's stack margin also opened a strip under the toolbar, and a
// wrapped toolbar nav hung off to the inline end.
for (const width of [320, 393, 768, 1024, 1280, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`builder window lays out cleanly at ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/builder/');
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await page.locator('.bn-builder__pane--canvas').waitFor();
      const result = await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const box = (s) => q(s).getBoundingClientRect();
        const problems = [];
        const names = ['canvas', 'palette', 'layers', 'inspector'];
        const panes = names.map((n) => box(`.bn-builder__pane--${n}`));
        for (let i = 0; i < panes.length; i++)
          for (let j = i + 1; j < panes.length; j++) {
            const a = panes[i];
            const b = panes[j];
            if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1)
              problems.push(`${names[i]} overlaps ${names[j]}`);
          }
        const stacked = Math.abs(panes[0].left - panes[3].left) < 2;
        const win = box('.bn-builder');
        // Every pane ends inside the window; nothing is cut off at its foot.
        for (const [i, p] of panes.entries())
          if (p.bottom > win.bottom + 1) problems.push(`${names[i]} runs past the window`);
        // The empty canvas shows its whole hint, never a clipped line.
        const hint = q('.bn-builder__empty-hint');
        const surface = box('.bn-builder__canvas-surface');
        if (hint && hint.getBoundingClientRect().bottom > surface.bottom + 1) problems.push('canvas hint clipped');
        if (stacked) {
          // Content-sized sections; only the long lists scroll inside.
          for (const n of ['canvas', 'palette', 'layers', 'inspector']) {
            const e = q(`.bn-builder__pane--${n}`);
            if (e.scrollHeight > e.clientHeight + 1) problems.push(`stacked ${n} pane clips its content`);
          }
          const groups = q('[data-bn-palette-groups]');
          if (groups.clientHeight < 240) problems.push(`palette list only ${groups.clientHeight}px tall`);
          const last = panes[3];
          if (win.bottom - last.bottom > 2) problems.push(`empty band ${Math.round(win.bottom - last.bottom)}px under inspector`);
          const nav = box('.bn-builder__toolbar nav');
          const title = box('.bn-builder__title');
          if (nav.top >= title.bottom - 1) {
            const l = nav.left - win.left;
            const r = win.right - nav.right;
            if (Math.abs(l - r) > 2) problems.push(`wrapped toolbar nav off-centre L${Math.round(l)} R${Math.round(r)}`);
          }
        }
        const gap = box('.bn-builder__body').top - box('.bn-builder__toolbar').bottom;
        if (Math.abs(gap) > 1) problems.push(`strip of ${Math.round(gap)}px under the toolbar`);
        return { problems, stacked };
      });
      expect(result.problems).toEqual([]);
      if (width <= 393) expect(result.stacked).toBe(true);
      if (width >= 1280) expect(result.stacked).toBe(false);
    });
  }
}
