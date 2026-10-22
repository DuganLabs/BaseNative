/**
 * Site chrome. One file: the active page, the grouping, and the markup.
 * Menu bar, sidebar, and tab bar are the platform controls. The phone
 * bar keeps the first four destinations; the rest sit in its More
 * disclosure so every route stays in the document.
 */
import { renderBnMenubar, renderBnSidebar, renderBnTabBar } from '../../packages/platform/src/components.js';
import { getAppNavItems } from './site-data.js';

const GROUPS = [
  { label: 'Start', hrefs: ['/', '/compare', '/components', '/docs'] },
  { label: 'Build', hrefs: ['/ai', '/playground', '/builder', '/showcase'] },
  { label: 'Project', hrefs: ['/roadmap', '/tasks'] },
];

export function renderSiteChrome(activePage = '') {
  const items = getAppNavItems(activePage);
  const sections = GROUPS.map((group) => ({
    label: group.label,
    items: group.hrefs.map((href) => items.find((item) => item.href === href)).filter(Boolean),
  }));
  return [
    renderBnMenubar({
      id: 'site-menu',
      app: { label: 'BaseNative', href: '/' },
      items: [{ label: 'GitHub', href: 'https://github.com/DuganLabs/BaseNative' }],
    }),
    renderBnSidebar({ id: 'site-nav', label: 'Sections', sections }),
    renderBnTabBar({
      id: 'site-tabs',
      label: 'Tabs',
      tabs: items,
      barLimit: 4,
    }),
  ].join('');
}
