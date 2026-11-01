// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'tree';
export const root = 'ul';

/**
 * The recursive list. A branch item carries its children as rendered
 * HTML — the caller renders the SAME component for the child list and
 * nests it, so recursion is composition, not a template trick. The
 * branch's toggle is a caller-rendered button; the list's delegated
 * click routes a click on it to this model's `toggle` (a click
 * anywhere else on the item selects it). aria-expanded lives on the
 * treeitem and the children group hides while the branch is
 * collapsed.
 *
 * The WAI-ARIA APG tree keyboard pattern lives in the view model,
 * ported from the legacy initTree: a roving tabindex over the items
 * (present in the server HTML, following focus as it moves), 
 * ArrowDown / ArrowUp move between this list's items, Home / End to
 * its ends; ArrowRight expands a collapsed branch or moves into an
 * expanded branch's first child; ArrowLeft collapses an expanded
 * branch or moves to the parent item; Enter / Space select (unless
 * the key landed on the toggle button, whose native click toggles).
 * Focus crossing into a nested child tree syncs that tree's roving
 * through its focusin, so the whole composed tree keeps one tab stop
 * per list. `expand` / `collapse` / `select` reflect state silently.
 *
 * @typedef {object} TreeItem
 * @property {string} [id] Node identity (defaults to the label).
 * @property {string} label
 * @property {boolean} [expanded]
 * @property {string} [toggleHtml] The rendered expand/collapse button. It
 *   carries the branch's name — when present it replaces the label text,
 *   so the branch reads as one control, not a button plus a duplicate label.
 * @property {string} [childrenHtml] A rendered child tree (branch items only).
 *
 * @typedef {object} TreeProps
 * @property {TreeItem[]} items
 * @property {string} [selectedId] The initially selected node's id.
 * @property {(id: string, expanded: boolean) => void} [onToggle]
 * @property {(id: string) => void} [onSelect]
 * @property {string} [variant] A registered variant name.
 */

/** @param {TreeProps} props */
export function create(props) {
  if (!Array.isArray(props.items)) throw new TypeError('tree: items is required');

  const items = signal(props.items);
  const variant = signal(props.variant ?? 'tree');
  const role = computed(() => variant());

  /** @param {TreeItem} item */
  const idOf = (item) => item.id ?? item.label;
  const selectedId = signal(props.selectedId ?? null);
  const focusedId = signal(props.selectedId ?? (props.items[0] ? idOf(props.items[0]) : null));

  /** @param {TreeItem} item */
  const expandedState = (item) => (item.expanded ? 'true' : 'false');
  /** @param {TreeItem} item */
  const selectedAttr = (item) => (selectedId() === idOf(item) ? 'true' : 'false');
  /** @param {TreeItem} item */
  const tabIndex = (item) => (focusedId() === idOf(item) ? 0 : -1);
  /** @param {TreeItem} item */
  const isExpanded = (item) => Boolean(item.childrenHtml && item.expanded);

  /** @param {TreeItem} item @param {boolean} expanded */
  function setExpanded(item, expanded) {
    if (!item.childrenHtml || Boolean(item.expanded) === expanded) return false;
    items.set(items().map((entry) => (idOf(entry) === idOf(item) ? { ...entry, expanded } : entry)));
    props.onToggle?.(idOf(item), expanded);
    return true;
  }

  /** @param {TreeItem} item */
  function toggle(item) {
    setExpanded(item, !item.expanded);
  }

  /** @param {TreeItem} item */
  function select(item) {
    selectedId.set(idOf(item));
    focusedId.set(idOf(item));
    props.onSelect?.(idOf(item));
  }

  /** Silent reflectors: move state without reporting. */
  const expand = (/** @type {string} */ id) => {
    const item = items().find((entry) => idOf(entry) === id);
    if (!item || !item.childrenHtml || item.expanded) return false;
    items.set(items().map((entry) => (idOf(entry) === id ? { ...entry, expanded: true } : entry)));
    return true;
  };
  const collapse = (/** @type {string} */ id) => {
    const item = items().find((entry) => idOf(entry) === id);
    if (!item || !item.childrenHtml || !item.expanded) return false;
    items.set(items().map((entry) => (idOf(entry) === id ? { ...entry, expanded: false } : entry)));
    return true;
  };
  const selectById = (/** @type {string} */ id) => {
    const item = items().find((entry) => idOf(entry) === id);
    if (!item) return false;
    selectedId.set(id);
    focusedId.set(id);
    return true;
  };
  const selected = () => selectedId();

  /**
   * The treeitem that owns an event, when it belongs to THIS list
   * (its parent list is the handler's element) — nested child trees
   * run their own handlers.
   * @param {Event} event
   */
  function ownItem(event) {
    const target = (event.target);
    const item = target?.closest?.('[role="treeitem"]');
    if (!item || item.parentElement !== (event.currentTarget ?? null)) return null;
    return item;
  }

  /* The rendered <li> children of the list correspond 1:1 with the
     model's items, so a DOM item's model is its index among siblings. */
  /** @param {Event} event */
  function modelFromEvent(event) {
    const item = ownItem(event);
    if (!item) return null;
    const index = [...item.parentElement.children].indexOf(item);
    return items()[index] ?? null;
  }

  /** @param {FocusEvent} event */
  function onFocusin(event) {
    const model = modelFromEvent(event);
    if (model) focusedId.set(idOf(model));
  }

  /**
   * Toggling re-renders the item, which replaces its element — and
   * a replaced element takes the focus with it. Restore focus to
   * the item at the same position in the same list (to its toggle
   * button when the toggle was the control used), so a keyboard or
   * switch user stays on the branch they just flipped.
   * @param {Event} event
   * @param {number} index
   * @param {boolean} toButton
   */
  function refocusItem(event, index, toButton) {
    const list = (event.currentTarget);
    const li = list?.children?.[index];
    if (!li) return;
    (toButton ? li.querySelector?.('button') ?? li : li).focus?.();
  }

  /** @param {MouseEvent} event */
  function onClick(event) {
    const item = ownItem(event);
    const model = modelFromEvent(event);
    if (!model || !item) return;
    /* The branch's toggle button is the branch's own control — it
       replaces the label in the render — so a click on it, or on the
       branch's disclosure chevron, toggles the branch; a click
       anywhere else on the item selects it. */
    const target = /** @type {Element | null} */ (event.target);
    const chevron = target?.closest?.('svg');
    if (target?.closest?.('button') || (chevron && chevron.parentElement === item)) {
      if (model.childrenHtml) {
        const index = [...item.parentElement.children].indexOf(item);
        toggle(model);
        refocusItem(event, index, true);
      }
      return;
    }
    select(model);
  }

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    const item = ownItem(event);
    if (!item) return;
    const list = items();
    const index = [...item.parentElement.children].indexOf(item);
    const model = list[index];
    if (!model) return;
    let focusEl = null;
    switch (event.key) {
      case 'ArrowDown': focusEl = item.nextElementSibling; break;
      case 'ArrowUp': focusEl = item.previousElementSibling; break;
      case 'Home': focusEl = item.parentElement.firstElementChild; break;
      case 'End': focusEl = item.parentElement.lastElementChild; break;
      case 'ArrowRight':
        if (model.childrenHtml && !model.expanded) {
          toggle(model);
          refocusItem(event, index, false);
          return;
        }
        if (isExpanded(model)) focusEl = item.querySelector('[role="group"] [role="treeitem"]');
        break;
      case 'ArrowLeft':
        if (isExpanded(model)) {
          toggle(model);
          refocusItem(event, index, false);
          return;
        }
        focusEl = item.closest('[role="group"]')?.parentElement?.closest?.('[role="treeitem"]') ?? null;
        break;
      case 'Enter':
      case ' ':
        if ((event.target)?.closest?.('button')) return;
        event.preventDefault();
        select(model);
        return;
      default: return;
    }
    if (focusEl) {
      event.preventDefault();
      focusEl.focus();
    }
  }

  return {
    items, variant, role, expandedState, selectedAttr, tabIndex, isExpanded,
    toggle, select, expand, collapse, selectById, selected, onFocusin, onClick, onKeydown, raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('tree', 'tree');
  registry.registerVariant('tree', 'treegrid');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const tree = { name, root, create, registerVariants, template, styles };
export default tree;
