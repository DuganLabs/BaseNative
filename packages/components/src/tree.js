/**
 * Tree view — expandable hierarchical tree.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';
import { ariaExpanded, renderNodes, rovingTabIndex } from './internal/tree.js';

/**
 * Tree view — expandable hierarchical tree.
 *
 * Node labels are escaped text; a node's `icon` is an HTML slot: not escaped;
 * pass trusted markup only. Leaf nodes carry no aria-expanded attribute.
 *
 * Every node with children renders its `<ul data-bn="tree-children">` group;
 * a collapsed node's group is `hidden`, so expanding on the client is an
 * attribute flip rather than a round trip.
 *
 * Keyboard reachability: the tree ships a static roving `tabindex` — the
 * first item (in document order) gets `tabindex="0"`, every other item gets
 * `tabindex="-1"`, so Tab reaches the tree. Pair with `initTree()` on the
 * client, which wires the toggle buttons, selection, and the APG tree keys
 * that move that `tabindex` between items; without it the tree is a static
 * outline that Tab can reach but the arrow keys cannot walk.
 *
 * @param {object} [options]
 * @param {Array<{id?: string, label: string, icon?: string, children?: Array<object>}>} [options.items]
 * @param {Set<string>} [options.expanded]  Node ids whose children are shown; other groups render `hidden`
 * @param {string} [options.selected]       Selected node id
 * @param {string} [options.id]             Defaults to nextId('tree')
 * @param {string} [options.attrs]          Raw attribute markup appended to the <ul>; not escaped
 * @returns {string}
 */
export function renderTree(options = {}) {
  const {
    items = [],
    expanded = new Set(),
    selected,
    id = nextId('tree'),
    attrs = '',
  } = options;

  const itemsHtml = renderNodes(items, {
    getId: node => node.id ?? node.label,
    expanded,
    renderCollapsed: true,
    render({ node, nodeId, hasChildren, isExpanded, level, children, index }) {
      const isSelected = selected === nodeId;
      const icon = node.icon ?? '';
      const tabIndex = rovingTabIndex(level, index);

      // The roving tabindex belongs on the element that carries role="treeitem",
      // not on a presentational wrapper inside it. It used to sit on the <div>,
      // which made a bare <div> the focus target of a tree — axe flags it
      // (focus-order-semantics) and a screen reader lands on something with no
      // role while the treeitem it describes is never focused.
      let html = `<li data-bn="tree-item" role="treeitem" tabindex="${tabIndex}"${ariaExpanded(hasChildren, isExpanded)} aria-selected="${isSelected}" data-node-id="${escapeAttr(nodeId)}" data-level="${level}">`;
      html += `<div data-bn="tree-item-content"${isSelected ? ' data-selected' : ''}>`;
      if (hasChildren) {
        html += `<button data-bn="tree-toggle" aria-label="${isExpanded ? 'Collapse' : 'Expand'}" type="button">${isExpanded ? '▾' : '▸'}</button>`;
      } else {
        html += `<span data-bn="tree-indent"></span>`;
      }
      if (icon) html += `<span data-bn="tree-icon">${icon}</span>`;
      html += `<span data-bn="tree-label">${escapeText(node.label ?? '')}</span>`;
      html += `</div>`;

      if (hasChildren) {
        html += `<ul data-bn="tree-children" role="group"${isExpanded ? '' : ' hidden'}>${children}</ul>`;
      }

      html += `</li>`;
      return html;
    },
  });

  return `<ul data-bn="tree" id="${escapeAttr(id)}" role="tree"${attrsSuffix(attrs)}>${itemsHtml}</ul>`;
}

/**
 * TreeGrid — tree structure combined with table columns.
 *
 * Column labels and cell values are escaped text. Leaf rows carry no
 * aria-expanded attribute.
 *
 * Keyboard reachability: like Tree, rows carry a static roving `tabindex`
 * (first row `0`, the rest `-1`), but unlike Tree there is no client-side
 * `initTreeGrid()` to move it, and collapsed rows are not rendered at all —
 * a caller that wants arrow-key roving or client-side expand must add its
 * own keydown handler and re-render with an updated `expanded` set.
 *
 * @param {object} [options]
 * @param {Array<{key: string, label: string}>} [options.columns]
 * @param {Array<object>} [options.items]   Rows keyed by column key, with optional `id` and `children`
 * @param {Set<string>} [options.expanded]  Node ids that are expanded
 * @param {string} [options.id]             Defaults to nextId('treegrid')
 * @param {string} [options.attrs]          Raw attribute markup appended to the <table>; not escaped
 * @returns {string}
 */
export function renderTreeGrid(options = {}) {
  const {
    columns = [],
    items = [],
    expanded = new Set(),
    id = nextId('treegrid'),
    attrs = '',
  } = options;

  const headerCells = columns.map(col => `<th scope="col">${escapeText(col.label ?? '')}</th>`).join('');

  const bodyHtml = renderNodes(items, {
    getId: node => node.id ?? node[columns[0]?.key],
    expanded,
    render({ node, nodeId, hasChildren, isExpanded, level, children, index }) {
      const indent = '  '.repeat(level);
      const toggle = hasChildren ? (isExpanded ? '▾ ' : '▸ ') : '  ';
      const tabIndex = rovingTabIndex(level, index);

      const cells = columns.map((col, i) => {
        const value = escapeText(node[col.key] ?? '');
        const prefix = i === 0 ? `<span data-level="${level}">${indent}${toggle}</span>` : '';
        return `<td>${prefix}${value}</td>`;
      }).join('');

      return `<tr data-bn="treegrid-row" data-node-id="${escapeAttr(nodeId)}" aria-level="${level + 1}"${ariaExpanded(hasChildren, isExpanded)} role="row" tabindex="${tabIndex}">${cells}</tr>${children}`;
    },
  });

  return `<table data-bn="treegrid" id="${escapeAttr(id)}" role="treegrid"${attrsSuffix(attrs)}>
  <thead><tr>${headerCells}</tr></thead>
  <tbody>${bodyHtml}</tbody>
</table>`;
}

const ITEM = '[data-bn="tree-item"]';
const CONTENT = '[data-bn="tree-item-content"]';
const TOGGLE = '[data-bn="tree-toggle"]';
const CHILDREN = '[data-bn="tree-children"]';
const HIDDEN_GROUP = '[data-bn="tree-children"][hidden]';

function closestFrom(target, selector) {
  return target && typeof target.closest === 'function' ? target.closest(selector) : null;
}

/**
 * Client-side: wire a rendered `[data-bn="tree"]` `<ul>` to the WAI-ARIA APG
 * tree pattern.
 *
 * A click on a node's toggle button flips its `aria-expanded`, shows or
 * hides its `[data-bn="tree-children"]` group and relabels the toggle
 * (Expand / Collapse, ▸ / ▾); `onToggle(id, expanded, item)` follows. A
 * click on the rest of a node's row selects it — `aria-selected` on the
 * item, `data-selected` on its content — and calls `onSelect(id, item)`.
 *
 * Keys, with focus on a node: ArrowDown / ArrowUp move to the next / previous
 * visible node, Home / End to the first / last; ArrowRight expands a
 * collapsed node or moves into an expanded one's first child; ArrowLeft
 * collapses an expanded node or moves to the parent; Enter and Space select.
 * The roving `tabindex` follows focus so Tab leaves and re-enters the tree
 * at the node it was on. Nodes are re-queried on every interaction, so
 * nodes added after init are picked up.
 *
 * `expand(id)`, `collapse(id)` and `select(id)` reflect state silently (no
 * callbacks) so a route can keep its own state as the source of truth.
 *
 * @param {HTMLElement} tree  The [data-bn="tree"] element
 * @param {object} [options]
 * @param {(id: string, expanded: boolean, item: HTMLElement) => void} [options.onToggle]
 * @param {(id: string, item: HTMLElement) => void} [options.onSelect]
 * @returns {{ expand(id: string): boolean, collapse(id: string): boolean, select(id: string): boolean, selected(): string | null, destroy(): void }}
 */
export function initTree(tree, options = {}) {
  const { onToggle, onSelect } = options;
  const items = () => Array.from(tree.querySelectorAll(ITEM));
  const visible = () => items().filter(item => !closestFrom(item, HIDDEN_GROUP));
  const idOf = item => item.getAttribute('data-node-id');
  const byId = id => items().find(item => idOf(item) === id) ?? null;
  const isExpandable = item => item.hasAttribute('aria-expanded');
  const isExpanded = item => item.getAttribute('aria-expanded') === 'true';
  const parentOf = item => closestFrom(item.parentElement, ITEM);

  function setExpanded(item, expanded) {
    if (!isExpandable(item) || isExpanded(item) === expanded) return false;
    item.setAttribute('aria-expanded', String(expanded));
    const group = item.querySelector(CHILDREN);
    if (group) {
      if (expanded) group.removeAttribute('hidden');
      else group.setAttribute('hidden', '');
    }
    const toggle = item.querySelector(TOGGLE);
    if (toggle) {
      toggle.setAttribute('aria-label', expanded ? 'Collapse' : 'Expand');
      toggle.textContent = expanded ? '▾' : '▸';
    }
    return true;
  }

  function toggle(item) {
    const next = !isExpanded(item);
    if (setExpanded(item, next) && onToggle) onToggle(idOf(item), next, item);
  }

  function roving(item) {
    for (const it of items()) it.setAttribute('tabindex', it === item ? '0' : '-1');
  }

  function focusItem(item) {
    if (!item) return;
    roving(item);
    if (typeof item.focus === 'function') item.focus();
  }

  function applySelection(item) {
    for (const it of items()) {
      it.setAttribute('aria-selected', it === item ? 'true' : 'false');
      const content = it.querySelector(CONTENT);
      if (!content) continue;
      if (it === item) content.setAttribute('data-selected', '');
      else content.removeAttribute('data-selected');
    }
  }

  function select(item) {
    applySelection(item);
    if (onSelect) onSelect(idOf(item), item);
  }

  function onClick(e) {
    const item = closestFrom(e.target, ITEM);
    if (!item) return;
    if (closestFrom(e.target, TOGGLE)) {
      toggle(item);
      roving(item);
      return;
    }
    if (!closestFrom(e.target, CONTENT)) return;
    select(item);
    focusItem(item);
  }

  function onKeydown(e) {
    const item = closestFrom(e.target, ITEM);
    if (!item) return;
    const onToggleButton = Boolean(closestFrom(e.target, TOGGLE));
    const list = visible();
    const index = list.indexOf(item);
    if (index < 0) return;
    let next;
    switch (e.key) {
      case 'ArrowDown': next = list[index + 1]; break;
      case 'ArrowUp': next = list[index - 1]; break;
      case 'Home': next = list[0]; break;
      case 'End': next = list[list.length - 1]; break;
      case 'ArrowRight':
        if (isExpandable(item) && !isExpanded(item)) toggle(item);
        else if (isExpanded(item)) next = visible()[index + 1];
        break;
      case 'ArrowLeft':
        if (isExpanded(item)) toggle(item);
        else next = parentOf(item);
        break;
      case 'Enter':
      case ' ':
        // On the toggle button these keys are its native click; let it fire.
        if (onToggleButton) return;
        select(item);
        break;
      default: return;
    }
    e.preventDefault();
    if (next) focusItem(next);
  }

  const initial = items().find(item => item.getAttribute('aria-selected') === 'true') ?? items()[0] ?? null;
  if (initial) roving(initial);

  tree.addEventListener('click', onClick);
  tree.addEventListener('keydown', onKeydown);

  return {
    expand(id) {
      const item = byId(id);
      return Boolean(item) && setExpanded(item, true);
    },
    collapse(id) {
      const item = byId(id);
      return Boolean(item) && setExpanded(item, false);
    },
    select(id) {
      const item = byId(id);
      if (!item) return false;
      applySelection(item);
      roving(item);
      return true;
    },
    selected() {
      const item = items().find(it => it.getAttribute('aria-selected') === 'true');
      return item ? idOf(item) : null;
    },
    destroy() {
      tree.removeEventListener('click', onClick);
      tree.removeEventListener('keydown', onKeydown);
    },
  };
}
