// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'sidebar';
export const root = 'aside';

/**
 * The sidebar: a complementary landmark holding one nav of grouped
 * destinations. Sections carry an optional heading; the current
 * destination is the link with aria-current="page", which is also the
 * sheet's hook for the selected treatment. Item icons are
 * caller-rendered markup (an inline SVG) — the sidebar owns the row
 * layout, not an icon set. The app-shell composite positions the
 * sidebar as the page rail; standalone it is a grouped nav panel.
 *
 * @typedef {object} SidebarItem
 * @property {string} label Destination name. Escaped.
 * @property {string} [href] Destination URL. Absent for a button item.
 * @property {string} [value] Button value, used by filter chips.
 * @property {boolean | string} [pressed] aria-pressed for a button item.
 * @property {boolean} [current] True for the page being viewed.
 * @property {string} [iconHtml] Rendered icon markup, placed before the label.
 *
 * @typedef {object} SidebarSection
 * @property {string} [label] Group heading. Escaped.
 * @property {SidebarItem[]} items
 *
 * @typedef {object} SidebarProps
 * @property {SidebarSection[]} sections Grouped destinations, in order.
 * @property {string} [label] Accessible name for the nav landmark. Default "Sidebar".
 * @property {string} [variant] A registered variant name.
 */

/** @param {SidebarProps} props */
export function create(props) {
  if (!Array.isArray(props.sections) || props.sections.length === 0) {
    throw new TypeError('sidebar: sections is required');
  }

  const sections = signal(
    props.sections.map((section) => ({
      label: section.label ?? '',
      items: (section.items ?? []).map((item) => ({
        ...item,
        href: item.href ?? '',
        value: item.value ?? '',
        iconHtml: item.iconHtml ?? '',
        isLink: Boolean(item.href),
        pressed: item.pressed === true || item.pressed === 'true' ? 'true' : 'false',
        ariaCurrent: item.current ? 'page' : false,
      })),
    })),
  );
  const label = signal(props.label ?? 'Sidebar');
  const variant = signal(props.variant ?? 'sidebar');
  // An aside inside main is not a top-level complementary landmark.
  // The in-page subnav is a labeled region; the rail stays complementary.
  const landmark = signal(props.variant === 'subnav' ? 'region' : 'complementary');

  return { sections, label, variant, landmark, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('sidebar', 'sidebar');
  registry.registerVariant('sidebar', 'subnav');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const sidebar = { name, root, create, registerVariants, template, styles };
export default sidebar;
