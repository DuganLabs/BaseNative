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
 * treeitem, and the child list (created `nested`, so it is the
 * branch's role="group" itself) hides while the branch is collapsed.
 *
 * The WAI-ARIA APG tree keyboard pattern lives in the view model,
 * ported from the legacy initTree: a roving tabindex over the items
 * (present in the server HTML, following focus as it moves), 
 * ArrowDown / ArrowUp move between this list's items, Home / End to
 * its ends; ArrowRight expands a collapsed branch or moves into an
 * expanded branch's first child; ArrowLeft collapses an expanded
 * branch or moves to the parent item; Enter / Space select (unless
 * the key landed on the toggle button, whose native click toggles).
 * A nested child list is rendered HTML, so the root list answers for
 * its items too: the same keys move through them, Enter / Space and a
 * click select them, and the roving tabindex follows focus into them,
 * so the whole composed tree keeps one tab stop. A nested list that is
 * itself hydrated answers first (preventDefault) and the root stands by. `expand` / `collapse` / `select` reflect state silently.
 *
 * @typedef {object} TreeItem
 * @property {string} [id] Node identity (defaults to the label).
 * @property {string} label
 * @property {boolean} [expanded]
 * @property {string} [toggleHtml] The rendered expand/collapse button. It
 *   carries the branch's name — when present it replaces the label text,
 *   so the branch reads as one control, not a button plus a duplicate label.
 * @property {string} [childrenHtml] A rendered child tree (branch items only),
 *   created with `nested: true` so its list is the branch's role="group".
 *
 * @typedef {object} TreeProps
 * @property {TreeItem[]} items
 * @property {string} [selectedId] The initially selected node's id.
 * @property {(id: string, expanded: boolean) => void} [onToggle]
 * @property {(id: string) => void} [onSelect]
 * @property {string} [variant] A registered variant name.
 * @property {boolean} [nested] This list is a branch's children: it renders
 *   as the branch's role="group" (a list nested straight in its treeitem),
 *   not as a second tree. A collapsed branch hides it.
 */

/** @param {TreeProps} props */
export function create(props) {
  if (!Array.isArray(props.items)) throw new TypeError('tree: items is required');

  const items = signal(props.items);
  const variant = signal(props.variant ?? 'tree');
  const role = computed(() => (props.nested ? 'group' : variant()));

  /** @param {TreeItem} item */
  const idOf = (item) => item.id ?? item.label;
  const selectedId = signal(props.selectedId ?? null);
  /* One tab stop for the whole composed tree: the root list starts on
     its first item, a nested list on none until focus enters it. */
  const firstId = props.nested ? null : props.items[0] ? idOf(props.items[0]) : null;
  const focusedId = signal(props.selectedId ?? firstId);

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
    const list = /** @type {Element | null} */ (event.currentTarget);
    const nested = model ? null : innerItem(event);
    if (!model && !nested) return;
    /* The tree keeps one tab stop: the focused item. A nested list's
       items are its rendered HTML, so their roving tabindex moves here. */
    for (const other of list?.querySelectorAll?.('[role="group"] [role="treeitem"]') ?? []) {
      other.setAttribute('tabindex', other === nested ? '0' : '-1');
    }
    focusedId.set(model ? idOf(model) : null);
  }

  /**
   * A treeitem of a nested child list (rendered HTML inside one of this
   * list's branches) that no nested handler has already answered.
   * @param {Event} event
   */
  function innerItem(event) {
    if (event.defaultPrevented) return null;
    const item = (event.target)?.closest?.('[role="treeitem"]');
    const list = /** @type {Element | null} */ (event.currentTarget);
    if (!item || item.parentElement === list || !list?.contains?.(item)) return null;
    return item;
  }

  /**
   * Select a nested item: its list is rendered HTML, so selection moves
   * on its attributes, and this list's own selection clears.
   * @param {Element} item
   * @param {Event} event
   */
  function selectInner(item, event) {
    markInner(event, item);
    selectedId.set(null);
    focusedId.set(null);
    props.onSelect?.(item.getAttribute('id') ?? item.textContent.trim());
  }

  /**
   * Mark which nested item is selected (none when this list's own is).
   * @param {Event} event
   * @param {Element | null} item
   */
  function markInner(event, item) {
    const list = /** @type {Element | null} */ (event.currentTarget);
    for (const other of list?.querySelectorAll?.('[role="group"] [role="treeitem"]') ?? []) {
      other.setAttribute('aria-selected', other === item ? 'true' : 'false');
    }
  }

  /**
   * The APG keys on a nested item, moved by the DOM.
   * @param {KeyboardEvent} event
   * @param {Element} item
   */
  function innerKeydown(event, item) {
    const siblings = item.parentElement;
    /** @type {Element | null} */
    let focusEl = null;
    switch (event.key) {
      case 'ArrowDown': focusEl = item.nextElementSibling; break;
      case 'ArrowUp': focusEl = item.previousElementSibling; break;
      case 'Home': focusEl = siblings.firstElementChild; break;
      case 'End': focusEl = siblings.lastElementChild; break;
      case 'ArrowRight':
        if (item.getAttribute('aria-expanded') === 'true') focusEl = item.querySelector('[role="group"] [role="treeitem"]');
        break;
      case 'ArrowLeft': focusEl = siblings.closest('[role="treeitem"]'); break;
      case 'Enter':
      case ' ':
        if ((event.target)?.closest?.('button')) return;
        event.preventDefault();
        selectInner(item, event);
        return;
      default: return;
    }
    if (focusEl) {
      event.preventDefault();
      /** @type {HTMLElement} */ (focusEl).focus();
    }
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
    if (!model || !item) {
      const inner = innerItem(event);
      if (inner && !(event.target)?.closest?.('button')) selectInner(inner, event);
      return;
    }
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
    markInner(event, null);
    select(model);
  }

  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    const item = ownItem(event);
    if (!item) {
      const inner = innerItem(event);
      if (inner) innerKeydown(event, inner);
      return;
    }
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
        markInner(event, null);
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
