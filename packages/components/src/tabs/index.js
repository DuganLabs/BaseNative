// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'tabs';
export const root = 'section';

/**
 * The tabs composite: a tab list over caller-rendered panels. The
 * composite owns the pattern's semantics — the tablist, each tab's
 * aria-selected and its aria-controls pairing with its panel, panels
 * hidden until their tab is selected — the selection state, and the
 * WAI-ARIA APG keyboard pattern: a roving tabindex (present in the
 * server HTML: 0 on the focused tab, -1 on the rest), ArrowLeft /
 * ArrowRight moving between enabled tabs and wrapping at the ends,
 * Home / End jumping to the first / last enabled tab. Activation is
 * automatic by default — moving focus also selects; with
 * `activation: 'manual'` the arrows only move focus and Enter / Space
 * (the button's native click) select. Changes report in the catalog's
 * one choice telemetry shape, mode "tabs". Panel content is rendered
 * by the caller, per tab.
 *
 * @typedef {object} TabItem
 * @property {string} value
 * @property {string} label
 * @property {string} panelHtml Rendered panel content.
 * @property {boolean} [disabled] A disabled tab cannot be selected and
 *   is skipped by the arrow keys.
 *
 * @typedef {object} TabsProps
 * @property {string} id Base for the tab and panel ids.
 * @property {string} label Accessible name for the tab list.
 * @property {string} [name] Carried on the select event.
 * @property {TabItem[]} tabs
 * @property {string} [value] The initially selected tab's value.
 * @property {'automatic' | 'manual'} [activation] APG activation mode.
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
  const activation = signal(props.activation ?? 'automatic');
  const firstEnabled = props.tabs.find((tab) => !tab.disabled);
  const selected = signal(
    props.tabs.some((tab) => tab.value === props.value && !tab.disabled)
      ? (props.value ?? '')
      : (firstEnabled?.value ?? props.tabs[0].value),
  );
  /* The roving tabindex target: the tab in the page's tab sequence.
     Tracks selection under automatic activation; under manual
     activation it tracks focus while selection lags until Enter/Space. */
  const focused = signal(selected());

  /** @param {TabItem} tab */
  function isSelected(tab) {
    return tab.value === selected();
  }

  /** @param {TabItem} tab */
  function selectedAttr(tab) {
    return isSelected(tab) ? 'true' : 'false';
  }

  /** @param {TabItem} tab */
  function tabIndex(tab) {
    return tab.value === focused() && !tab.disabled ? 0 : -1;
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
    if (tab.disabled) return;
    focused.set(tab.value);
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

  /**
   * APG keys on a tab: arrows move (wrapping, skipping disabled tabs),
   * Home / End jump to the ends. Focus moves in the DOM to the target
   * tab; under automatic activation the move also selects.
   * @param {KeyboardEvent} event
   * @param {TabItem} tab The tab the key was pressed on.
   */
  function onKeydown(event, tab) {
    const enabled = tabs().filter((t) => !t.disabled);
    const index = enabled.findIndex((t) => t.value === tab.value);
    if (index < 0) return;
    let next;
    switch (event.key) {
      case 'ArrowRight': next = enabled[(index + 1) % enabled.length]; break;
      case 'ArrowLeft': next = enabled[(index - 1 + enabled.length) % enabled.length]; break;
      case 'Home': next = enabled[0]; break;
      case 'End': next = enabled[enabled.length - 1]; break;
      default: return;
    }
    event.preventDefault();
    focused.set(next.value);
    if (activation() === 'automatic') select(next);
    const doc = (event.currentTarget ?? event.target)?.ownerDocument;
    doc?.getElementById(tabId(next))?.focus();
  }

  return {
    idBase, label, groupName, tabs, variant, activation, selected, focused,
    isSelected, selectedAttr, tabIndex, tabId, panelId, select, onKeydown, raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('tabs', 'tabs');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const tabs = { name, root, create, registerVariants, template, styles };
export default tabs;
