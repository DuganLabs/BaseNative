// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'site-footer';
export const root = 'footer';

/**
 * The site footer: the page's one contentinfo, holding grouped link
 * columns — each group a nav landmark with an optional heading — and
 * an optional closing note (rendered markup: a legal line, a version
 * stamp). One per page, like main; its variant is "default".
 *
 * @typedef {object} SiteFooterLink
 * @property {string} label Link text. Escaped.
 * @property {string} href Link URL.
 *
 * @typedef {object} SiteFooterGroup
 * @property {string} [label] Column heading; also the column nav's accessible name.
 * @property {string} [ariaLabel] Accessible name override for the column nav.
 * @property {SiteFooterLink[]} links
 *
 * @typedef {object} SiteFooterProps
 * @property {SiteFooterGroup[]} groups Link columns, in order.
 * @property {string} [noteHtml] Rendered closing note, after the columns.
 * @property {string} [variant] A registered variant name.
 */

/** @param {SiteFooterProps} props */
export function create(props) {
  if (!Array.isArray(props.groups) || props.groups.length === 0) {
    throw new TypeError('site-footer: groups is required');
  }

  const groups = signal(props.groups);
  const noteHtml = signal(props.noteHtml ?? '');
  const variant = signal(props.variant ?? 'default');

  /** @param {SiteFooterGroup} group */
  function groupLabel(group) {
    return group.ariaLabel ?? group.label ?? 'Footer';
  }

  return { groups, noteHtml, variant, groupLabel, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('site-footer', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const siteFooter = { name, root, create, registerVariants, template, styles };
export default siteFooter;
