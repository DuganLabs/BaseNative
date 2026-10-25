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
  { label: 'Build', hrefs: ['/ai', '/playground', '/builder', '/showcase'] },
  { label: 'Project', hrefs: ['/roadmap', '/tasks'] },
  { label: 'System', hrefs: ['/design-system'] },
];

const toItem = (item) => ({
  label: item.label,
  href: item.href,
  current: item.current,
  iconHtml: item.icon,
});

/** The shell's two chrome pieces; page.js composes them via app-shell. */
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
    sidebarHtml: renderTrinity('sidebar', { label: 'Sections', sections }),
    appBarHtml: renderTrinity('app-bar', {
      id: 'site-tabs',
      label: 'Tabs',
      items: items.map(toItem),
      barLimit: 4,
    }),
  };
}

const FOOTER_GROUPS = [
  { label: 'Product', hrefs: ['/compare', '/components', '/playground', '/builder', '/showcase'] },
  { label: 'Reference', hrefs: ['/docs', '/ai', '/roadmap', '/tasks', '/design-system'] },
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
