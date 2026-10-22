/**
 * Site chrome. One file: the active page, the grouping, and the markup.
 * Desktop is the sidebar. The phone bar keeps the first four destinations;
 * the rest sit behind a More tab that matches the others, so every route
 * stays in the document. A two-word menu bar is not a macOS toolbar, so
 * the window has none.
 */
import { renderBnSidebar, renderBnTabBar } from '../../packages/platform/src/components.js';
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
