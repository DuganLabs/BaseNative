/**
 * Site chrome — the header, nav, footer and app shell every property was
 * hand-building because the design system exported none of it.
 *
 * GreenPut's marketing site, its platform shell, basenative.com and T4BS
 * each wrote their own header/nav (four implementations), their own
 * footer and their own skip-link/main/footer page skeleton. The markup
 * contracts below (`site-header`, `site-nav`, `nav-menu`, `site-footer`,
 * `footer-inner`, `skip-link`) are the ones GreenPut's templates already
 * use, so a property can adopt these renderers without renaming the
 * hooks its CSS and tests are written against. The app-shaped surfaces
 * get one more: `app-nav`, the adaptive primary nav — a bottom bar at
 * phone class, a fixed side rail when the viewport opens up (a Duo
 * unfolded, or any wide layout) — with its `app-nav-list`,
 * `app-nav-icon` and `app-nav-label` hooks.
 *
 * Everything here is a pure render function except initSiteHeader, the
 * one piece of behaviour chrome needs (the narrow-viewport nav toggle),
 * and initAppNav — which exists only for the app nav's optional More
 * sheet. renderAppNav's two postures need no behaviour at all: they are
 * one element under two media queries, so a posture change loses
 * nothing.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/** Hamburger glyph for the nav toggle, drawn on the icons package's 24-unit grid. */
const MENU_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

/** Ellipsis glyph for the app nav's More button, on the same 24-unit grid. */
const MORE_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';

/**
 * The <li> run for a nav item list. The item flagged `current` gets
 * aria-current="page" on its link; labels are escaped text, hrefs are
 * escaped attributes.
 *
 * @param {Array<{label: string, href: string, current?: boolean}>} items
 * @returns {string}
 */
function navItemsHtml(items) {
  return items
    .map((item) => {
      const current = item.current ? ' aria-current="page"' : '';
      return `<li><a href="${escapeAttr(item.href)}"${current}>${escapeText(item.label)}</a></li>`;
    })
    .join('');
}

/**
 * A standalone labelled nav list — the header's menu without the header
 * around it, for secondary navigation (sidebars, section navs, in-page
 * menus) that should carry the same contract.
 *
 * @param {object} [options]
 * @param {Array<{label: string, href: string, current?: boolean}>} [options.items]
 * @param {string} [options.label='Primary']  The nav's aria-label; escaped text
 * @param {string} [options.id]     Emitted as the <nav>'s id when present
 * @param {string} [options.attrs]  Raw attribute markup appended to the <nav>; not escaped
 * @returns {string}
 */
export function renderSiteNav(options = {}) {
  const { items = [], label = 'Primary', id, attrs = '' } = options;
  const idAttr = id ? ` id="${escapeAttr(id)}"` : '';
  return `<nav data-bn="site-nav" aria-label="${escapeAttr(label)}"${idAttr}${attrsSuffix(attrs)}><ul data-bn="nav-menu">${navItemsHtml(items)}</ul></nav>`;
}

/**
 * Site header: brand link, nav toggle and the primary nav menu, in the
 * shape GreenPut's layout template established. On wide viewports the
 * menu is a row; on narrow ones it collapses behind the toggle button
 * and initSiteHeader wires the open/close behaviour.
 *
 * The toggle is a real <button aria-expanded aria-controls> — not the
 * checkbox hack the hand-built headers used — so the collapsed state is
 * announced and keyboard-operable with no CSS tricks.
 *
 * @param {object} [options]
 * @param {object} [options.brand]
 * @param {string} [options.brand.name]   Escaped text, rendered beside the logo
 * @param {string} [options.brand.logo]   HTML slot (an SVG mark): not escaped; pass trusted markup only
 * @param {string} [options.brand.href='/']
 * @param {string} [options.brand.label]  The logo link's aria-label; defaults to "<name> home"
 * @param {Array<{label: string, href: string, current?: boolean}>} [options.items]
 * @param {string} [options.actions]  HTML slot rendered as the menu's trailing call-to-action item
 *   (typically renderButton-styled anchors); not escaped
 * @param {string} [options.navLabel='Primary']  The nav's aria-label; escaped text
 * @param {string} [options.id]     Defaults to nextId('site-header'); the menu id derives from it
 * @param {string} [options.attrs]  Raw attribute markup appended to the <header>; not escaped
 * @returns {string}
 */
export function renderSiteHeader(options = {}) {
  const {
    brand = {},
    items = [],
    actions = '',
    navLabel = 'Primary',
    id = nextId('site-header'),
    attrs = '',
  } = options;

  const menuId = `${id}-menu`;
  const brandName = brand.name ?? '';
  const brandLabel = brand.label ?? (brandName ? `${brandName} home` : 'Home');
  const cta = actions ? `<li data-bn="nav-cta">${actions}</li>` : '';

  return `<header data-bn="site-header" id="${escapeAttr(id)}"${attrsSuffix(attrs)}>
  <nav data-bn="site-nav" aria-label="${escapeAttr(navLabel)}">
    <a data-bn="nav-logo" href="${escapeAttr(brand.href ?? '/')}" aria-label="${escapeAttr(brandLabel)}">${brand.logo ?? ''}${brandName ? `<strong>${escapeText(brandName)}</strong>` : ''}</a>
    <button type="button" data-bn="nav-toggle" aria-expanded="false" aria-controls="${escapeAttr(menuId)}" aria-label="Toggle navigation">${MENU_ICON}</button>
    <ul id="${escapeAttr(menuId)}" data-bn="nav-menu">${navItemsHtml(items)}${cta}</ul>
  </nav>
</header>`;
}

/**
 * Wire a rendered site header's nav toggle: click toggles the menu
 * (data-open on the header root, aria-expanded on the button), Escape
 * closes it and returns focus to the toggle, and a click outside the
 * header closes it. Re-queries the toggle and menu on every interaction,
 * like the other initialisers, so re-rendered markup keeps working.
 *
 * @param {Element} root  The <header data-bn="site-header"> element (or an ancestor of it)
 * @param {object} [options]
 * @param {(open: boolean) => void} [options.onToggle]  Called after each open-state change
 * @returns {{ open: () => void, close: () => void, toggle: () => void, destroy: () => void }}
 */
export function initSiteHeader(root, options = {}) {
  const { onToggle } = options;
  const doc = root.ownerDocument ?? (typeof document === 'undefined' ? null : document);

  const toggleBtn = () => root.querySelector('[data-bn="nav-toggle"]');
  const isOpen = () => root.hasAttribute('data-open');

  function apply(open) {
    if (open) root.setAttribute('data-open', '');
    else root.removeAttribute('data-open');
    const btn = toggleBtn();
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (onToggle) onToggle(open);
  }

  function open() {
    if (!isOpen()) apply(true);
  }

  function close() {
    if (isOpen()) apply(false);
  }

  function toggle() {
    apply(!isOpen());
  }

  function onToggleClick() {
    toggle();
  }

  function onDocumentClick(event) {
    if (!isOpen()) return;
    const target = event.target;
    const inside =
      target === root || (typeof root.contains === 'function' && root.contains(target));
    if (!inside) close();
  }

  function onDocumentKeydown(event) {
    if (!isOpen() || event.key !== 'Escape') return;
    close();
    const btn = toggleBtn();
    if (btn && typeof btn.focus === 'function') btn.focus();
  }

  const btn = toggleBtn();
  if (btn) btn.addEventListener('click', onToggleClick);
  if (doc) {
    doc.addEventListener('click', onDocumentClick);
    doc.addEventListener('keydown', onDocumentKeydown);
  }

  return {
    open,
    close,
    toggle,
    destroy() {
      const current = toggleBtn();
      if (current) current.removeEventListener('click', onToggleClick);
      if (doc) {
        doc.removeEventListener('click', onDocumentClick);
        doc.removeEventListener('keydown', onDocumentKeydown);
      }
    },
  };
}

/**
 * App navigation: the primary nav for app-shaped surfaces, in the
 * pattern the iPhone Duo's app demos established — one nav whose
 * layout follows the size class it finds itself in.
 *
 * At phone class it is a fixed bottom bar: icon over label, brand and
 * actions put away, the destinations a thumb reaches. At the unfolded
 * class — the Duo spanning its fold, or any viewport at least the
 * inner display's short edge wide — the same element is a fixed side
 * rail: brand at the top, icon-and-label rows, the actions slot at the
 * foot, content scrolling beside it.
 *
 * The adaptation is CSS alone (components.css, "App Nav") — no second
 * markup variant: the DOM never changes when the class does, which is
 * what a fold is — the same page, mid-task, opened wider. Focus,
 * scroll position, aria-current and any state the page holds survive
 * it untouched because nothing re-renders.
 *
 * A phone-class bar holds a handful of destinations, never a cram:
 * pass `overflow` and every item past `overflow.after` (default 4)
 * leaves the bar and is reached through a More button and its sheet
 * instead — the iOS tab-bar pattern. The rail is under no such
 * pressure, so there the button and sheet are not displayed and the
 * list shows everything. The sheet is the one piece of behaviour in
 * the pattern: initAppNav wires its toggle. Without the option (or
 * with few enough items) the output is exactly the plain nav.
 *
 * The bar is fixed in both modes; the clearance contract lives with
 * the CSS: a page that renders the nav as a direct child of
 * [data-bn="page"] (or of body) gets its scroll clearance from the
 * same rules, sized by the same tokens.
 *
 * @param {object} [options]
 * @param {object} [options.brand]
 * @param {string} [options.brand.name]   Escaped text, rendered beside the logo in rail mode
 * @param {string} [options.brand.logo]   HTML slot (an SVG mark): not escaped; pass trusted markup only
 * @param {string} [options.brand.href='/']
 * @param {string} [options.brand.label]  The logo link's aria-label; defaults to "<name> home"
 * @param {Array<{label: string, href: string, icon?: string, current?: boolean}>} [options.items]
 *   icon is an HTML slot (an SVG glyph): not escaped; pass trusted markup only
 * @param {string} [options.actions]  HTML slot rendered after the items (the rail's foot;
 *   hidden at phone class); not escaped
 * @param {object} [options.overflow]  The phone-class More overflow; omitted = no overflow
 * @param {number} [options.overflow.after=4]  Items that stay in the bar; the rest go to the sheet
 * @param {string} [options.overflow.label='More']  The More button's label; escaped text
 * @param {string} [options.overflow.icon]  HTML slot for the More glyph; not escaped. Defaults
 *   to an ellipsis; pass '' for no glyph
 * @param {string} [options.label='Primary']  The nav's aria-label; escaped text
 * @param {string} [options.id]     Emitted as the <nav>'s id when present
 * @param {string} [options.attrs]  Raw attribute markup appended to the <nav>; not escaped
 * @returns {string}
 */
export function renderAppNav(options = {}) {
  const {
    brand = {},
    items = [],
    actions = '',
    label = 'Primary',
    id,
    attrs = '',
    overflow,
  } = options;

  const brandName = brand.name ?? '';
  const brandLabel = brand.label ?? (brandName ? `${brandName} home` : 'Home');
  const brandHtml =
    brandName || brand.logo
      ? `<a data-bn="app-nav-brand" href="${escapeAttr(brand.href ?? '/')}" aria-label="${escapeAttr(brandLabel)}">${brand.logo ?? ''}${brandName ? `<strong>${escapeText(brandName)}</strong>` : ''}</a>`
      : '';

  const itemHtml = (item) => {
    const current = item.current ? ' aria-current="page"' : '';
    const icon = item.icon ? `<span data-bn="app-nav-icon" aria-hidden="true">${item.icon}</span>` : '';
    return `<a href="${escapeAttr(item.href)}"${current}>${icon}<span data-bn="app-nav-label">${escapeText(item.label)}</span></a>`;
  };

  const after = overflow ? (overflow.after ?? 4) : items.length;
  const hasOverflow = overflow != null && items.length > after;

  const itemsHtml = items
    .map((item, index) => {
      const marker = hasOverflow && index >= after ? ' data-bn-overflow' : '';
      return `<li${marker}>${itemHtml(item)}</li>`;
    })
    .join('');

  const actionsHtml = actions ? `<div data-bn="app-nav-actions">${actions}</div>` : '';

  let overflowHtml = '';
  let moreCellHtml = '';
  if (hasOverflow) {
    const sheetId = id ? `${id}-sheet` : nextId('app-nav-sheet');
    const moreLabel = overflow.label ?? 'More';
    const moreIcon = overflow.icon ?? MORE_ICON;
    const moreIconHtml = moreIcon
      ? `<span data-bn="app-nav-icon" aria-hidden="true">${moreIcon}</span>`
      : '';
    const sheetItems = items
      .slice(after)
      .map((item) => `<li>${itemHtml(item)}</li>`)
      .join('');
    /* The More button is a cell of the bar, not an appendage to it: it
       renders inside the list, in a cell of its own, so the bar's cells
       are equal width and the edge insets are symmetric. As a bare flex
       child of the <nav> it sized to its content (45px against 85px
       cells) and shoved every destination off-centre. */
    moreCellHtml =
      `<li data-bn="app-nav-more-cell"><button type="button" data-bn="app-nav-more" aria-expanded="false" aria-haspopup="true" aria-controls="${escapeAttr(sheetId)}">${moreIconHtml}<span data-bn="app-nav-label">${escapeText(moreLabel)}</span></button></li>`;
    overflowHtml =
      `<div data-bn="app-nav-sheet" id="${escapeAttr(sheetId)}" hidden><ul data-bn="app-nav-sheet-list">${sheetItems}</ul></div>`;
  }

  const idAttr = id ? ` id="${escapeAttr(id)}"` : '';

  return `<nav data-bn="app-nav" aria-label="${escapeAttr(label)}"${idAttr}${attrsSuffix(attrs)}>${brandHtml}<ul data-bn="app-nav-list">${itemsHtml}${moreCellHtml}</ul>${actionsHtml}${overflowHtml}</nav>`;
}

/**
 * Wire a rendered app nav's More sheet: the button toggles it
 * (data-open on the nav root, aria-expanded on the button, the sheet's
 * hidden attribute lifted), Escape closes it and returns focus to the
 * button, and a click outside the nav closes it. A click on a sheet
 * link is left to the link — on a multi-page site it navigates, and a
 * routed shell can close through the returned handle or onToggle.
 *
 * It also keeps the bar clear of the on-screen keyboard: the bar is
 * fixed against the layout viewport while the keyboard shrinks the
 * visual one, so the covered strip is measured through visualViewport
 * and written to --size-app-nav-visual-inset on the nav root, which the
 * bar's and sheet's bottom offsets in components.css read.
 *
 * The nav's postures need no wiring at all (the fold is one media
 * query), so a nav rendered without `overflow` has nothing to wire and
 * this is a no-op handle over it.
 *
 * @param {Element} root  The <nav data-bn="app-nav"> element (or an ancestor of it)
 * @param {object} [options]
 * @param {(open: boolean) => void} [options.onToggle]  Called after each open-state change
 * @returns {{ open: () => void, close: () => void, toggle: () => void, destroy: () => void }}
 */
export function initAppNav(root, options = {}) {
  const { onToggle } = options;
  const doc = root.ownerDocument ?? (typeof document === 'undefined' ? null : document);

  /* Keyboard sync. The bar is position:fixed against the layout
     viewport, but a software keyboard shrinks the VISUAL viewport — on
     iOS the bar then floats mid-screen with its labels sliced by the
     keyboard. Track the visual viewport and keep the covered strip in
     --size-app-nav-visual-inset (read by the bar's and the sheet's bottom
     offsets in components.css), so the bar rides on top of the keyboard,
     whole. Pinch-zoom also shrinks the visual viewport without covering
     anything, so a scaled viewport reports no inset. Guarded to a no-op
     wherever there is no visualViewport or no style to write to (tests,
     SSR-adjacent hosts). */
  const view = doc?.defaultView ?? null;
  const vv = view?.visualViewport ?? null;
  let syncViewportInset = null;
  let onFocusIn = null;
  let onFocusOut = null;
  if (
    vv &&
    typeof vv.addEventListener === 'function' &&
    root.style &&
    typeof root.style.setProperty === 'function'
  ) {
    /* iOS reports the visual viewport in stages while the keyboard
       opens, and the form-assistant bar can join after the last resize
       event — a sync that trusts the final event of an opening can
       under-report the covered strip and leave the bar sliced for the
       whole episode. While a text-entry control holds focus the inset
       may therefore only grow: keep the largest measured value until
       the keyboard is fully gone (a measured inset of 0) or focus
       leaves text entry, and re-sync on focus itself — the earliest
       reliable keyboard signal — plus a beat later, once iOS has
       settled. */
    let heldInset = 0;
    const textEntryFocused = () => {
      const el = doc?.activeElement;
      if (!el || el === doc?.body) return false;
      if (el.isContentEditable) return true;
      if (el.tagName === 'TEXTAREA') return true;
      if (el.tagName !== 'INPUT') return false;
      const type = (el.getAttribute?.('type') ?? 'text').toLowerCase();
      return ![
        'checkbox',
        'radio',
        'button',
        'submit',
        'reset',
        'file',
        'hidden',
        'range',
        'color',
        'image',
      ].includes(type);
    };
    syncViewportInset = () => {
      const measured =
        vv.scale > 1.01
          ? 0
          : Math.max(0, Math.round(view.innerHeight - vv.height - vv.offsetTop));
      if (measured === 0) heldInset = 0;
      else if (textEntryFocused()) heldInset = Math.max(heldInset, measured);
      else heldInset = measured;
      root.style.setProperty('--size-app-nav-visual-inset', `${heldInset}px`);
    };
    vv.addEventListener('resize', syncViewportInset);
    vv.addEventListener('scroll', syncViewportInset);
    onFocusIn = () => {
      syncViewportInset();
      if (typeof view.requestAnimationFrame === 'function') {
        view.requestAnimationFrame(syncViewportInset);
      }
      if (typeof view.setTimeout === 'function') view.setTimeout(syncViewportInset, 350);
    };
    onFocusOut = () => {
      if (typeof view.setTimeout === 'function') view.setTimeout(syncViewportInset, 50);
    };
    if (typeof doc?.addEventListener === 'function') {
      doc.addEventListener('focusin', onFocusIn);
      doc.addEventListener('focusout', onFocusOut);
    }
    if (typeof view.addEventListener === 'function') {
      view.addEventListener('resize', syncViewportInset);
    }
    syncViewportInset();
  }

  const moreBtn = () => root.querySelector('[data-bn="app-nav-more"]');
  const sheet = () => root.querySelector('[data-bn="app-nav-sheet"]');
  const isOpen = () => root.hasAttribute('data-open');

  function apply(open) {
    if (open) root.setAttribute('data-open', '');
    else root.removeAttribute('data-open');
    const btn = moreBtn();
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    const panel = sheet();
    if (panel) {
      if (open) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    }
    if (onToggle) onToggle(open);
  }

  function open() {
    if (!isOpen()) apply(true);
  }

  function close() {
    if (isOpen()) apply(false);
  }

  function toggle() {
    apply(!isOpen());
  }

  function onMoreClick() {
    toggle();
  }

  function onDocumentClick(event) {
    if (!isOpen()) return;
    const target = event.target;
    const inside =
      target === root || (typeof root.contains === 'function' && root.contains(target));
    if (!inside) close();
  }

  function onDocumentKeydown(event) {
    if (!isOpen() || event.key !== 'Escape') return;
    close();
    const btn = moreBtn();
    if (btn && typeof btn.focus === 'function') btn.focus();
  }

  const btn = moreBtn();
  if (btn) btn.addEventListener('click', onMoreClick);
  if (doc) {
    doc.addEventListener('click', onDocumentClick);
    doc.addEventListener('keydown', onDocumentKeydown);
  }

  return {
    open,
    close,
    toggle,
    destroy() {
      const current = moreBtn();
      if (current) current.removeEventListener('click', onMoreClick);
      if (doc) {
        doc.removeEventListener('click', onDocumentClick);
        doc.removeEventListener('keydown', onDocumentKeydown);
      }
      if (vv && syncViewportInset && typeof vv.removeEventListener === 'function') {
        vv.removeEventListener('resize', syncViewportInset);
        vv.removeEventListener('scroll', syncViewportInset);
        if (typeof root.style.removeProperty === 'function') {
          root.style.removeProperty('--size-app-nav-visual-inset');
        }
      }
      if (syncViewportInset) {
        if (doc && typeof doc.removeEventListener === 'function') {
          if (onFocusIn) doc.removeEventListener('focusin', onFocusIn);
          if (onFocusOut) doc.removeEventListener('focusout', onFocusOut);
        }
        if (view && typeof view.removeEventListener === 'function') {
          view.removeEventListener('resize', syncViewportInset);
        }
      }
    },
  };
}

/**
 * Site footer: brand block, grouped link columns and a legal bar, in
 * the shape GreenPut's layout template established. Column headings
 * render as <h2> inside a labelled <nav>, so the footer's link groups
 * are navigable landmarks rather than anonymous lists.
 *
 * @param {object} [options]
 * @param {object} [options.brand]
 * @param {string} [options.brand.name]     Escaped text, rendered beside the logo
 * @param {string} [options.brand.logo]     HTML slot (an SVG mark): not escaped; pass trusted markup only
 * @param {string} [options.brand.tagline]  Escaped text under the brand
 * @param {Array<{heading: string, label?: string, links: Array<{label: string, href: string, external?: boolean}>}>} [options.columns]
 *   label is the column nav's aria-label; defaults to the heading
 * @param {object} [options.legal]
 * @param {string} [options.legal.text]   Escaped text (the copyright line)
 * @param {Array<{label: string, href: string, external?: boolean}>} [options.legal.links]
 * @param {string} [options.attrs]  Raw attribute markup appended to the <footer>; not escaped
 * @returns {string}
 */
export function renderSiteFooter(options = {}) {
  const { brand = {}, columns = [], legal, attrs = '' } = options;

  const linkHtml = (link) => {
    const rel = link.external ? ' rel="noopener noreferrer"' : '';
    return `<li><a href="${escapeAttr(link.href)}"${rel}>${escapeText(link.label)}</a></li>`;
  };

  const brandHtml =
    brand.name || brand.logo || brand.tagline
      ? `<div data-bn="footer-brand"><strong>${brand.logo ?? ''}${escapeText(brand.name ?? '')}</strong>${brand.tagline ? `<p>${escapeText(brand.tagline)}</p>` : ''}</div>`
      : '';

  const columnsHtml = columns
    .map(
      (column) => `<nav aria-label="${escapeAttr(column.label ?? column.heading)}">
          <h2>${escapeText(column.heading)}</h2>
          <ul>${column.links.map(linkHtml).join('')}</ul>
        </nav>`,
    )
    .join('');

  let legalHtml = '';
  if (legal) {
    const links = (legal.links ?? [])
      .map((link) => {
        const rel = link.external ? ' rel="noopener noreferrer"' : '';
        return `<a href="${escapeAttr(link.href)}"${rel}>${escapeText(link.label)}</a>`;
      })
      .join('');
    legalHtml = `<div data-bn="footer-bottom">
        <div data-bn="container">
          <p>${escapeText(legal.text ?? '')}</p>
          <nav aria-label="Legal" data-bn="footer-legal">${links}</nav>
        </div>
      </div>`;
  }

  return `<footer data-bn="site-footer"${attrsSuffix(attrs)}>
      <div data-bn="footer-inner">
        ${brandHtml}
        ${columnsHtml}
      </div>
      ${legalHtml}
    </footer>`;
}

/**
 * The minimal page shell: skip link, header slot, <main> and footer
 * slot — the skeleton every property's layout template repeats. The
 * slots are pre-rendered markup (typically renderSiteHeader /
 * renderSiteFooter output and the page body); the shell owns the skip
 * link and the main landmark's id so the two can never drift apart.
 *
 * @param {object} [options]
 * @param {string} [options.header]  HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.main]    HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.footer]  HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.skipText='Skip to main content']  Escaped text
 * @param {string} [options.mainId='main-content']  The <main> id the skip link targets
 * @param {string} [options.attrs]  Raw attribute markup appended to the <main>; not escaped
 * @returns {string}
 */
export function renderAppShell(options = {}) {
  const {
    header = '',
    main = '',
    footer = '',
    skipText = 'Skip to main content',
    mainId = 'main-content',
    attrs = '',
  } = options;

  return `<a data-bn="skip-link" href="#${escapeAttr(mainId)}">${escapeText(skipText)}</a>
${header}
<main id="${escapeAttr(mainId)}" data-bn="app-main"${attrsSuffix(attrs)}>${main}</main>
${footer}`;
}
