/* Component behavior tests for the Holy Trinity view models.
 *
 * Markup contracts live in catalog.test.js and holy-trinity.test.js
 * (rendered through the loader + server renderer). This suite covers
 * what those cannot: the behavior each component's create() owns —
 * the APG keyboard patterns, selection/sort models, the dialog
 * behavior, the toaster — exercised at the view-model level with
 * plain event stubs, plus the retained utility modules (skeleton,
 * layout-grid, ids, internal helpers) that predate the trinity and
 * are not components. DOM-level keyboard behavior is covered by the
 * Playwright specs in tests/e2e. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { renderSkeleton } from './skeleton.js';
import { renderLayoutGrid } from './layout-grid.js';
import { nextId, resetIds } from './ids.js';
import * as api from './index.js';
import { bindDrag } from './internal/drag.js';
import { normalizeItem } from './internal/items.js';
import { describedBy, renderField } from './internal/field.js';
import { attrsSuffix } from './internal/attrs.js';
import { createDialogBehavior } from './internal/dialog.js';
import { create as createTabs } from './tabs/index.js';
import { create as createDropdownMenu } from './dropdown-menu/index.js';
import { create as createCommandPalette } from './command-palette/index.js';
import { create as createCombobox } from './combobox/index.js';
import { create as createMultiselect } from './multiselect/index.js';
import { create as createSelect } from './select/index.js';
import { create as createToolbar } from './toolbar/index.js';
import { create as createToast } from './toast/index.js';
import { create as createAlert } from './alert/index.js';
import { create as createDatagrid } from './datagrid/index.js';
import { create as createVirtualizer } from './virtualizer/index.js';
import { create as createCalendar } from './calendar/index.js';
import { create as createPipeline } from './pipeline/index.js';
import { createToaster } from './toast/index.js';

const XSS = '"><script>alert(1)</script>';

function assertEscaped(html) {
  assert.ok(!html.includes('<script>'), 'raw <script> leaked into markup');
  assert.ok(!html.includes('"><script'), 'attribute breakout');
  assert.ok(html.includes('&lt;script&gt;'), 'payload was not escaped');
}

function fakeContainer() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener(type, fn) {
      if (listeners.get(type) === fn) listeners.delete(type);
    },
    querySelectorAll() {
      return [];
    },
  };
}

const keyEvent = (key) => ({ key, preventDefault() {} });

describe('Skeleton', () => {
  it('renders a skeleton', () => {
    const html = renderSkeleton({ width: '200px', height: '1rem' });
    assert.ok(html.includes('data-bn="skeleton"'));
    assert.ok(html.includes('aria-hidden="true"'));
  });

  it('renders multiple skeletons', () => {
    const html = renderSkeleton({ count: 3 });
    const matches = html.match(/data-bn="skeleton"/g);
    assert.equal(matches.length, 3);
  });
});

describe('LayoutGrid — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderLayoutGrid();
    assert.ok(
      html.startsWith(
        '<div data-bn="layout-grid" id="layout-grid" data-columns="12" data-gap="1rem">',
      ),
    );
  });

  it('renders with all options', () => {
    const html = renderLayoutGrid({
      id: 'g',
      columns: 4,
      gap: '2px',
      minCellHeight: '1rem',
      editable: true,
      cells: [{ id: 'c1', label: 'L', colSpan: 2, rowSpan: 3 }, { content: '<b>x</b>' }, {}],
    });
    assert.ok(html.includes('data-columns="4"'));
    assert.ok(html.includes('data-gap="2px"'));
    assert.ok(
      html.includes(
        'data-cell-id="c1" data-col-span="2" data-row-span="3" data-min-block-size="1rem" draggable="true">L</div>',
      ),
    );
    assert.ok(html.includes('data-cell-id="cell-1"'));
    assert.ok(html.includes('>Cell 3</div>'));
  });

  it('escapes id, cell ids, labels and style values', () => {
    assertEscaped(
      renderLayoutGrid({
        id: XSS,
        gap: XSS,
        columns: XSS,
        minCellHeight: XSS,
        cells: [{ id: XSS, label: XSS }],
      }),
    );
  });

  it('cell content is an HTML slot', () => {
    assert.ok(renderLayoutGrid({ cells: [{ content: '<b>x</b>' }] }).includes('><b>x</b></div>'));
  });
});

describe('ids', () => {
  it('nextId yields bn-<prefix>-<n> from a counter', () => {
    resetIds();
    assert.equal(nextId('dialog'), 'bn-dialog-1');
    assert.equal(nextId('tabs'), 'bn-tabs-2');
  });

  it('resetIds restarts the counter', () => {
    nextId('x');
    resetIds();
    assert.equal(nextId('x'), 'bn-x-1');
  });

  it('is exported from the package index', () => {
    assert.equal(typeof api.nextId, 'function');
    assert.equal(typeof api.resetIds, 'function');
  });
});

describe('internal helpers', () => {
  it('attrsSuffix prefixes a space only when attrs is non-empty', () => {
    assert.equal(attrsSuffix(''), '');
    assert.equal(attrsSuffix(undefined), '');
    assert.equal(attrsSuffix('data-x="1"'), ' data-x="1"');
  });

  it('normalizeItem treats a string as value and label', () => {
    assert.deepEqual(normalizeItem('a'), { value: 'a', label: 'a', disabled: false });
    assert.deepEqual(normalizeItem({ value: 'v', label: 'L', disabled: true }), {
      value: 'v',
      label: 'L',
      disabled: true,
    });
  });

  it('describedBy lists help and error ids', () => {
    assert.equal(describedBy('f', '', ''), '');
    assert.equal(describedBy('f', 'h', ''), ' aria-describedby="f-help"');
    assert.equal(describedBy('f', '', 'e'), ' aria-describedby="f-error"');
    assert.equal(describedBy('f', 'h', 'e'), ' aria-describedby="f-help f-error"');
  });

  it('renderField escapes label, help and error', () => {
    const html = renderField({
      id: 'f',
      label: XSS,
      control: '<i></i>',
      helpText: XSS,
      error: XSS,
    });
    assertEscaped(html);
    assert.ok(html.includes('<i></i>'));
    assert.ok(html.includes('id="f-help"'));
    assert.ok(html.includes('id="f-error"'));
  });

  it('bindDrag attaches only function handlers and destroy removes them', () => {
    const el = fakeContainer();
    const handle = bindDrag(el, { dragstart() {}, drop() {}, dragover: undefined });
    assert.deepEqual([...el.listeners.keys()], ['dragstart', 'drop']);
    handle.destroy();
    assert.equal(el.listeners.size, 0);
  });
});

describe('package surface', () => {
  it('exports every catalog component as an aggregate', () => {
    const aggregates = Object.values(api).filter(
      (value) =>
        value &&
        typeof value === 'object' &&
        typeof value.create === 'function' &&
        typeof value.name === 'string',
    );
    assert.equal(aggregates.length, 47);
  });

  it('exports the registry, loader and toaster factories', () => {
    for (const name of [
      'createRegistry',
      'validateTemplate',
      'validateCss',
      'loadRegistry',
      'renderComponent',
      'assembleStyles',
      'createToaster',
    ]) {
      assert.equal(typeof api[name], 'function', name);
    }
    assert.equal(typeof api.registry.registerComponent, 'function', 'the shared registry instance');
  });
});

describe('tabs — APG keyboard pattern', () => {
  const tabList = () => [
    { value: 'a', label: 'A', panelHtml: '<p>A</p>' },
    { value: 'b', label: 'B', panelHtml: '<p>B</p>' },
    { value: 'c', label: 'C', panelHtml: '<p>C</p>', disabled: true },
    { value: 'd', label: 'D', panelHtml: '<p>D</p>' },
  ];

  it('requires id, label and tabs with panels', () => {
    assert.throws(() => createTabs({ label: 'L', tabs: tabList() }), /id is required/);
    assert.throws(() => createTabs({ id: 't', label: 'L', tabs: [{ value: 'a' }] }), /panelHtml/);
  });

  it('selects the first enabled tab and roves tabindex with selection', () => {
    const vm = createTabs({ id: 't', label: 'L', tabs: tabList() });
    assert.equal(vm.selected(), 'a');
    const [a, b] = vm.tabs();
    assert.equal(vm.tabIndex(a), 0);
    assert.equal(vm.tabIndex(b), -1);
    assert.equal(vm.tabId(a), 't-tab-a');
    assert.equal(vm.panelId(a), 't-panel-a');
  });

  it('arrows move and select under automatic activation, skipping disabled and wrapping', () => {
    const vm = createTabs({ id: 't', label: 'L', tabs: tabList() });
    const [a, , , d] = vm.tabs();
    vm.onKeydown(keyEvent('ArrowRight'), a);
    assert.equal(vm.selected(), 'b');
    assert.equal(vm.focused(), 'b');
    vm.onKeydown(keyEvent('ArrowRight'), vm.tabs()[1]);
    assert.equal(vm.selected(), 'd', 'the disabled tab is skipped');
    vm.onKeydown(keyEvent('ArrowRight'), d);
    assert.equal(vm.selected(), 'a', 'wraps to the first tab');
    vm.onKeydown(keyEvent('ArrowLeft'), a);
    assert.equal(vm.selected(), 'd', 'wraps backwards');
    vm.onKeydown(keyEvent('Home'), d);
    assert.equal(vm.selected(), 'a');
    vm.onKeydown(keyEvent('End'), a);
    assert.equal(vm.selected(), 'd');
  });

  it('manual activation moves focus without selecting until select() runs', () => {
    const reported = [];
    const vm = createTabs({
      id: 't',
      label: 'L',
      name: 'group',
      activation: 'manual',
      tabs: tabList(),
      onSelect: (payload) => reported.push(payload),
    });
    const [a, b] = vm.tabs();
    vm.onKeydown(keyEvent('ArrowRight'), a);
    assert.equal(vm.focused(), 'b');
    assert.equal(vm.selected(), 'a');
    assert.equal(vm.tabIndex(b), 0, 'tabindex follows focus, not selection');
    vm.select(b);
    assert.equal(vm.selected(), 'b');
    assert.deepEqual(reported, [
      { name: 'group', mode: 'tabs', values: ['b'], changed: 'b', selected: true },
    ]);
    vm.select(vm.tabs()[2]);
    assert.equal(vm.selected(), 'b', 'a disabled tab cannot be selected');
  });
});

describe('dropdown-menu — activation', () => {
  it('reports the action of an enabled item and ignores disabled and separators', () => {
    const calls = [];
    const vm = createDropdownMenu({
      items: [
        { label: 'Rename', action: 'rename' },
        { label: 'Delete', action: 'delete', disabled: true },
        { separator: true },
        { label: 'Plain' },
      ],
      onSelect: (action, item) => calls.push([action, item.label]),
    });
    const [rename, del, separator, plain] = vm.items();
    vm.activate(rename);
    vm.activate(del);
    vm.activate(separator);
    vm.activate(plain);
    assert.deepEqual(calls, [
      ['rename', 'Rename'],
      ['', 'Plain'],
    ]);
    assert.equal(vm.isDisabled(del), 'true');
    assert.equal(vm.isDisabled(rename), 'false');
  });

  it('requires an items array', () => {
    assert.throws(() => createDropdownMenu({}), /items is required/);
  });
});

describe('command-palette — filter, active option, choose', () => {
  const groups = () => [
    {
      label: 'Pages',
      options: [
        { value: 'home', label: 'Home' },
        { value: 'docs', label: 'Docs' },
      ],
    },
    { label: 'Actions', options: [{ value: 'build', label: 'Build site' }] },
  ];

  it('starts on the first option and follows it with aria-activedescendant', () => {
    const vm = createCommandPalette({ id: 'cp', searchHtml: '<input>', groups: groups() });
    assert.equal(vm.activeOption().value, 'home');
    assert.equal(vm.activeDescendant(), 'cp-option-home');
    vm.onKeydown(keyEvent('ArrowDown'));
    assert.equal(vm.activeOption().value, 'docs');
    vm.onKeydown(keyEvent('ArrowDown'));
    assert.equal(vm.activeOption().value, 'build', 'movement crosses groups');
    vm.onKeydown(keyEvent('ArrowDown'));
    assert.equal(vm.activeOption().value, 'home', 'wraps');
    vm.onKeydown(keyEvent('ArrowUp'));
    assert.equal(vm.activeOption().value, 'build', 'wraps backwards');
  });

  it('setQuery filters by label, drops empty groups and resets the active option', () => {
    const vm = createCommandPalette({ id: 'cp', searchHtml: '<input>', groups: groups() });
    vm.setQuery('doc');
    assert.equal(vm.visibleGroups().length, 1);
    assert.deepEqual(
      vm.flatOptions().map((o) => o.value),
      ['docs'],
    );
    assert.equal(vm.activeOption().value, 'docs');
    assert.equal(vm.activeDescendant(), 'cp-option-docs');
    vm.setQuery('zzz');
    assert.equal(vm.flatOptions().length, 0);
    assert.equal(vm.activeOption(), null);
    assert.equal(vm.activeDescendant(), '');
    vm.setQuery('');
    assert.equal(vm.flatOptions().length, 3);
  });

  it('choose reports the option and closes the hosting dialog', () => {
    const picked = [];
    const vm = createCommandPalette({
      id: 'cp',
      searchHtml: '<input>',
      groups: groups(),
      onSelect: (payload) => picked.push(payload),
    });
    const dialog = {
      open: true,
      close() {
        this.open = false;
      },
    };
    const event = { currentTarget: { closest: () => dialog } };
    vm.choose(event, vm.flatOptions()[1]);
    assert.deepEqual(picked, [{ value: 'docs', label: 'Docs' }]);
    assert.equal(dialog.open, false);
  });
});

describe('combobox — APG listbox pattern', () => {
  const options = () => [
    { value: 'apple', label: 'Apple' },
    { value: 'pear', label: 'Pear' },
    { value: 'plum', label: 'Plum' },
  ];

  it('aria-activedescendant stays empty while closed and follows the arrows once open', () => {
    const vm = createCombobox({ id: 'cb', inputHtml: '<input>', options: options() });
    assert.equal(vm.activeDescendant(), '');
    vm.onKeydown(keyEvent('ArrowDown'));
    assert.equal(vm.open(), true);
    assert.equal(vm.activeDescendant(), 'cb-option-apple');
    vm.onKeydown(keyEvent('ArrowDown'));
    assert.equal(vm.activeDescendant(), 'cb-option-pear');
    vm.onKeydown(keyEvent('ArrowUp'));
    assert.equal(vm.activeDescendant(), 'cb-option-apple');
    vm.onKeydown(keyEvent('End'));
    assert.equal(vm.activeDescendant(), 'cb-option-plum');
    vm.onKeydown(keyEvent('Home'));
    assert.equal(vm.activeDescendant(), 'cb-option-apple');
  });

  it('Enter selects the active option, closes and reports; Escape closes without selecting', () => {
    const picked = [];
    const vm = createCombobox({
      id: 'cb',
      inputHtml: '<input>',
      options: options(),
      onSelect: (payload) => picked.push(payload),
    });
    vm.onKeydown(keyEvent('ArrowDown'));
    vm.onKeydown(keyEvent('ArrowDown'));
    vm.onKeydown(keyEvent('Enter'));
    assert.equal(vm.value(), 'pear');
    assert.equal(vm.open(), false);
    assert.deepEqual(picked, [{ value: 'pear', label: 'Pear' }]);
    vm.onKeydown(keyEvent('ArrowDown'));
    assert.equal(vm.open(), true);
    vm.onKeydown(keyEvent('Escape'));
    assert.equal(vm.open(), false);
    assert.equal(picked.length, 1);
  });

  it('clicking an option selects it', () => {
    const vm = createCombobox({ id: 'cb', inputHtml: '<input>', options: options(), open: true });
    vm.select(vm.options()[2]);
    assert.equal(vm.value(), 'plum');
    assert.equal(vm.open(), false);
  });
});

describe('multiselect — toggle model and keyboard', () => {
  const options = () => [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ];

  it('toggle adds and removes, reporting the values each time', () => {
    const reports = [];
    const vm = createMultiselect({
      id: 'ms',
      inputHtml: '<input>',
      options: options(),
      onChange: (payload) => reports.push(payload.values),
    });
    const [a, b] = vm.options();
    vm.toggle(a);
    vm.toggle(b);
    assert.deepEqual(
      vm.selected().map((item) => item.value),
      ['a', 'b'],
    );
    assert.equal(vm.isSelected(a), 'true');
    vm.toggle(a);
    assert.deepEqual(
      vm.selected().map((item) => item.value),
      ['b'],
    );
    assert.deepEqual(reports, [['a'], ['a', 'b'], ['b']]);
    assert.equal(vm.hasSelected(), true);
  });

  it('silent reflectors add and remove without double-adding; removeLast backs Backspace', () => {
    const vm = createMultiselect({ id: 'ms', inputHtml: '<input>', options: options() });
    assert.equal(vm.addValue('a'), true);
    assert.equal(vm.addValue('a'), false, 'already selected');
    assert.equal(vm.addValue('nope'), false, 'unknown value');
    assert.equal(vm.addValue('c'), true);
    assert.equal(vm.removeLast(), true);
    assert.deepEqual(
      vm.selected().map((item) => item.value),
      ['a'],
    );
    assert.equal(vm.removeValue('zzz'), false);
    assert.equal(vm.removeValue('a'), true);
    assert.equal(vm.removeLast(), false, 'nothing left to remove');
  });

  it('arrows open and move the active option; Enter toggles it', () => {
    const vm = createMultiselect({ id: 'ms', inputHtml: '<input>', options: options() });
    vm.onKeydown(keyEvent('ArrowDown'));
    assert.equal(vm.open(), true);
    assert.equal(vm.activeDescendant(), 'ms-option-a');
    vm.onKeydown(keyEvent('ArrowDown'));
    assert.equal(vm.activeDescendant(), 'ms-option-b');
    vm.onKeydown(keyEvent('Enter'));
    assert.deepEqual(
      vm.selected().map((item) => item.value),
      ['b'],
    );
    vm.onKeydown(keyEvent('Escape'));
    assert.equal(vm.open(), false);
    assert.equal(vm.activeDescendant(), '');
  });
});

describe('specimen behaviors — the patterns that moved in from the site boot', () => {
  const comboOptions = () => [
    { value: 'orange', label: 'Orange County' },
    { value: 'la', label: 'Los Angeles' },
    { value: 'riverside', label: 'Riverside' },
  ];

  it('combobox: typing filters the options and activates the first visible one; focus opens unfiltered', () => {
    const vm = createCombobox({ id: 'cb', inputHtml: '<input>', options: comboOptions() });
    vm.onFocus();
    assert.equal(vm.open(), true);
    assert.deepEqual(
      vm.visibleOptions().map((o) => o.value),
      ['orange', 'la', 'riverside'],
    );
    vm.onInput({ target: { value: 'ang' } });
    assert.deepEqual(
      vm.visibleOptions().map((o) => o.value),
      ['orange', 'la'],
    );
    assert.equal(vm.activeDescendant(), 'cb-option-orange');
    vm.onInput({ target: { value: 'river' } });
    assert.deepEqual(
      vm.visibleOptions().map((o) => o.value),
      ['riverside'],
    );
    assert.equal(vm.activeOption().value, 'riverside');
  });

  it('combobox: Enter on the active option lands its label in the field', () => {
    const vm = createCombobox({ id: 'cb', inputHtml: '<input>', options: comboOptions() });
    vm.onFocus();
    vm.onInput({ target: { value: 'river' } });
    const field = { value: 'river' };
    vm.onKeydown({ key: 'Enter', preventDefault() {}, target: field });
    assert.equal(vm.value(), 'riverside');
    assert.equal(field.value, 'Riverside');
    assert.equal(vm.open(), false);
  });

  it('combobox: choosing from the popup lands the label in the composed input', () => {
    const vm = createCombobox({
      id: 'cb',
      inputHtml: '<input>',
      options: comboOptions(),
      open: true,
    });
    const input = { value: '' };
    const li = { closest: () => ({ querySelector: () => input }) };
    vm.choose({ currentTarget: li, target: li }, vm.options()[1]);
    assert.equal(input.value, 'Los Angeles');
    assert.equal(vm.value(), 'la');
    assert.equal(vm.open(), false);
  });

  it('multiselect: typing filters; a chip button removes its value and the refocus does not reopen', () => {
    const vm = createMultiselect({
      id: 'ms',
      inputHtml: '<input>',
      options: [
        { value: 'ev', label: 'EV charging' },
        { value: 'panel', label: 'Panel upgrade' },
        { value: 'lighting', label: 'Lighting' },
      ],
      selected: [{ value: 'ev', label: 'EV charging', dismissHtml: '<button>Remove</button>' }],
    });
    vm.onInput({ target: { value: 'light' } });
    assert.deepEqual(
      vm.visibleOptions().map((o) => o.value),
      ['lighting'],
    );
    assert.equal(vm.open(), true);

    let focused = false;
    const input = {
      focus() {
        focused = true;
      },
    };
    const chipLi = {};
    const section = { querySelector: () => input };
    const chipList = { children: [chipLi], closest: (sel) => (sel === 'ul' ? chipList : section) };
    const button = { closest: (sel) => (sel === 'button' ? button : chipLi) };
    vm.onChipsClick({ target: button, currentTarget: chipList });
    assert.deepEqual(vm.selected(), [], 'the chip click removed the only selection');
    assert.equal(focused, true, 'focus returned to the field');
    vm.open.set(false);
    vm.onFocus();
    assert.equal(vm.open(), false, 'the dismissal refocus is not a fresh open');
    vm.onFocus();
    assert.equal(vm.open(), true, 'a later, genuine focus opens again');
  });

  it('select: an arrow key opens the closed popover; Escape closes it', () => {
    const vm = createSelect({ id: 'sel', options: comboOptions(), value: 'la' });
    vm.keydown(keyEvent('ArrowDown'));
    assert.equal(vm.open(), true);
    vm.keydown(keyEvent('Escape'));
    assert.equal(vm.open(), false);
    vm.keydown(keyEvent('Enter'));
    assert.equal(vm.open(), false, 'keys other than the arrows do not open');
  });

  it('dialog behavior: the header close control dismisses, a footer action does not; Escape closes an open dialog', () => {
    const dialog = {
      open: true,
      close() {
        this.open = false;
      },
      closest() {
        return this;
      },
      querySelector(sel) {
        return sel === 'header' ? this.header : null;
      },
      header: { contains: (el) => el === headerButton },
    };
    const headerButton = { closest: () => headerButton };
    const footerButton = { closest: () => footerButton };
    const vm = createDialogBehavior({ id: 'dlg' });
    vm.onClick({ target: footerButton, currentTarget: dialog });
    assert.equal(dialog.open, true, 'footer actions belong to the app');
    vm.onClick({ target: headerButton, currentTarget: dialog });
    assert.equal(dialog.open, false, 'the header close control dismisses');
    dialog.open = true;
    vm.onKeydown({ key: 'Escape', preventDefault() {}, currentTarget: dialog });
    assert.equal(dialog.open, false, 'Escape dismisses a dialog staged open in flow');
    vm.onKeydown({ key: 'Escape', preventDefault() {}, currentTarget: dialog });
    assert.equal(dialog.open, false, 'Escape on a closed dialog is a no-op');
  });

  it('toolbar: Escape closes the overflow and reports; closeOverflow is idempotent', () => {
    const reports = [];
    const vm = createToolbar({
      label: 'Actions',
      actionsHtml: '<button>New</button>',
      overflowHtml: '<menu></menu>',
      overflowOpen: true,
      onOverflow: (payload) => reports.push(payload.open),
    });
    let refocused = false;
    const bar = {
      querySelector: () => ({
        focus() {
          refocused = true;
        },
      }),
    };
    vm.onKeydown({ key: 'Escape', preventDefault() {}, currentTarget: { closest: () => bar } });
    assert.equal(vm.overflowOpen(), false);
    assert.equal(refocused, true, 'focus returns to the More button');
    vm.closeOverflow();
    assert.deepEqual(reports, [false], 'closing a closed overflow does not report again');
  });

  it('toast: a click on an item dismiss control removes exactly that item', () => {
    const vm = createToast({
      items: [
        { message: 'One', tone: 'success', dismissHtml: '<button>Dismiss</button>' },
        { message: 'Two', tone: 'danger', dismissHtml: '<button>Dismiss</button>' },
      ],
    });
    const [first] = vm.items();
    vm.onItemClick({ target: { closest: () => null } }, first);
    assert.equal(vm.items().length, 2, 'a click off the button keeps the item');
    vm.onItemClick({ target: { closest: () => ({}) } }, first);
    assert.deepEqual(
      vm.items().map((item) => item.message),
      ['Two'],
    );
  });

  it('alert: only a button click dismisses, and it removes the aside', () => {
    const vm = createAlert({
      title: 'Heads up',
      body: 'Body',
      dismissHtml: '<button>Dismiss</button>',
    });
    let removed = false;
    const aside = {
      remove() {
        removed = true;
      },
    };
    const fromAside = { closest: () => aside };
    vm.dismiss({ target: { closest: () => null }, currentTarget: fromAside });
    assert.equal(removed, false, 'a click off the button keeps the alert');
    vm.dismiss({ target: { closest: () => ({}) }, currentTarget: fromAside });
    assert.equal(removed, true);
  });

  it('datagrid: sortClick sorts only when the click lands on the header button', () => {
    const vm = createDatagrid({
      columns: [
        { key: 'lead', label: 'Lead', sort: 'ascending', sortHtml: '<button>Lead</button>' },
        { key: 'fee', label: 'Fee' },
      ],
      rows: [{ cells: ['Garcia', '$85'] }, { cells: ['Nguyen', '$65'] }],
    });
    const column = vm.viewColumns()[0];
    vm.sortClick({ target: { closest: () => null } }, column);
    assert.deepEqual(
      vm.viewRows().map((row) => row.cells[0].html),
      ['Garcia', 'Nguyen'],
      'a cell click does not sort',
    );
    vm.sortClick({ target: { closest: () => ({}) } }, column);
    assert.deepEqual(
      vm.viewRows().map((row) => row.cells[0].html),
      ['Nguyen', 'Garcia'],
      'the button click flips to descending',
    );
    assert.equal(vm.sortState().dir, 'desc');
  });
});

describe('datagrid — sort and selection models', () => {
  const columns = () => [
    { key: 'name', label: 'Name' },
    { key: 'size', label: 'Size' },
  ];
  const rows = () => [
    { id: 'r1', cells: ['Beta', '10'] },
    { id: 'r2', cells: ['Alpha', '2'] },
  ];

  it('decorates rows and cells with grid coordinates, offset by the selection column', () => {
    const plain = createDatagrid({ columns: columns(), rows: rows() });
    assert.deepEqual(
      plain.viewRows().map((row) => [row.r, row.cells[0].c]),
      [
        [1, 0],
        [2, 0],
      ],
    );
    const selectable = createDatagrid({ columns: columns(), rows: rows(), selectable: true });
    assert.deepEqual(
      selectable.viewColumns().map((col) => col.c),
      [1, 2],
    );
    assert.deepEqual(
      selectable.viewRows().map((row) => row.cells[0].c),
      [1, 1],
    );
    assert.equal(
      selectable.selectAllTabIndex(),
      0,
      'the selection header cell holds the roving stop',
    );
  });

  it('sortBy sorts by stripped cell text with numeric collation and flips on repeat', () => {
    const vm = createDatagrid({ columns: columns(), rows: rows() });
    vm.sortBy(vm.columns()[0]);
    assert.deepEqual(
      vm.rows().map((row) => row.id),
      ['r2', 'r1'],
    );
    assert.deepEqual(vm.sortState(), { key: 'name', dir: 'asc' });
    vm.sortBy(vm.columns()[0]);
    assert.deepEqual(
      vm.rows().map((row) => row.id),
      ['r1', 'r2'],
    );
    assert.deepEqual(vm.sortState(), { key: 'name', dir: 'desc' });
    vm.sortBy(vm.columns()[1]);
    assert.deepEqual(
      vm.rows().map((row) => row.id),
      ['r2', 'r1'],
      'numeric collation: 2 before 10',
    );
  });

  it('an onSort host owns the ordering; the grid only reports', () => {
    const calls = [];
    const vm = createDatagrid({
      columns: columns(),
      rows: rows(),
      onSort: (payload) => calls.push(payload),
    });
    vm.sortBy(vm.columns()[1]);
    assert.deepEqual(calls, [{ key: 'size', dir: 'asc' }]);
    assert.deepEqual(
      vm.rows().map((row) => row.id),
      ['r1', 'r2'],
      'rows untouched',
    );
  });

  it('selection toggles report, select() reflects silently, selectAllState tracks coverage', () => {
    const reports = [];
    const vm = createDatagrid({
      columns: columns(),
      rows: rows(),
      selectable: true,
      onSelectionChange: (ids) => reports.push(ids),
    });
    assert.equal(vm.selectAllState(), 'none');
    vm.toggleRow('r1', true);
    assert.equal(vm.selectAllState(), 'some');
    assert.equal(vm.isRowSelected(vm.viewRows()[0]), 'true');
    vm.toggleAll(true);
    assert.equal(vm.selectAllState(), 'all');
    vm.toggleRow('r1', false);
    assert.deepEqual(vm.selectedIds(), ['r2']);
    vm.select([]);
    assert.equal(vm.selectAllState(), 'none');
    assert.equal(reports.length, 3, 'select() does not report');
  });
});

describe('virtualizer — window math', () => {
  it('computes the window and spacers from scrollTop and re-slices on setScrollTop', () => {
    const vm = createVirtualizer({
      id: 'v',
      total: 100,
      rowHeight: 20,
      viewportRows: 5,
      overscan: 1,
    });
    assert.equal(vm.startIndex(), 0);
    assert.equal(vm.endIndex(), 7);
    assert.deepEqual(vm.windowIndices(), [0, 1, 2, 3, 4, 5, 6]);
    assert.equal(vm.spacerEndCount(), 93);
    vm.setScrollTop(400);
    assert.equal(vm.startIndex(), 19);
    assert.equal(vm.endIndex(), 26);
    assert.equal(vm.spacerStartCount(), 19);
    assert.equal(vm.spacerEndCount(), 74);
    assert.ok(!vm.windowIndices().includes(0));
    vm.setScrollTop(-50);
    assert.equal(vm.scrollTop(), 0, 'negative offsets clamp to the top');
    vm.onScroll({ target: { scrollTop: 40 } });
    assert.equal(vm.scrollTop(), 40, 'onScroll reads the scroller element');
  });
});

describe('calendar — moveEvent', () => {
  const setup = () => {
    const drops = [];
    const vm = createCalendar({
      year: 2026,
      month: 11,
      events: [
        {
          id: 'e1',
          title: 'Dentist',
          date: '2026-11-02',
          at: '2026-11-02T09:00',
          timeLabel: '9:00 AM',
        },
      ],
      onDrop: (payload) => drops.push(payload),
    });
    return { vm, drops };
  };

  it('re-dates the event, rebuilds its time label, reports the drop and announces it', () => {
    const { vm, drops } = setup();
    assert.equal(vm.title(), 'November 2026');
    assert.equal(vm.moveEvent('e1', { date: '2026-11-03', hour: 14, minute: 30 }), true);
    const [event] = vm.events();
    assert.equal(event.date, '2026-11-03');
    assert.equal(event.at, '2026-11-03T14:30');
    assert.equal(event.timeLabel, '2:30 PM');
    assert.deepEqual(drops, [
      {
        eventId: 'e1',
        date: '2026-11-03',
        hour: 14,
        minute: 30,
        datetime: '2026-11-03T14:30',
        sourceType: 'event',
      },
    ]);
    assert.equal(vm.status(), 'Moved Dentist to Tue, November 3 at 2:30 PM.');
    assert.deepEqual(
      vm.days().map((day) => day.date),
      ['2026-11-03'],
    );
  });

  it('finds an event by title when it has no id and refuses unknown events', () => {
    const { vm } = setup();
    assert.equal(vm.moveEvent('nope', { date: '2026-11-04', hour: 9, minute: 0 }), false);
    const vm2 = createCalendar({
      year: 2026,
      month: 11,
      events: [
        { title: 'Loose', date: '2026-11-02', at: '2026-11-02T09:00', timeLabel: '9:00 AM' },
      ],
    });
    assert.equal(vm2.moveEvent('Loose', { date: '2026-11-05', hour: 8, minute: 15 }), true);
    assert.equal(vm2.events()[0].timeLabel, '8:15 AM');
  });
});

describe('pipeline — moveCard', () => {
  const setup = () => {
    const moves = [];
    const vm = createPipeline({
      columns: [
        { title: 'New', cardsHtml: ['<p>A</p>', '<p>B</p>'] },
        { title: 'Doing', cardsHtml: ['<p>C</p>'] },
      ],
      onCardMove: (payload) => moves.push(payload),
    });
    return { vm, moves };
  };

  it('moves a card across columns at the requested index and reports it', () => {
    const { vm, moves } = setup();
    assert.equal(vm.moveCard(0, 0, 1, 1), true);
    assert.deepEqual(vm.columns()[0].cardsHtml, ['<p>B</p>']);
    assert.deepEqual(vm.columns()[1].cardsHtml, ['<p>C</p>', '<p>A</p>']);
    assert.deepEqual(moves, [{ fromColumn: 0, fromIndex: 0, toColumn: 1, toIndex: 1 }]);
  });

  it('reorders within a column, clamps the target index and refuses bad sources', () => {
    const { vm, moves } = setup();
    assert.equal(vm.moveCard(0, 1, 0, 0), true);
    assert.deepEqual(vm.columns()[0].cardsHtml, ['<p>B</p>', '<p>A</p>']);
    assert.equal(vm.moveCard(0, 0, 1, 99), true);
    assert.equal(moves.at(-1).toIndex, 1, 'clamped to the end of the target column');
    assert.equal(vm.moveCard(0, 5, 1, 0), false);
    assert.equal(vm.moveCard(9, 0, 1, 0), false);
    assert.equal(moves.length, 2, 'failed moves do not report');
  });
});

describe('dialog behavior — show, backdrop, change reports', () => {
  function fakeDialog() {
    return {
      open: false,
      showModal() {
        this.open = true;
      },
      close() {
        this.open = false;
      },
      closest() {
        return this;
      },
    };
  }

  it('show opens through showModal once and reports; close reports back', () => {
    const dialog = fakeDialog();
    const changes = [];
    const vm = createDialogBehavior({ id: 'dlg', onChange: (open) => changes.push(open) });
    assert.equal(vm.idAttr(), 'dlg');
    vm.show(dialog);
    assert.equal(dialog.open, true);
    vm.show(dialog);
    assert.deepEqual(changes, [true], 'showing an open dialog is a no-op');
    assert.equal(vm.isOpen(dialog), true);
    vm.close(dialog);
    assert.equal(dialog.open, false);
    assert.deepEqual(changes, [true, false]);
  });

  it('a backdrop click closes; a content click does not', () => {
    const dialog = fakeDialog();
    const vm = createDialogBehavior({ id: 'dlg' });
    vm.show(dialog);
    vm.onBackdropClick({ target: { closest: () => dialog }, currentTarget: dialog });
    assert.equal(dialog.open, true, 'the click landed on content inside the dialog');
    vm.onBackdropClick({ target: dialog, currentTarget: dialog });
    assert.equal(dialog.open, false, 'target === currentTarget is the backdrop itself');
  });

  it('resolves the dialog from an invoker event and no-ops without a document', () => {
    const dialog = fakeDialog();
    const vm = createDialogBehavior({ onChange: () => {} });
    assert.equal(vm.idAttr(), false, 'no id prop, no id attribute');
    vm.show({ currentTarget: { closest: () => dialog } });
    assert.equal(dialog.open, true);
    vm.close();
    assert.equal(dialog.open, true, 'no element and no document: nothing to close, no throw');
  });
});

describe('toaster — ids, dismiss, auto-dismiss', () => {
  it('push returns deterministic ids and dismiss removes by id', () => {
    resetIds();
    const toaster = createToaster({ duration: 0 });
    const first = toaster.push({ message: 'One' });
    const second = toaster.push({ message: 'Two' });
    assert.equal(first, 'bn-toast-1');
    assert.equal(second, 'bn-toast-2');
    assert.equal(toaster.push({ id: 'mine', message: 'Three' }), 'mine');
    assert.equal(toaster.items().length, 3);
    toaster.dismiss(first);
    assert.deepEqual(
      toaster.items().map((item) => item.id),
      ['bn-toast-2', 'mine'],
    );
  });

  it('auto-dismisses after the item duration; duration 0 persists', async () => {
    const toaster = createToaster({ duration: 5 });
    toaster.push({ message: 'Quick' });
    const sticky = createToaster({ duration: 0 });
    sticky.push({ message: 'Sticky' });
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(toaster.items().length, 0);
    assert.equal(sticky.items().length, 1);
  });
});
