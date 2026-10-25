// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'tabs';
export const root = 'section';

/**
 * The tabs composite: a tab list over caller-rendered panels. The
 * composite owns the pattern's semantics — the tablist, each tab's
 * aria-selected and its aria-controls pairing with its panel, panels
 * hidden until their tab is selected — and the selection state, and
 * reports changes in the catalog's one choice telemetry shape, mode
 * "tabs". Panel content is rendered by the caller, per tab.
 *
 * @typedef {object} TabItem
 * @property {string} value
 * @property {string} label
 * @property {string} panelHtml Rendered panel content.
 *
 * @typedef {object} TabsProps
 * @property {string} id Base for the tab and panel ids.
 * @property {string} label Accessible name for the tab list.
 * @property {string} [name] Carried on the select event.
 * @property {TabItem[]} tabs
 * @property {string} [value] The initially selected tab's value.
 * @property {(change: { name: string, mode: string, values: string[], changed: string, selected: boolean }) => void} [onSelect]
 * @property {string} [variant] A registered variant name.
 */

/** @param {TabsProps} props */
export function create(props) {
  if (!props.id) throw new TypeError('tabs: id is required — it bases the tab and panel ids');
  if (!props.label) throw new TypeError('tabs: label is required');
  if (!Array.isArray(props.tabs) || props.tabs.length === 0) {
    throw new TypeError('tabs: tabs must be a non-empty array');
  }
  for (const tab of props.tabs) {
    if (!tab.panelHtml) throw new TypeError('tabs: every tab needs panelHtml — render its panel');
  }

  const idBase = signal(props.id);
  const label = signal(props.label);
  const groupName = signal(props.name ?? '');
  const tabs = signal(props.tabs);
  const variant = signal(props.variant ?? 'tabs');
  const selected = signal(props.value ?? props.tabs[0].value);

  /** @param {TabItem} tab */
  function isSelected(tab) {
    return tab.value === selected();
  }

  /** @param {TabItem} tab */
  function selectedAttr(tab) {
    return isSelected(tab) ? 'true' : 'false';
  }

  /** @param {TabItem} tab */
  function tabId(tab) {
    return idBase() + '-tab-' + tab.value;
  }

  /** @param {TabItem} tab */
  function panelId(tab) {
    return idBase() + '-panel-' + tab.value;
  }

  /** @param {TabItem} tab */
  function select(tab) {
    if (tab.value === selected()) return;
    selected.set(tab.value);
    props.onSelect?.({
      name: groupName(),
      mode: 'tabs',
      values: [tab.value],
      changed: tab.value,
      selected: true,
    });
  }

  return { idBase, label, groupName, tabs, variant, selected, isSelected, selectedAttr, tabId, panelId, select, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('tabs', 'tabs');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const tabs = { name, root, create, registerVariants, template, styles };
export default tabs;
