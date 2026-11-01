/**
 * Site chrome. One file: the active page, the grouping, and the markup —
 * all of it rendered by the Holy Trinity catalog (@basenative/components):
 * the sidebar and the app bar are the same destinations in desktop and
 * phone form, and page.js composes them around the content through the
 * app-shell. The phone bar keeps the first four destinations; the rest
 * sit behind its More menu, so every route stays reachable.
 */
import { renderTrinity } from './trinity.js';
import { getAppNavItems } from './site-data.js';

const GROUPS = [
  { label: 'Start', hrefs: ['/', '/compare', '/components', '/docs'] },
  { label: 'Build', hrefs: ['/ai', '/playground', '/builder'] },
];

const toItem = (item) => ({
  label: item.label,
  href: item.href,
  current: item.current,
  iconHtml: item.icon,
});

/** The shell's two chrome pieces; page.js composes them via app-shell. */
export const REPO_URL = 'https://github.com/DuganLabs/BaseNative';

const BRAND_MARK =
  '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">' +
  '<rect width="32" height="32" rx="7" fill="#0C0B09"/>' +
  '<path d="M16 6 24.5 21H7.5Z" fill="#E8920A"/>' +
  '<path d="M9.5 23 13 17l3.5 6Z" fill="#F4B547"/>' +
  '<path d="M15.5 23 19 17l3.5 6Z" fill="#F4B547"/>' +
  '</svg>';

const GITHUB_MARK =
  '<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false" fill="currentColor">' +
  '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>' +
  '</svg>';

/**
 * The masthead: the brand (home) link and the GitHub link. The rail
 * carries it on desktop and the app shell's phone top bar carries it
 * where the rail is hidden.
 */
export function renderMasthead() {
  return (
    '<header>' +
    `<a href="/" rel="home">${BRAND_MARK}BaseNative</a>` +
    `<a href="${REPO_URL}" aria-label="BaseNative on GitHub">${GITHUB_MARK}</a>` +
    '</header>'
  );
}

export function renderSiteChrome(activePage = '') {
  const items = getAppNavItems(activePage);
  const sections = GROUPS.map((group) => ({
    label: group.label,
    items: group.hrefs
      .map((href) => items.find((item) => item.href === href))
      .filter(Boolean)
      .map(toItem),
  }));
  return {
    headerHtml: renderMasthead(),
    sidebarHtml: renderTrinity('sidebar', { label: 'Sections', sections, headerHtml: renderMasthead() }),
    appBarHtml: renderTrinity('app-bar', {
      id: 'site-tabs',
      label: 'Tabs',
      items: items.map(toItem),
      barLimit: 4,
    }),
  };
}

const FOOTER_GROUPS = [
  { label: 'Product', hrefs: ['/compare', '/components', '/playground', '/builder'] },
  { label: 'Reference', hrefs: ['/docs', '/ai'] },
];

/**
 * The site footer, rendered from the same nav model as the sidebar and
 * app bar through the catalog's site-footer — every route in the model
 * appears exactly once, so the footer can no longer drift out of sync
 * with the nav. The GitHub link is the one entry the nav model does
 * not own.
 */
export function renderSiteFooter() {
  const items = getAppNavItems();
  const byHref = (href) => items.find((item) => item.href === href);
  const groups = [
    {
      label: 'BaseNative',
      // The catalog's own demo footers use "BaseNative" as their nav
      // name; the site footer's first landmark keeps the accessible
      // name the hand-written footer used, so the two never collide
      // (axe landmark-unique) on pages that embed the catalog.
      ariaLabel: 'Project',
      links: [
        byHref('/'),
        { label: 'GitHub', href: 'https://github.com/DuganLabs/BaseNative' },
      ].filter(Boolean),
    },
    ...FOOTER_GROUPS.map((group) => ({
      label: group.label,
      links: group.hrefs.map(byHref).filter(Boolean),
    })),
  ];
  return renderTrinity('site-footer', { groups });
}
