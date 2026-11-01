/*
 * The layout audit: one in-page function that measures the rendered
 * geometry of a page and returns every violation of the site's layout
 * contract. It is evaluated by layout.spec.js on every route at every
 * audited width, and it is plain browser JS so the same function can be
 * run by hand against any page.
 *
 * The contract:
 *  - overflow: the document never scrolls sideways.
 *  - section: blocks in <main> (and in a page-level article) are set off
 *    by at least the section gap.
 *  - stack: any two block surfaces stacked one above the other inside a
 *    section are at least the stack gap (16px) apart.
 *  - row: block surfaces laid side by side start on the same line.
 *  - word: no word of running text breaks across lines mid-word.
 *  - icon: an icon in a control is inside the control and vertically
 *    centred on it (±2px).
 *  - target: every control is at least 44×44px, counting the label
 *    that activates it. Links inside running text are exempt.
 *  - field: a label and the control it names share one parent. A field
 *    root that cannot hold a block control (a <p> around a select) is
 *    split by the parser, and the label is left in a box of its own.
 *  - picker: a select drawn as base-select lays out as flex, so its
 *    picker icon sits inside the box beside the value, not under it.
 *  - double: a flex or grid container spaces its items with gap; an
 *    item that also carries a block margin is spaced twice.
 *  - inset: a bordered surface's padding is its inset. Its first and
 *    last children carry no outward margin, which would add a band
 *    the padding does not account for (a 16px strip under every
 *    component preview).
 */
export function layoutAudit(opts = {}) {
  const STACK = opts.stack ?? 16;
  const SECTION = opts.section ?? (innerWidth >= 768 ? 80 : 48);
  const TARGET = opts.target ?? 44;
  const out = [];
  const visible = (e) => {
    if (!e.isConnected) return false;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (r.right <= 0 || r.bottom + scrollY <= 0) return false;
    for (let n = e; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return false;
      if (
        n.matches(
          '[data-bn-visually-hidden], [hidden], dialog:not([open]), [popover]:not(:popover-open)',
        )
      )
        return false;
    }
    return true;
  };
  const name = (e) => {
    let s = e.tagName.toLowerCase();
    for (const a of e.attributes) {
      if (
        ['variant', 'id', 'role', 'aria-label'].includes(a.name) ||
        a.name.startsWith('data-bn')
      ) {
        s += `[${a.name}${a.value ? '=' + a.value.slice(0, 28) : ''}]`;
      }
    }
    return s;
  };
  const path = (e) => {
    const p = [];
    for (let n = e; n && n !== document.body && p.length < 4; n = n.parentElement)
      p.unshift(name(n));
    return p.join(' > ');
  };
  const main = document.querySelector('main');
  if (!main) return [{ rule: 'main', at: 'no <main>' }];

  // overflow
  const over = document.documentElement.scrollWidth - innerWidth;
  if (over > 0) {
    let worst = null;
    for (const e of document.body.querySelectorAll('*')) {
      const r = e.getBoundingClientRect();
      if (r.right > innerWidth + 1 && visible(e)) {
        let clipped = false;
        for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
          const o = getComputedStyle(n).overflowX;
          if (o !== 'visible') {
            clipped = true;
            break;
          }
        }
        if (!clipped && (!worst || r.right > worst.r)) worst = { e, r: r.right };
      }
    }
    out.push({ rule: 'overflow', at: worst ? path(worst.e) : 'document', px: over });
  }

  // section + stack + row
  const SURFACE =
    'figure, table, pre, details, article, section, form, dl, iframe, ul[variant], ol[variant], [role="tabpanel"]';
  const isSurface = (e) =>
    e.matches(SURFACE) && !(e.matches('pre') && e.parentElement.matches('figure'));
  const flowKids = (p) =>
    [...p.children].filter(
      (c) => visible(c) && !['absolute', 'fixed'].includes(getComputedStyle(c).position),
    );
  const sectionParents = [main, ...main.querySelectorAll(':scope > article')];
  for (const p of sectionParents) {
    const kids = flowKids(p);
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1],
        b = kids[i];
      const isSec = (e) => e.matches('section, article, aside, form, nav, search');
      if (
        p === main
          ? !(isSec(a) || isSec(b))
          : !(a.matches('section, aside') || b.matches('section, aside'))
      )
        continue;
      const gap = Math.round(b.getBoundingClientRect().top - a.getBoundingClientRect().bottom);
      if (gap < SECTION - 1)
        out.push({ rule: 'section', at: `${path(a)} → ${name(b)}`, px: gap, want: SECTION });
    }
  }
  for (const p of main.querySelectorAll('section, article, aside, figure, form, details')) {
    if (!visible(p)) continue;
    const kids = flowKids(p);
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1],
        b = kids[i];
      if (!isSurface(a) || !isSurface(b)) continue;
      const ra = a.getBoundingClientRect(),
        rb = b.getBoundingClientRect();
      const stacked = rb.top >= ra.bottom - 1 || ra.top >= rb.bottom - 1;
      if (stacked) {
        const gap = Math.round(rb.top >= ra.bottom - 1 ? rb.top - ra.bottom : ra.top - rb.bottom);
        if (gap < STACK - 0.5)
          out.push({ rule: 'stack', at: `${path(a)} → ${name(b)}`, px: gap, want: STACK });
      } else {
        const cs = getComputedStyle(p);
        if (
          Math.abs(ra.top - rb.top) > 1 &&
          cs.alignItems !== 'end' &&
          cs.alignItems !== 'center'
        ) {
          out.push({ rule: 'row', at: `${path(a)} | ${name(b)}`, px: Math.round(rb.top - ra.top) });
        }
      }
    }
  }

  // double: a flex or grid container already spaces its items with gap,
  // so an item that also carries a block margin is spaced twice.
  for (const c of main.querySelectorAll('*')) {
    const p = c.parentElement;
    if (!p || !visible(c) || c === p.firstElementChild) continue;
    const ps = getComputedStyle(p);
    const flexCol = ps.display.includes('flex') && ps.flexDirection.startsWith('column');
    if (!(flexCol || ps.display.includes('grid')) || !(parseFloat(ps.rowGap) > 0)) continue;
    const mt = parseFloat(getComputedStyle(c).marginTop);
    if (mt > 0) out.push({ rule: 'double', at: path(c), px: mt, gap: parseFloat(ps.rowGap) });
  }

  // inset: no outward margin on the first or last child of a bordered box
  for (const p of main.querySelectorAll('*')) {
    if (!visible(p)) continue;
    const ps = getComputedStyle(p);
    if (ps.display.startsWith('inline') || ps.display === 'contents') continue;
    if (!(parseFloat(ps.borderTopWidth) > 0 && parseFloat(ps.borderBottomWidth) > 0)) continue;
    const kids = flowKids(p);
    if (!kids.length) continue;
    const mt = parseFloat(getComputedStyle(kids[0]).marginTop);
    const mb = parseFloat(getComputedStyle(kids[kids.length - 1]).marginBottom);
    if (mt > 0) out.push({ rule: 'inset', at: path(kids[0]), edge: 'start', px: mt });
    if (mb > 0) out.push({ rule: 'inset', at: path(kids[kids.length - 1]), edge: 'end', px: mb });
  }

  // mid-word breaks in running text
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const seenWord = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (
      !el ||
      el.closest('pre, code, kbd, samp, textarea, script, style, svg, [aria-hidden="true"]')
    )
      continue;
    if (!/[A-Za-z]{3}/.test(t.data)) continue;
    range.selectNodeContents(t);
    const rects = range.getClientRects();
    if (rects.length < 2 || !visible(el)) continue;
    const re = /[A-Za-z][A-Za-z'’]{2,}/g;
    let m;
    while ((m = re.exec(t.data))) {
      range.setStart(t, m.index);
      range.setEnd(t, m.index + m[0].length);
      const rs = [...range.getClientRects()].filter((r) => r.width > 0);
      if (rs.length > 1 && Math.abs(rs[0].top - rs[rs.length - 1].top) > 2) {
        const key = path(el) + m[0];
        if (!seenWord.has(key)) {
          seenWord.add(key);
          out.push({ rule: 'word', at: path(el), word: m[0] });
        }
      }
    }
  }

  // icons centred in their controls
  const CONTROL =
    'button, a, summary, [role="button"], [role="tab"], [role="option"], [role="menuitem"], th[aria-sort], label';
  for (const icon of document.querySelectorAll(
    'main svg, nav svg, aside svg, header svg, dialog svg, [popover] svg',
  )) {
    const control = icon.parentElement?.closest(CONTROL);
    if (!control || !visible(icon) || !visible(control)) continue;
    const ri = icon.getBoundingClientRect(),
      rc = control.getBoundingClientRect();
    const inside =
      ri.left >= rc.left - 1 &&
      ri.right <= rc.right + 1 &&
      ri.top >= rc.top - 1 &&
      ri.bottom <= rc.bottom + 1;
    // Centre against the control's content line: the text box the icon sits beside.
    const label =
      [...control.childNodes].find((n) => n.nodeType === 3 && n.data.trim()) ||
      [...control.children].find(
        (c) => c !== icon && !c.contains(icon) && c.textContent.trim() && visible(c),
      );
    // Beside a label, the icon centres on the label's line; above or
    // below one (a tab-bar item), it centres across the control.
    let axis = 'y';
    let centre = rc.top + rc.height / 2;
    let iconCentre = ri.top + ri.height / 2;
    if (label) {
      const lr =
        label.nodeType === 3
          ? (range.selectNodeContents(label), range.getBoundingClientRect())
          : label.getBoundingClientRect();
      const beside = lr.height && lr.top < ri.bottom && lr.bottom > ri.top;
      if (beside && lr.height < rc.height) centre = lr.top + lr.height / 2;
      if (lr.height && !beside) {
        axis = 'x';
        centre = rc.left + rc.width / 2;
        iconCentre = ri.left + ri.width / 2;
      }
    }
    const off = Math.round((iconCentre - centre) * 10) / 10;
    if (!inside || Math.abs(off) > 2)
      out.push({ rule: 'icon', at: path(icon.closest('svg')), axis, px: off, inside });
  }

  // tap targets
  const TAPPABLE =
    'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="switch"], [role="checkbox"]';
  for (const c of document.querySelectorAll(TAPPABLE)) {
    if (!visible(c) || c.closest('[inert], [aria-hidden="true"]')) continue;
    if (
      c.matches('a') &&
      c.closest('p, li > p, td, dd, figcaption, small, footer p') &&
      !c.matches('[variant]')
    )
      continue;
    if (c.matches('a') && getComputedStyle(c).display === 'inline' && c.closest('p, li, td, dd'))
      continue;
    let r = c.getBoundingClientRect();
    const lab = c.labels?.[0] || c.closest('label');
    if (lab && visible(lab)) {
      const lr = lab.getBoundingClientRect();
      r = { width: Math.max(r.width, lr.width), height: Math.max(r.height, lr.height) };
    }
    if (r.width < TARGET - 0.5 || r.height < TARGET - 0.5) {
      out.push({
        rule: 'target',
        at: path(c),
        px: `${Math.round(r.width)}x${Math.round(r.height)}`,
      });
    }
  }

  // fields hold their label and control together
  for (const lab of document.querySelectorAll('label[for]')) {
    const control = document.getElementById(lab.htmlFor);
    if (!control || !visible(lab) || !lab.parentElement) continue;
    if (!lab.parentElement.contains(control))
      out.push({ rule: 'field', at: path(lab), control: name(control) });
  }

  // a base-select's picker icon sits in the box
  for (const sel of document.querySelectorAll('select')) {
    if (!visible(sel)) continue;
    const cs = getComputedStyle(sel);
    if (cs.appearance === 'base-select' && !/flex|grid/.test(cs.display))
      out.push({ rule: 'picker', at: path(sel), display: cs.display });
  }
  return out;
}
