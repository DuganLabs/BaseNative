/* Tree tests for the trinity component: rendered structure through
 * the loader + server renderer, the view model's expand/select
 * behavior, and composition depth.
 *
 * The legacy renderer walked the item tree itself, iteratively, so
 * its suite pinned byte-identical output and 10,000-level depth. The
 * trinity tree composes instead: a branch's children are a child
 * tree the host renders first and passes as childrenHtml. Depth is
 * therefore a composition property — each render is one level, and
 * the host builds deep trees bottom-up in a loop, with no recursion
 * anywhere in the path. The depth case below composes 150 levels
 * that way (kept moderate because each composed render reprocesses
 * the accumulated HTML payload, which grows with depth). */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, renderComponent } from './loader.js';
import { render } from '../../server/src/render.js';
import { create as createTree } from './tree/index.js';

const registry = await loadRegistry();
const renderTree = (items, extra = {}) => renderComponent(registry, render, 'tree', { items, ...extra }).html;

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

describe('tree — rendered structure', () => {
  it('renders branches with expansion state, nested groups and one roving tab stop', () => {
    const leafKids = renderTree([{ label: 'Alpha One' }, { label: 'Alpha Two' }], { nested: true });
    const html = renderTree([
      { label: 'Alpha', expanded: true, childrenHtml: leafKids },
      { label: 'Beta', expanded: false, childrenHtml: renderTree([{ label: 'Beta One' }], { nested: true }) },
      { label: 'Gamma (leaf)' },
    ]);
    assert.equal(count(html, 'role="tree"'), 1, 'one tree; a nested list is a group, not a second tree');
    assert.equal(count(html, '<ul variant="tree" role="group">'), 2, 'each branch has one group list');
    assert.doesNotMatch(html, /<ul role="group">|<ul role="group" hidden>/, 'no wrapper list around a list');
    assert.match(html, /Alpha\s*<ul variant="tree" role="group">\s*<li role="treeitem"/, 'the group sits straight in its treeitem');
    assert.equal(count(html, 'role="treeitem"'), 6, 'every composed item renders');
    assert.equal(count(html, 'tabindex="0"'), 1, 'the whole tree is one tab stop');
    assert.match(html, /<li role="treeitem" aria-expanded="true" aria-selected="false" tabindex="0">/);
    assert.match(html, /<li role="treeitem" aria-expanded="false" aria-selected="false" tabindex="-1">/);
    assert.match(html, /<li role="treeitem" aria-selected="false" tabindex="-1">Gamma \(leaf\)<\/li>/);
  });

  it('a collapsed branch hides its group through a token', async () => {
    const { readFile } = await import('node:fs/promises');
    const css = await readFile(new URL('./tree/styles.css', import.meta.url), 'utf8');
    const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
    assert.match(css, /& > li\[aria-expanded="false"\] > ul \{\s*display: var\(--display-tree-group-collapsed\);/);
    assert.match(tokens, /--display-tree-group-collapsed: none;/);
  });

  it('focus entering a nested list takes the tab stop from the list above it', () => {
    const root = createTree({ items: [{ label: 'Services', expanded: true, childrenHtml: '<ul></ul>' }, { label: 'Settings' }] });
    const nested = createTree({ items: [{ label: 'Panel' }, { label: 'EV' }], nested: true });
    assert.equal(nested.role(), 'group');
    assert.equal(root.role(), 'tree');
    assert.deepEqual(nested.items().map(nested.tabIndex), [-1, -1], 'a nested list starts with no stop');
    assert.equal(root.tabIndex(root.items()[0]), 0);
    const list = { querySelectorAll: () => [], contains: () => true };
    const inner = { parentElement: {}, closest: () => inner };
    root.onFocusin({ target: inner, currentTarget: list });
    assert.deepEqual(root.items().map(root.tabIndex), [-1, -1], 'the root gives its stop up');
  });

  it('marks the selected item and escapes labels', () => {
    const html = renderTree(
      [{ label: 'Nested <Deep> & "quoted"' }, { label: 'Plain' }],
      { },
    );
    assert.ok(html.includes('Nested &lt;Deep&gt; &amp; "quoted"'), 'label text is escaped');
    assert.ok(!html.includes('<Deep>'), 'no raw label markup leaks');

    const vm = createTree({
      items: [{ label: 'Nested <Deep> & "quoted"' }, { label: 'Plain' }],
      selectedId: 'Plain',
    });
    const [first, second] = vm.items();
    assert.equal(vm.selectedAttr(second), 'true');
    assert.equal(vm.selectedAttr(first), 'false');
    assert.equal(vm.tabIndex(second), 0, 'the selected item holds the roving stop');
    assert.equal(vm.tabIndex(first), -1);
  });

  it('an item id defaults to its label', () => {
    const vm = createTree({ items: [{ label: 'Services', childrenHtml: '<li>x</li>', expanded: false }] });
    assert.equal(vm.selectById('Services'), true);
    assert.equal(vm.selectedAttr(vm.items()[0]), 'true');
  });
});

describe('tree — view model behavior', () => {
  const branch = () => ({
    items: [
      { id: 'a', label: 'Alpha', expanded: false, childrenHtml: '<li>kid</li>' },
      { id: 'b', label: 'Beta' },
    ],
  });

  it('toggle flips expansion on the items signal and reports through onToggle', () => {
    const reports = [];
    const vm = createTree({ ...branch(), onToggle: (id, expanded) => reports.push([id, expanded]) });
    vm.toggle(vm.items()[0]);
    assert.equal(vm.items()[0].expanded, true);
    assert.equal(vm.expandedState(vm.items()[0]), 'true');
    assert.equal(vm.isExpanded(vm.items()[0]), true);
    vm.toggle(vm.items()[0]);
    assert.equal(vm.items()[0].expanded, false);
    assert.deepEqual(reports, [['a', true], ['a', false]]);
    vm.toggle(vm.items()[1]);
    assert.deepEqual(reports, [['a', true], ['a', false]], 'a leaf cannot toggle');
  });

  it('expand and collapse are silent reflectors that refuse leaves and no-ops', () => {
    const reports = [];
    const vm = createTree({ ...branch(), onToggle: (id, expanded) => reports.push([id, expanded]) });
    assert.equal(vm.expand('a'), true);
    assert.equal(vm.expand('a'), false, 'already expanded');
    assert.equal(vm.expand('b'), false, 'a leaf has no children to show');
    assert.equal(vm.expand('nope'), false, 'unknown id');
    assert.equal(vm.collapse('a'), true);
    assert.equal(vm.collapse('a'), false, 'already collapsed');
    assert.deepEqual(reports, [], 'reflectors never report');
  });

  it('a click on the toggle button toggles the branch; a click on the item selects it', () => {
    const vm = createTree(branch());
    const list = { children: [] };
    const makeItem = () => {
      const li = { parentElement: list };
      list.children.push(li);
      return li;
    };
    const branchLi = makeItem();
    makeItem();
    const clickOn = (li, onButton) => ({
      target: {
        closest: (sel) => (sel === 'button' ? (onButton ? {} : null) : li),
      },
      currentTarget: list,
    });
    vm.onClick(clickOn(branchLi, true));
    assert.equal(vm.items()[0].expanded, true, 'the toggle button expands the branch');
    assert.equal(vm.selected(), null, 'toggling does not select');
    vm.onClick(clickOn(branchLi, true));
    assert.equal(vm.items()[0].expanded, false, 'a second click collapses it');
    vm.onClick(clickOn(branchLi, false));
    assert.equal(vm.selected(), 'a', 'a plain item click selects');
  });

  it('select reports the id; selectById reflects silently; both move the roving stop', () => {
    const picked = [];
    const vm = createTree({ ...branch(), onSelect: (id) => picked.push(id) });
    vm.select(vm.items()[1]);
    assert.deepEqual(picked, ['b']);
    assert.equal(vm.tabIndex(vm.items()[1]), 0);
    assert.equal(vm.selectById('a'), true);
    assert.equal(vm.selectedAttr(vm.items()[0]), 'true');
    assert.equal(vm.tabIndex(vm.items()[0]), 0);
    assert.deepEqual(picked, ['b'], 'selectById does not report');
    assert.equal(vm.selectById('nope'), false);
  });
});

describe('tree — composition depth', () => {
  it('composes a 150-deep tree bottom-up with no recursion in the render path', () => {
    let html = renderTree([{ label: 'Node 149' }], { nested: true });
    for (let i = 148; i >= 0; i--) {
      html = renderTree([{ label: `Node ${i}`, expanded: true, childrenHtml: html }], { nested: i > 0 });
    }
    assert.equal(count(html, 'role="treeitem"'), 150);
    assert.ok(html.includes('Node 149'));
    assert.ok(html.includes('Node 0'));
  });

  it('renders a wide tree flat', () => {
    const items = Array.from({ length: 5000 }, (_, i) => ({ label: `Item ${i}` }));
    const html = renderTree(items);
    assert.equal(count(html, 'role="treeitem"'), 5000);
  });
});
