/**
 * Site chrome. One file: the active page, the grouping, and the markup.
 * Desktop is the sidebar. The phone bar keeps the first four destinations;
 * the rest sit behind a More tab that matches the others, so every route
 * stays in the document. A two-word menu bar is not a macOS toolbar, so
 * the window has none.
 */
import {
  renderBnFooter,
  renderBnSidebar,
  renderBnTabBar,
} from '../../packages/platform/src/components.js';
import { getAppNavItems } from './site-data.js';

const GROUPS = [
  { label: 'Start', hrefs: ['/', '/compare', '/components', '/docs'] },
  { label: 'Build', hrefs: ['/ai', '/playground', '/builder', '/showcase'] },
  { label: 'Project', hrefs: ['/roadmap', '/tasks'] },
  { label: 'System', hrefs: ['/design-system'] },
];

export function renderSiteChrome(activePage = '') {
  const items = getAppNavItems(activePage);
  const sections = GROUPS.map((group) => ({
    label: group.label,
    items: group.hrefs.map((href) => items.find((item) => item.href === href)).filter(Boolean),
  }));
  return [
    renderBnSidebar({ id: 'site-nav', label: 'Sections', sections }),
    renderBnTabBar({
      id: 'site-tabs',
      label: 'Tabs',
      tabs: items,
      barLimit: 4,
    }),
  ].join('');
}

const FOOTER_GROUPS = [
  { label: 'Product', hrefs: ['/compare', '/components', '/playground', '/builder', '/showcase'] },
  { label: 'Reference', hrefs: ['/docs', '/ai', '/roadmap', '/tasks', '/design-system'] },
];

/**
 * The site footer, rendered from the same nav model as the sidebar and
 * tab bar through the catalog's footer component — every route in the
 * model appears exactly once, so the footer can no longer drift out of
 * sync with the nav (it previously omitted five routes and carried a
 * differently-cased GitHub URL). The GitHub link is the one entry the
 * nav model does not own.
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
  return renderBnFooter({ siteFooter: true, groups });
}
