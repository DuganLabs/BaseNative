// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'app-shell';
export const root = 'main';

/**
 * The app shell: the page frame, composed — not drawn. It takes the
 * rendered sidebar, the rendered app bar and the page content, and
 * places them around the document's one main landmark: the sidebar
 * is the rail on wide viewports, the app bar is the bottom bar on
 * narrow ones, and this composite's sheet owns only the frame —
 * the rail's fixed position, the main's offset and padding, and
 * which chrome shows at which width. One shell per page, like main;
 * its variant is "default".
 *
 * @typedef {object} AppShellProps
 * @property {string} sidebarHtml Rendered sidebar (the catalog's sidebar).
 * @property {string} appBarHtml Rendered app bar (the catalog's app-bar).
 * @property {string} contentHtml Rendered page content, placed inside main.
 * @property {string} [headerHtml] Rendered phone masthead (a header),
 *   shown above main where the rail is hidden. The rail carries its own.
 * @property {string} [mainId] The main landmark's id — the skip link's target.
 * @property {string} [variant] A registered variant name.
 */

/** @param {AppShellProps} props */
export function create(props) {
  if (!props.sidebarHtml) throw new TypeError('app-shell: sidebarHtml is required — render the sidebar into it');
  if (!props.appBarHtml) throw new TypeError('app-shell: appBarHtml is required — render the app bar into it');
  if (!props.contentHtml) throw new TypeError('app-shell: contentHtml is required');

  const sidebarHtml = signal(props.sidebarHtml);
  const appBarHtml = signal(props.appBarHtml);
  const contentHtml = signal(props.contentHtml);
  const variant = signal(props.variant ?? 'default');
  const mainId = signal(props.mainId ?? false);

  const headerHtml = signal(props.headerHtml ?? '');

  return { sidebarHtml, appBarHtml, contentHtml, variant, mainId, headerHtml, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('app-shell', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const appShell = { name, root, create, registerVariants, template, styles };
export default appShell;
