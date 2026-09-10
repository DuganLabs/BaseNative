import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { renderButton, buttonVariants } from './button.js';
import { renderInput } from './input.js';
import { renderTextarea } from './textarea.js';
import { renderCheckbox } from './checkbox.js';
import { renderRadioGroup } from './radio.js';
import { renderToggle } from './toggle.js';
import { renderSelect } from './select.js';
import { renderAlert } from './alert.js';
import { renderTable } from './table.js';
import { renderPagination } from './pagination.js';
import { renderBadge } from './badge.js';
import { renderCard } from './card.js';
import { renderProgress, renderSpinner } from './progress.js';
import { renderSkeleton } from './skeleton.js';
import { renderToastContainer } from './toast.js';
import { renderDialog } from './dialog.js';
import { renderDrawer } from './drawer.js';
import { renderTabs } from './tabs.js';
import { renderAccordion } from './accordion.js';
import { renderBreadcrumb } from './breadcrumb.js';
import { renderTooltip } from './tooltip.js';
import { renderDropdownMenu } from './dropdown-menu.js';
import { renderCommandPalette } from './command-palette.js';
import { renderCombobox } from './combobox.js';
import { renderMultiselect } from './multiselect.js';
import { renderDataGrid } from './datagrid.js';
import { renderTree, renderTreeGrid } from './tree.js';
import { renderVirtualList } from './virtualizer.js';
import { renderAvatar } from './avatar.js';
import { renderCalendar, renderPipelineBlock, renderPipeline, initCalendarDragDrop, initPipelineDragDrop } from './calendar.js';
import { renderLayoutGrid } from './layout-grid.js';
import { createToaster, showToast, dismissToast } from './toast.js';
import { nextId, resetIds } from './ids.js';
import * as api from './index.js';
import { bindDrag } from './internal/drag.js';
import { normalizeItem } from './internal/items.js';
import { describedBy, renderField } from './internal/field.js';
import { attrsSuffix } from './internal/attrs.js';

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
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); },
    querySelectorAll() { return []; },
  };
}

describe('Button', () => {
  it('renders a primary button', () => {
    const html = renderButton('Submit', { variant: 'primary' });
    assert.ok(html.includes('data-variant="primary"'));
    assert.ok(html.includes('Submit'));
    assert.ok(html.includes('<button'));
  });

  it('renders disabled button', () => {
    const html = renderButton('Save', { disabled: true });
    assert.ok(html.includes(' disabled'));
  });

  it('returns variant class string', () => {
    assert.equal(buttonVariants('destructive', 'sm'), 'bn-button bn-button--destructive bn-button--sm');
  });
});

describe('Input', () => {
  it('renders a text input with label', () => {
    const html = renderInput({ name: 'email', label: 'Email', type: 'email' });
    assert.ok(html.includes('type="email"'));
    assert.ok(html.includes('<label'));
    assert.ok(html.includes('Email'));
  });

  it('renders error state', () => {
    const html = renderInput({ name: 'name', error: 'Required' });
    assert.ok(html.includes('aria-invalid="true"'));
    assert.ok(html.includes('Required'));
    assert.ok(html.includes('role="alert"'));
  });
});

describe('Textarea', () => {
  it('renders a textarea', () => {
    const html = renderTextarea({ name: 'bio', label: 'Bio', rows: 5 });
    assert.ok(html.includes('<textarea'));
    assert.ok(html.includes('rows="5"'));
  });
});

describe('Checkbox', () => {
  it('renders a checkbox with label', () => {
    const html = renderCheckbox({ name: 'agree', label: 'I agree' });
    assert.ok(html.includes('type="checkbox"'));
    assert.ok(html.includes('I agree'));
  });
});

describe('Radio', () => {
  it('renders a radio group', () => {
    const html = renderRadioGroup({
      name: 'color',
      label: 'Pick a color',
      items: ['red', 'blue', 'green'],
      selected: 'blue',
    });
    assert.ok(html.includes('<fieldset'));
    assert.ok(html.includes('type="radio"'));
    assert.ok(html.includes('checked'));
  });
});

describe('Toggle', () => {
  it('renders a switch toggle', () => {
    const html = renderToggle({ name: 'dark', label: 'Dark mode' });
    assert.ok(html.includes('role="switch"'));
    assert.ok(html.includes('Dark mode'));
  });
});

describe('Select', () => {
  it('renders a select with options', () => {
    const html = renderSelect({
      name: 'country',
      label: 'Country',
      items: [{ value: 'us', label: 'USA' }, { value: 'uk', label: 'UK' }],
      selected: 'us',
    });
    assert.ok(html.includes('<select'));
    assert.ok(html.includes('selected'));
    assert.ok(html.includes('USA'));
  });
});

describe('Alert', () => {
  it('renders an info alert', () => {
    const html = renderAlert('Info message', { variant: 'info' });
    assert.ok(html.includes('data-variant="info"'));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('Info message'));
  });

  it('renders an error alert with role="alert"', () => {
    const html = renderAlert('Error!', { variant: 'error' });
    assert.ok(html.includes('role="alert"'));
  });

  it('renders dismissible alert', () => {
    const html = renderAlert('Dismiss me', { dismissible: true });
    assert.ok(html.includes('alert-dismiss'));
  });
});

describe('Table', () => {
  it('renders a data table', () => {
    const html = renderTable({
      columns: [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }],
      rows: [{ name: 'Alice', role: 'Admin' }],
    });
    assert.ok(html.includes('<table'));
    assert.ok(html.includes('Alice'));
    assert.ok(html.includes('Admin'));
  });

  it('renders empty state', () => {
    const html = renderTable({
      columns: [{ key: 'name', label: 'Name' }],
      rows: [],
      emptyMessage: 'No users found',
    });
    assert.ok(html.includes('No users found'));
  });
});

describe('Pagination', () => {
  it('renders pagination controls', () => {
    const html = renderPagination({ currentPage: 2, totalPages: 5 });
    assert.ok(html.includes('aria-label="Pagination"'));
    assert.ok(html.includes('aria-current="page"'));
    assert.ok(html.includes('rel="prev"'));
    assert.ok(html.includes('rel="next"'));
  });

  it('returns empty for single page', () => {
    assert.equal(renderPagination({ currentPage: 1, totalPages: 1 }), '');
  });
});

describe('Badge', () => {
  it('renders a badge', () => {
    const html = renderBadge('Active', { variant: 'success' });
    assert.ok(html.includes('data-variant="success"'));
    assert.ok(html.includes('Active'));
  });
});

describe('Card', () => {
  it('renders a card with sections', () => {
    const html = renderCard({ header: 'Title', body: 'Content', footer: 'Footer' });
    assert.ok(html.includes('<article'));
    assert.ok(html.includes('Title'));
    assert.ok(html.includes('Content'));
    assert.ok(html.includes('Footer'));
  });
});

describe('Progress', () => {
  it('renders a progress bar', () => {
    const html = renderProgress({ value: 75, max: 100 });
    assert.ok(html.includes('<progress'));
    assert.ok(html.includes('value="75"'));
    assert.ok(html.includes('75%'));
  });
});

describe('Spinner', () => {
  it('renders a spinner', () => {
    const html = renderSpinner({ label: 'Saving' });
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-label="Saving"'));
  });
});

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

describe('ToastContainer', () => {
  it('renders toast container', () => {
    const html = renderToastContainer('top-right');
    assert.ok(html.includes('data-bn="toast-container"'));
    assert.ok(html.includes('aria-live="polite"'));
  });
});

describe('Dialog', () => {
  it('renders a modal dialog', () => {
    const html = renderDialog({ title: 'Confirm', content: 'Are you sure?' });
    assert.ok(html.includes('<dialog'));
    assert.ok(html.includes('Confirm'));
    assert.ok(html.includes('Are you sure?'));
  });

  it('renders close button when closable', () => {
    const html = renderDialog({ closable: true });
    assert.ok(html.includes('dialog-close'));
  });

  it('omits close button when not closable', () => {
    const html = renderDialog({ closable: false });
    assert.ok(!html.includes('dialog-close'));
  });
});

describe('Drawer', () => {
  it('renders a drawer with position', () => {
    const html = renderDrawer({ title: 'Settings', position: 'left' });
    assert.ok(html.includes('data-position="left"'));
    assert.ok(html.includes('Settings'));
    assert.ok(html.includes('role="dialog"'));
  });
});

describe('Tabs', () => {
  it('renders tabs with panels', () => {
    const html = renderTabs({
      tabs: [
        { id: 'a', label: 'Tab A', content: 'Panel A' },
        { id: 'b', label: 'Tab B', content: 'Panel B' },
      ],
      activeTab: 'a',
    });
    assert.ok(html.includes('role="tablist"'));
    assert.ok(html.includes('role="tab"'));
    assert.ok(html.includes('role="tabpanel"'));
    assert.ok(html.includes('aria-selected="true"'));
    assert.ok(html.includes('Panel A'));
  });
});

describe('Accordion', () => {
  it('renders accordion with details/summary', () => {
    const html = renderAccordion({
      items: [
        { title: 'Section 1', content: 'Content 1', open: true },
        { title: 'Section 2', content: 'Content 2' },
      ],
    });
    assert.ok(html.includes('<details'));
    assert.ok(html.includes('<summary'));
    assert.ok(html.includes('Section 1'));
    assert.ok(html.includes(' open'));
  });
});

describe('Breadcrumb', () => {
  it('renders breadcrumb navigation', () => {
    const html = renderBreadcrumb({ items: [{ label: 'Home', href: '/' }, { label: 'Page' }] });
    assert.ok(html.includes('aria-label="Breadcrumb"'));
    assert.ok(html.includes('Home'));
    assert.ok(html.includes('Page'));
  });
});

describe('Tooltip', () => {
  it('renders tooltip with trigger', () => {
    const html = renderTooltip({ content: 'Help text', trigger: 'Hover me' });
    assert.ok(html.includes('data-bn="tooltip"'));
    assert.ok(html.includes('Help text'));
    assert.ok(html.includes('Hover me'));
  });
});

describe('DropdownMenu', () => {
  it('renders dropdown with items', () => {
    const html = renderDropdownMenu({
      trigger: 'Menu',
      items: [{ label: 'Edit', action: 'edit' }, { separator: true }, { label: 'Delete', action: 'delete' }],
    });
    assert.ok(html.includes('role="menu"'));
    assert.ok(html.includes('role="menuitem"'));
    assert.ok(html.includes('Edit'));
    assert.ok(html.includes('role="separator"'));
  });
});

describe('CommandPalette', () => {
  it('renders command palette', () => {
    const html = renderCommandPalette({
      commands: [{ label: 'Save', action: 'save', shortcut: '⌘S' }],
    });
    assert.ok(html.includes('<dialog'));
    assert.ok(html.includes('role="combobox"'));
    assert.ok(html.includes('Save'));
    assert.ok(html.includes('⌘S'));
  });
});

describe('Combobox', () => {
  it('renders combobox with datalist', () => {
    const html = renderCombobox({ name: 'fruit', items: ['Apple', 'Banana'] });
    assert.ok(html.includes('role="combobox"'));
    assert.ok(html.includes('<datalist'));
    assert.ok(html.includes('Apple'));
  });
});

describe('Multiselect', () => {
  it('renders multiselect with tags', () => {
    const html = renderMultiselect({
      name: 'tags',
      items: ['React', 'Vue', 'Svelte'],
      selected: ['React'],
    });
    assert.ok(html.includes('data-bn="multiselect"'));
    assert.ok(html.includes('data-bn="tag"'));
    assert.ok(html.includes('React'));
  });
});

describe('DataGrid', () => {
  it('renders a data grid with sorting', () => {
    const html = renderDataGrid({
      columns: [{ key: 'name', label: 'Name', sortable: true }],
      rows: [{ name: 'Alice' }],
      sortBy: 'name',
      sortDir: 'asc',
    });
    assert.ok(html.includes('role="grid"'));
    assert.ok(html.includes('data-sorted="asc"'));
    assert.ok(html.includes('aria-sort="ascending"'));
    assert.ok(html.includes('Alice'));
  });

  it('sortable headers are a real <button> inside the <th> — focusable and activatable with no client JS', () => {
    const html = renderDataGrid({
      columns: [{ key: 'name', label: 'Name', sortable: true }],
      rows: [],
    });
    assert.ok(html.includes('<th data-bn="datagrid-th" data-key="name" data-sortable scope="col"><button type="button" data-bn="datagrid-th-button">Name</button></th>'));
  });

  it('non-sortable headers stay plain text — no button wrapper', () => {
    const html = renderDataGrid({
      columns: [{ key: 'name', label: 'Name' }],
      rows: [],
    });
    assert.ok(html.includes('<th data-bn="datagrid-th" data-key="name" scope="col">Name</th>'));
    assert.ok(!html.includes('datagrid-th-button'));
  });

  it('renders selectable rows', () => {
    const html = renderDataGrid({
      columns: [{ key: 'name', label: 'Name' }],
      rows: [{ id: 1, name: 'Bob' }],
      selectable: true,
    });
    assert.ok(html.includes('Select all'));
    assert.ok(html.includes('Select row 1'));
  });
});

describe('Tree', () => {
  it('renders a tree view', () => {
    const html = renderTree({
      items: [
        { id: 'root', label: 'Root', children: [{ id: 'child', label: 'Child' }] },
      ],
      expanded: new Set(['root']),
    });
    assert.ok(html.includes('role="tree"'));
    assert.ok(html.includes('role="treeitem"'));
    assert.ok(html.includes('Root'));
    assert.ok(html.includes('Child'));
  });
});

describe('TreeGrid', () => {
  it('renders a tree grid', () => {
    const html = renderTreeGrid({
      columns: [{ key: 'name', label: 'Name' }],
      items: [{ name: 'Parent', children: [{ name: 'Child' }] }],
      expanded: new Set(['Parent']),
    });
    assert.ok(html.includes('role="treegrid"'));
    assert.ok(html.includes('Parent'));
    assert.ok(html.includes('Child'));
  });
});

describe('VirtualList', () => {
  it('renders a virtual scroll container', () => {
    const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
    const html = renderVirtualList({ items, itemHeight: 40, containerHeight: 200 });
    assert.ok(html.includes('data-bn="virtualizer"'));
    assert.ok(html.includes('data-total="100"'));
    assert.ok(html.includes('height:4000px'));
  });
});

describe('Avatar', () => {
  it('renders an avatar', () => {
    const html = renderAvatar({ name: 'Jane Doe', src: '/img/jane.jpg' });
    assert.ok(html.includes('data-bn="avatar"'));
    assert.ok(html.includes('Jane Doe'));
  });
});

describe('Select — additional', () => {
  it('marks selected option', () => {
    const html = renderSelect({ name: 'country', items: ['US', 'CA', 'MX'], selected: 'CA' });
    assert.ok(html.includes('value="CA" selected'));
  });

  it('renders required and disabled attributes', () => {
    const html = renderSelect({ name: 'size', items: [], required: true, disabled: true });
    assert.ok(html.includes(' required'));
    assert.ok(html.includes(' disabled'));
  });

  it('renders error message and aria-invalid', () => {
    const html = renderSelect({ name: 'lang', items: [], error: 'Please select a language' });
    assert.ok(html.includes('aria-invalid="true"'));
    assert.ok(html.includes('Please select a language'));
  });

  it('renders placeholder option when not selected', () => {
    const html = renderSelect({ name: 'size', items: ['S', 'M'], placeholder: 'Pick a size', selected: '' });
    assert.ok(html.includes('Pick a size'));
    assert.ok(html.includes('disabled'));
    assert.ok(html.includes('selected')); // placeholder should be selected
  });
});

describe('Alert — additional', () => {
  it('renders success variant', () => {
    const html = renderAlert('All good!', { variant: 'success' });
    assert.ok(html.includes('All good!'));
    assert.ok(html.includes('data-variant="success"'));
  });

  it('renders warning variant with role="alert"', () => {
    const html = renderAlert('Watch out', { variant: 'warning' });
    assert.ok(html.includes('role="alert"'));
    assert.ok(html.includes('Watch out'));
  });
});

describe('Dialog — additional', () => {
  it('renders with custom id', () => {
    const html = renderDialog({ title: 'Confirm', content: 'Are you sure?', id: 'confirm-dialog' });
    assert.ok(html.includes('confirm-dialog'));
  });

  it('renders footer content', () => {
    const html = renderDialog({
      title: 'Delete',
      content: 'This is irreversible.',
      footer: '<button>Cancel</button><button>Delete</button>',
    });
    assert.ok(html.includes('Cancel'));
    assert.ok(html.includes('data-bn="dialog-footer"'));
  });
});

describe('Breadcrumb — additional', () => {
  it('last item is aria-current="page"', () => {
    const html = renderBreadcrumb({
      items: [
        { label: 'Home', href: '/' },
        { label: 'Docs', href: '/docs' },
        { label: 'API' },
      ],
    });
    assert.ok(html.includes('aria-current="page"'));
    assert.ok(html.includes('API'));
  });
});

describe('Tabs — additional', () => {
  it('active tab panel is visible', () => {
    const html = renderTabs({
      tabs: [
        { id: 'a', label: 'Alpha', content: '<p>Alpha content</p>' },
        { id: 'b', label: 'Beta', content: '<p>Beta content</p>' },
      ],
      activeTab: 'a',
    });
    assert.ok(html.includes('Alpha content'));
    assert.ok(html.includes('aria-selected'));
  });
});

describe('Tooltip — additional', () => {
  it('includes tooltip content and trigger', () => {
    const html = renderTooltip({ trigger: 'Hover me', content: 'More info' });
    assert.ok(html.includes('More info'));
    assert.ok(html.includes('Hover me'));
    assert.ok(html.includes('role="tooltip"'));
  });
});

describe('buttonVariants — additional', () => {
  it('generates secondary variant class', () => {
    const cls = buttonVariants('secondary', 'sm');
    assert.ok(cls.includes('secondary'));
    assert.ok(cls.includes('sm'));
  });

  it('generates destructive variant class', () => {
    const cls = buttonVariants('destructive');
    assert.ok(cls.includes('destructive'));
  });
});

describe('Input — additional', () => {
  it('renders required and disabled attributes', () => {
    const html = renderInput({ name: 'email', required: true, disabled: true });
    assert.ok(html.includes(' required'));
    assert.ok(html.includes(' disabled'));
  });

  it('renders help text with aria-describedby', () => {
    const html = renderInput({ name: 'email', helpText: 'Enter your email' });
    assert.ok(html.includes('Enter your email'));
    assert.ok(html.includes('aria-describedby'));
    assert.ok(html.includes('data-bn="field-help"'));
  });

  it('renders placeholder attribute', () => {
    const html = renderInput({ name: 'search', placeholder: 'Search...' });
    assert.ok(html.includes('placeholder="Search..."'));
  });

  it('renders with existing value', () => {
    const html = renderInput({ name: 'name', value: 'Alice' });
    assert.ok(html.includes('value="Alice"'));
  });

  it('escapes HTML in value attribute', () => {
    const html = renderInput({ name: 'q', value: '<script>' });
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script'));
  });
});

describe('Pagination — additional', () => {
  it('on first page, prev is disabled', () => {
    const html = renderPagination({ currentPage: 1, totalPages: 5 });
    assert.ok(html.includes('aria-disabled="true"'));
    assert.ok(html.includes('rel="next"'));
    assert.ok(!html.includes('rel="prev"'));
  });

  it('on last page, next is disabled', () => {
    const html = renderPagination({ currentPage: 5, totalPages: 5 });
    assert.ok(html.includes('rel="prev"'));
    assert.ok(!html.includes('rel="next"'));
  });

  it('includes baseUrl in page links', () => {
    const html = renderPagination({ currentPage: 2, totalPages: 3, baseUrl: '/posts' });
    assert.ok(html.includes('/posts?page='));
  });
});

describe('Avatar — additional', () => {
  it('renders initials when no src', () => {
    const html = renderAvatar({ name: 'John Doe' });
    assert.ok(html.includes('JD'));
    assert.ok(html.includes('data-bn="avatar-initials"'));
  });

  it('uses ? when no name and no src', () => {
    const html = renderAvatar({});
    assert.ok(html.includes('?'));
  });

  it('renders custom size and shape', () => {
    const html = renderAvatar({ name: 'AB', size: 'lg', shape: 'square' });
    assert.ok(html.includes('data-size="lg"'));
    assert.ok(html.includes('data-shape="square"'));
  });
});

describe('Badge — additional', () => {
  it('badge content is an HTML slot and renders markup', () => {
    const html = renderBadge('<b>bold</b>');
    assert.ok(html.includes('<b>bold</b>'));
  });

  it('renders default variant when none given', () => {
    const html = renderBadge('New');
    assert.ok(html.includes('data-variant="default"'));
  });
});

describe('VirtualList — additional', () => {
  it('renders custom renderItem function', () => {
    const html = renderVirtualList({
      items: ['alpha', 'beta'],
      itemHeight: 30,
      containerHeight: 100,
      renderItem: (item) => `<li>${item}</li>`,
    });
    assert.ok(html.includes('<li>alpha</li>'));
    assert.ok(html.includes('<li>beta</li>'));
  });

  it('includes container height in style', () => {
    const html = renderVirtualList({ items: [], itemHeight: 40, containerHeight: 300 });
    assert.ok(html.includes('height:300px'));
  });
});

describe('Checkbox — additional', () => {
  it('renders checked state', () => {
    const html = renderCheckbox({ name: 'agree', label: 'Yes', checked: true });
    assert.ok(html.includes(' checked'));
  });

  it('renders disabled state', () => {
    const html = renderCheckbox({ name: 'terms', label: 'Terms', disabled: true });
    assert.ok(html.includes(' disabled'));
  });
});

describe('Textarea — additional', () => {
  it('renders error state', () => {
    const html = renderTextarea({ name: 'bio', error: 'Too short' });
    assert.ok(html.includes('aria-invalid="true"'));
    assert.ok(html.includes('Too short'));
  });

  it('renders placeholder', () => {
    const html = renderTextarea({ name: 'note', placeholder: 'Enter note...' });
    assert.ok(html.includes('placeholder="Enter note..."'));
  });
});

describe('Calendar', () => {
  it('renders a weekly grid', () => {
    const html = renderCalendar({ startDate: '2025-06-02' });
    assert.ok(html.includes('data-bn="calendar"'));
    assert.ok(html.includes('data-bn="calendar-grid"'));
  });

  it('renders day headers for 7 days', () => {
    const html = renderCalendar({ startDate: '2025-06-02' });
    assert.ok(html.includes('data-bn="calendar-day-header"'));
    assert.ok(html.includes('data-date="2025-06-02"'));
    assert.ok(html.includes('data-date="2025-06-08"'));
  });

  it('renders events in the correct column', () => {
    const html = renderCalendar({
      startDate: '2025-06-02',
      events: [
        { id: 'j1', title: 'Fix wiring', start: '2025-06-03T09:00', end: '2025-06-03T11:00' },
      ],
    });
    assert.ok(html.includes('data-event-id="j1"'));
    assert.ok(html.includes('Fix wiring'));
    assert.ok(html.includes('draggable="true"'));
  });

  it('renders event status attributes', () => {
    const html = renderCalendar({
      startDate: '2025-06-02',
      events: [
        { id: 'j2', title: 'HVAC', start: '2025-06-02T14:00', end: '2025-06-02T16:00', status: 'in_progress' },
      ],
    });
    assert.ok(html.includes('data-status="in_progress"'));
  });

  it('renders empty message when no events', () => {
    const html = renderCalendar({ startDate: '2025-06-02', emptyMessage: 'Nothing scheduled' });
    assert.ok(html.includes('Nothing scheduled'));
  });

  it('renders time gutter labels', () => {
    const html = renderCalendar({ startDate: '2025-06-02', hours: { start: 8, end: 17 } });
    assert.ok(html.includes('data-bn="calendar-time-label"'));
  });

  it('renders drop zone slots', () => {
    const html = renderCalendar({ startDate: '2025-06-02' });
    assert.ok(html.includes('data-bn="calendar-slot"'));
  });
});

describe('PipelineBlock', () => {
  it('renders a draggable block', () => {
    const html = renderPipelineBlock({ id: 'opp-1', title: 'New Lead' });
    assert.ok(html.includes('data-bn="pipeline-block"'));
    assert.ok(html.includes('draggable="true"'));
    assert.ok(html.includes('data-block-id="opp-1"'));
    assert.ok(html.includes('New Lead'));
  });

  it('renders subtitle and status', () => {
    const html = renderPipelineBlock({ id: 'opp-2', title: 'Job', subtitle: '$1,500', status: 'qualified' });
    assert.ok(html.includes('$1,500'));
    assert.ok(html.includes('data-status="qualified"'));
  });
});

describe('Pipeline', () => {
  it('renders a pipeline container', () => {
    const html = renderPipeline({
      columns: [{ id: 'new', title: 'New Leads' }],
      cards: [],
    });
    assert.ok(html.includes('data-bn="pipeline"'));
  });

  it('renders columns with headers', () => {
    const html = renderPipeline({
      columns: [
        { id: 'new', title: 'New Leads' },
        { id: 'qualified', title: 'Qualified' },
      ],
      cards: [],
    });
    assert.ok(html.includes('data-bn="pipeline-column"'));
    assert.ok(html.includes('data-column-id="new"'));
    assert.ok(html.includes('data-column-id="qualified"'));
    assert.ok(html.includes('New Leads'));
    assert.ok(html.includes('Qualified'));
  });

  it('renders cards in columns', () => {
    const html = renderPipeline({
      columns: [{ id: 'new', title: 'New' }],
      cards: [
        { id: 'c1', columnId: 'new', title: 'Acme Corp' },
        { id: 'c2', columnId: 'new', title: 'Tech Startup' },
      ],
    });
    assert.ok(html.includes('data-bn="pipeline-card"'));
    assert.ok(html.includes('data-card-id="c1"'));
    assert.ok(html.includes('data-card-id="c2"'));
    assert.ok(html.includes('draggable="true"'));
    assert.ok(html.includes('Acme Corp'));
    assert.ok(html.includes('Tech Startup'));
  });

  it('renders card subtitles and descriptions', () => {
    const html = renderPipeline({
      columns: [{ id: 'new', title: 'New' }],
      cards: [
        {
          id: 'c1',
          columnId: 'new',
          title: 'Acme',
          subtitle: '$50k',
          description: 'Enterprise customer',
        },
      ],
    });
    assert.ok(html.includes('data-bn="pipeline-card-title"'));
    assert.ok(html.includes('data-bn="pipeline-card-subtitle"'));
    assert.ok(html.includes('data-bn="pipeline-card-description"'));
    assert.ok(html.includes('$50k'));
    assert.ok(html.includes('Enterprise customer'));
  });

  it('renders empty message when no cards', () => {
    const html = renderPipeline({
      columns: [{ id: 'new', title: 'New' }],
      cards: [],
      emptyMessage: 'No leads yet',
    });
    assert.ok(html.includes('No leads yet'));
  });

  it('distributes cards to correct columns', () => {
    const html = renderPipeline({
      columns: [
        { id: 'new', title: 'New' },
        { id: 'qualified', title: 'Qualified' },
      ],
      cards: [
        { id: 'c1', columnId: 'new', title: 'Lead 1' },
        { id: 'c2', columnId: 'qualified', title: 'Lead 2' },
      ],
    });
    // Both cards should be in the HTML, but in their respective columns
    assert.ok(html.includes('Lead 1'));
    assert.ok(html.includes('Lead 2'));
    assert.ok(html.includes('data-column-id="new"'));
    assert.ok(html.includes('data-column-id="qualified"'));
  });

  it('renders card status attribute', () => {
    const html = renderPipeline({
      columns: [{ id: 'new', title: 'New' }],
      cards: [{ id: 'c1', columnId: 'new', title: 'Lead', status: 'hot' }],
    });
    assert.ok(html.includes('data-status="hot"'));
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

  it('two renders after resetIds() produce identical markup', () => {
    const page = () => [
      renderDialog({ title: 'A' }),
      renderTabs({ tabs: [{ id: 'a', label: 'A' }] }),
      renderTree({ items: [{ label: 'root', children: [{ label: 'leaf' }] }] }),
      renderAccordion({ items: [{ title: 'S' }] }),
      renderDrawer({}),
      renderTooltip({ content: 'c', trigger: 't' }),
      renderDropdownMenu({ trigger: 'm', items: [] }),
      renderCommandPalette({}),
      renderCombobox({}),
      renderMultiselect({}),
      renderDataGrid({}),
      renderTreeGrid({}),
      renderVirtualList({}),
      renderCalendar({ startDate: '2025-06-02' }),
      renderPipeline({}),
    ].join('');
    resetIds();
    const first = page();
    resetIds();
    const second = page();
    assert.equal(first, second);
    assert.ok(first.includes('id="bn-dialog-1"'));
    assert.ok(!/[0-9a-z]{8,}/.test(first.match(/id="bn-[a-z]+-[^"]+"/)[0].slice(4, -1).replace(/bn-[a-z]+-/, '')));
  });

  it('every renderer honours an explicit id option', () => {
    const renders = [
      renderDialog({ id: 'custom' }),
      renderDrawer({ id: 'custom' }),
      renderTabs({ id: 'custom' }),
      renderAccordion({ id: 'custom' }),
      renderTooltip({ id: 'custom', content: '', trigger: '' }),
      renderDropdownMenu({ id: 'custom', trigger: '' }),
      renderCommandPalette({ id: 'custom' }),
      renderCombobox({ id: 'custom', name: 'n' }),
      renderMultiselect({ id: 'custom', name: 'n' }),
      renderDataGrid({ id: 'custom' }),
      renderTree({ id: 'custom' }),
      renderTreeGrid({ id: 'custom' }),
      renderVirtualList({ id: 'custom' }),
      renderCalendar({ id: 'custom', startDate: '2025-06-02' }),
      renderPipeline({ id: 'custom' }),
      renderLayoutGrid({ id: 'custom' }),
      renderInput({ id: 'custom', name: 'n' }),
      renderTextarea({ id: 'custom', name: 'n' }),
      renderSelect({ id: 'custom', name: 'n' }),
      renderCheckbox({ id: 'custom', name: 'n' }),
      renderToggle({ id: 'custom', name: 'n' }),
    ];
    for (const html of renders) {
      assert.ok(html.includes('id="custom"'), html.slice(0, 80));
      assert.ok(!/id="bn-/.test(html), 'generated id leaked despite explicit id');
    }
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
    assert.deepEqual(normalizeItem({ value: 'v', label: 'L', disabled: true }), { value: 'v', label: 'L', disabled: true });
  });

  it('describedBy lists help and error ids', () => {
    assert.equal(describedBy('f', '', ''), '');
    assert.equal(describedBy('f', 'h', ''), ' aria-describedby="f-help"');
    assert.equal(describedBy('f', '', 'e'), ' aria-describedby="f-error"');
    assert.equal(describedBy('f', 'h', 'e'), ' aria-describedby="f-help f-error"');
  });

  it('renderField escapes label, help and error', () => {
    const html = renderField({ id: 'f', label: XSS, control: '<i></i>', helpText: XSS, error: XSS });
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

  it('no renderer leaks a stray space before the closing bracket', () => {
    const renders = [
      renderButton('x'),
      renderDialog({}),
      renderDrawer({}),
      renderTabs({}),
      renderAccordion({}),
      renderBreadcrumb({}),
      renderAvatar({}),
      renderTooltip({}),
      renderDropdownMenu({}),
      renderCommandPalette({}),
      renderCombobox({}),
      renderMultiselect({}),
      renderDataGrid({}),
      renderTree({}),
      renderTreeGrid({}),
      renderVirtualList({}),
      renderCalendar({ startDate: '2025-06-02' }),
      renderPipelineBlock({ id: 'p', title: 't' }),
      renderPipeline({}),
    ];
    for (const html of renders) {
      assert.ok(!/" >/.test(html), html.slice(0, 80));
    }
  });
});

describe('Button — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderButton('Go');
    assert.equal(html, '<button data-bn="button" data-variant="primary" data-size="default" type="button">Go</button>');
  });

  it('renders with all options', () => {
    const html = renderButton('Go', { variant: 'ghost', size: 'sm', disabled: true, type: 'submit', attrs: 'data-x="1"' });
    assert.ok(html.includes('data-variant="ghost"'));
    assert.ok(html.includes('data-size="sm"'));
    assert.ok(html.includes('type="submit" disabled data-x="1">'));
  });

  it('escapes attribute options', () => {
    assertEscaped(renderButton('Go', { variant: XSS, size: XSS, type: XSS }));
  });

  it('content is an HTML slot', () => {
    assert.ok(renderButton('<em>Go</em>').includes('<em>Go</em>'));
  });
});

describe('Input — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderInput({ name: 'q' });
    assert.ok(html.startsWith('<div data-bn="field"><input data-bn="input" type="text" id="q" name="q"'));
    assert.ok(!html.includes('<label'));
    assert.ok(!html.includes('aria-describedby'));
  });

  it('renders with all options', () => {
    const html = renderInput({
      name: 'q', type: 'search', label: 'Q', placeholder: 'p', value: 'v', required: true, disabled: true,
      helpText: 'h', error: 'e', id: 'qid', attrs: 'data-x="1"',
    });
    assert.ok(html.includes('<label for="qid">Q</label>'));
    assert.ok(html.includes('type="search"'));
    assert.ok(html.includes('value="v"'));
    assert.ok(html.includes('placeholder="p"'));
    assert.ok(html.includes(' required disabled'));
    assert.ok(html.includes('aria-invalid="true" data-x="1" />'));
  });

  it('escapes attributes and text fields', () => {
    assertEscaped(renderInput({ name: XSS, type: XSS, label: XSS, placeholder: XSS, value: XSS, helpText: XSS, error: XSS, id: XSS }));
  });

  it('help and error get distinct ids and aria-describedby lists both', () => {
    const html = renderInput({ name: 'email', helpText: 'h', error: 'e' });
    assert.ok(html.includes('id="email-help"'));
    assert.ok(html.includes('id="email-error"'));
    assert.ok(html.includes('aria-describedby="email-help email-error"'));
  });

  it('aria-describedby points only at the help span when there is no error', () => {
    const html = renderInput({ name: 'email', helpText: 'h' });
    assert.ok(html.includes('aria-describedby="email-help"'));
    assert.ok(!html.includes('email-error'));
  });

  it('aria-describedby points only at the error span when there is no help', () => {
    const html = renderInput({ name: 'email', error: 'e' });
    assert.ok(html.includes('aria-describedby="email-error"'));
    assert.ok(html.includes('role="alert"'));
    assert.ok(!html.includes('email-help'));
  });
});

describe('Textarea — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderTextarea({ name: 'bio' });
    assert.ok(html.includes('<textarea data-bn="textarea" id="bio" name="bio" rows="3" placeholder=""></textarea>'));
  });

  it('renders with all options', () => {
    const html = renderTextarea({
      name: 'bio', label: 'Bio', placeholder: 'p', value: 'v', rows: 8, required: true, disabled: true,
      helpText: 'h', error: 'e', id: 'b', attrs: 'data-x="1"',
    });
    assert.ok(html.includes('<label for="b">Bio</label>'));
    assert.ok(html.includes('rows="8"'));
    assert.ok(html.includes(' required disabled aria-describedby="b-help b-error" aria-invalid="true" data-x="1">v</textarea>'));
  });

  it('escapes attributes and text fields', () => {
    assertEscaped(renderTextarea({ name: XSS, label: XSS, placeholder: XSS, value: XSS, helpText: XSS, error: XSS }));
  });

  it('emits aria-describedby and an error id like renderInput', () => {
    const html = renderTextarea({ name: 'bio', helpText: 'h', error: 'e' });
    assert.ok(html.includes('aria-describedby="bio-help bio-error"'));
    assert.ok(html.includes('<span data-bn="field-error" id="bio-error" role="alert">e</span>'));
  });

  it('escapes the value as text content', () => {
    const html = renderTextarea({ name: 'bio', value: '</textarea><b>' });
    assert.ok(html.includes('&lt;/textarea&gt;&lt;b&gt;'));
  });
});

describe('Checkbox — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderCheckbox({ name: 'agree' });
    assert.equal(html, '<label data-bn="checkbox-label"><input data-bn="checkbox" type="checkbox" id="agree" name="agree" /><span></span></label>');
  });

  it('renders with all options', () => {
    const html = renderCheckbox({ name: 'agree', label: 'Yes', checked: true, disabled: true, value: 'on', id: 'a', attrs: 'data-x="1"' });
    assert.ok(html.includes('<label data-bn="checkbox-label" data-x="1">'));
    assert.ok(html.includes('id="a" name="agree" value="on" checked disabled'));
    assert.ok(html.includes('<span>Yes</span>'));
  });

  it('escapes attributes and label, including < in the label', () => {
    assertEscaped(renderCheckbox({ name: XSS, label: XSS, value: XSS, id: XSS }));
    assert.ok(renderCheckbox({ name: 'a', label: '<b>' }).includes('&lt;b&gt;'));
  });

  it('associates the label by wrapping the input', () => {
    const html = renderCheckbox({ name: 'a', label: 'L' });
    assert.ok(/^<label[^>]*><input/.test(html));
  });
});

describe('Radio — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderRadioGroup({ name: 'c' });
    assert.equal(html, '<fieldset data-bn="radio-group"></fieldset>');
  });

  it('renders with all options', () => {
    const html = renderRadioGroup({
      name: 'c', label: 'Color', items: [{ value: 'r', label: 'Red', disabled: true }, 'blue'],
      selected: 'blue', disabled: false, attrs: 'data-x="1"',
    });
    assert.ok(html.includes('<fieldset data-bn="radio-group" data-x="1">'));
    assert.ok(html.includes('<legend>Color</legend>'));
    assert.ok(html.includes('id="c-r" name="c" value="r" disabled'));
    assert.ok(html.includes('id="c-blue" name="c" value="blue" checked'));
  });

  it('group disabled disables every item', () => {
    const html = renderRadioGroup({ name: 'c', items: ['a', 'b'], disabled: true });
    assert.equal((html.match(/ disabled/g) || []).length, 2);
  });

  it('escapes attributes and labels', () => {
    assertEscaped(renderRadioGroup({ name: XSS, label: XSS, items: [{ value: XSS, label: XSS }] }));
  });

  it('string and object items render identically', () => {
    const a = renderRadioGroup({ name: 'c', items: ['x'] });
    const b = renderRadioGroup({ name: 'c', items: [{ value: 'x', label: 'x' }] });
    assert.equal(a, b);
  });
});

describe('Toggle — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderToggle({ name: 'dark' });
    assert.equal(html, '<label data-bn="toggle-label"><input data-bn="toggle" type="checkbox" role="switch" id="dark" name="dark" /><span></span></label>');
  });

  it('renders with all options', () => {
    const html = renderToggle({ name: 'dark', label: 'Dark', checked: true, disabled: true, id: 'd', attrs: 'data-x="1"' });
    assert.ok(html.includes('<label data-bn="toggle-label" data-x="1">'));
    assert.ok(html.includes('id="d" name="dark" checked disabled'));
    assert.ok(html.includes('<span>Dark</span>'));
  });

  it('escapes attributes and label', () => {
    assertEscaped(renderToggle({ name: XSS, label: XSS, id: XSS }));
  });

  it('keeps role="switch" on the checkbox', () => {
    assert.ok(renderToggle({ name: 'x' }).includes('type="checkbox" role="switch"'));
  });
});

describe('Select — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderSelect({ name: 's' });
    assert.equal(html, '<div data-bn="field"><select data-bn="select" id="s" name="s"></select></div>');
  });

  it('renders with all options', () => {
    const html = renderSelect({
      name: 's', label: 'S', items: [{ value: 'a', label: 'A', disabled: true }, 'b'], selected: 'b', placeholder: 'Pick',
      required: true, disabled: true, helpText: 'h', error: 'e', id: 'sid', attrs: 'data-x="1"',
    });
    assert.ok(html.includes('<label for="sid">S</label>'));
    assert.ok(html.includes(' required disabled aria-describedby="sid-help sid-error" aria-invalid="true" data-x="1">'));
    assert.ok(html.includes('<option value="" disabled>Pick</option>'));
    assert.ok(html.includes('<option value="a" disabled>A</option>'));
    assert.ok(html.includes('<option value="b" selected>b</option>'));
    assert.ok(html.includes('id="sid-help"'));
    assert.ok(html.includes('id="sid-error"'));
  });

  it('escapes attributes, options and text fields', () => {
    assertEscaped(renderSelect({ name: XSS, label: XSS, placeholder: XSS, error: XSS, helpText: XSS, items: [{ value: XSS, label: XSS }] }));
  });

  it('error span has an id and aria-describedby references it', () => {
    const html = renderSelect({ name: 's', error: 'Required' });
    assert.ok(html.includes('aria-describedby="s-error"'));
    assert.ok(html.includes('<span data-bn="field-error" id="s-error" role="alert">Required</span>'));
  });

  it('string and object items render identically', () => {
    assert.equal(renderSelect({ name: 's', items: ['x'] }), renderSelect({ name: 's', items: [{ value: 'x', label: 'x' }] }));
  });
});

describe('Alert — hardening', () => {
  it('renders with minimal options', () => {
    assert.equal(renderAlert('Hi'), '<div data-bn="alert" data-variant="info" role="status"><span data-bn="alert-content">Hi</span></div>');
  });

  it('escapes the variant attribute', () => {
    assertEscaped(renderAlert('Hi', { variant: XSS }));
  });

  it('content is an HTML slot', () => {
    assert.ok(renderAlert('<a href="/x">link</a>').includes('<a href="/x">link</a>'));
  });
});

describe('Badge — hardening', () => {
  it('renders with minimal options', () => {
    assert.equal(renderBadge('New'), '<span data-bn="badge" data-variant="default">New</span>');
  });

  it('escapes the variant attribute', () => {
    assertEscaped(renderBadge('New', { variant: XSS }));
  });
});

describe('Card — hardening', () => {
  it('renders with minimal options', () => {
    assert.equal(renderCard(), '<article data-bn="card" data-variant="default"><div data-bn="card-body"></div></article>');
  });

  it('escapes the variant attribute', () => {
    assertEscaped(renderCard({ variant: XSS }));
  });

  it('header, body and footer are HTML slots', () => {
    const html = renderCard({ header: '<h2>H</h2>', body: '<p>B</p>', footer: '<button>F</button>' });
    assert.ok(html.includes('<header data-bn="card-header"><h2>H</h2></header>'));
    assert.ok(html.includes('<div data-bn="card-body"><p>B</p></div>'));
    assert.ok(html.includes('<footer data-bn="card-footer"><button>F</button></footer>'));
  });
});

describe('Table — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderTable();
    assert.ok(html.includes('<td colspan="0" data-bn="table-empty">No data</td>'));
  });

  it('renders with all options', () => {
    const html = renderTable({
      columns: [{ key: 'a', label: 'A', sortable: true }, { key: 'b', label: 'B' }],
      rows: [{ a: 1, b: null }],
      caption: 'Cap',
      emptyMessage: 'none',
    });
    assert.ok(html.includes('<caption>Cap</caption>'));
    assert.ok(html.includes('<th scope="col" data-sortable>A</th>'));
    assert.ok(html.includes('<td>1</td><td></td>'));
  });

  it('escapes caption, labels, cells and empty message', () => {
    assertEscaped(renderTable({ columns: [{ key: 'a', label: XSS }], rows: [{ a: XSS }], caption: XSS }));
    assertEscaped(renderTable({ columns: [{ key: 'a', label: 'A' }], rows: [], emptyMessage: XSS }));
  });

  it('header cells carry scope="col"', () => {
    assert.ok(renderTable({ columns: [{ key: 'a', label: 'A' }] }).includes('scope="col"'));
  });
});

describe('Pagination — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderPagination({ totalPages: 2 });
    assert.ok(html.includes('<a href="?page=1" aria-current="page" data-active>1</a>'));
    assert.ok(html.includes('<a href="?page=2">2</a>'));
  });

  it('renders with all options and ellipses', () => {
    const html = renderPagination({ currentPage: 10, totalPages: 20, baseUrl: '/p?x=1', window: 1 });
    assert.ok(html.includes('href="/p?x=1&amp;page=9"'));
    assert.ok(html.includes('data-bn="pagination-ellipsis"'));
    assert.ok(html.includes('>20</a>'));
  });

  it('escapes the base url', () => {
    assertEscaped(renderPagination({ currentPage: 1, totalPages: 3, baseUrl: XSS }));
  });

  it('labels prev/next links for assistive tech', () => {
    const html = renderPagination({ currentPage: 2, totalPages: 3 });
    assert.ok(html.includes('aria-label="Previous page"'));
    assert.ok(html.includes('aria-label="Next page"'));
    assert.ok(html.includes('aria-label="Pagination"'));
  });
});

describe('Progress — hardening', () => {
  it('renders with minimal options', () => {
    assert.equal(renderProgress(), '<progress data-bn="progress" value="0" max="100">0%</progress>');
  });

  it('renders with all options', () => {
    const html = renderProgress({ value: 1, max: 4, label: 'Upload', attrs: 'data-x="1"' });
    assert.equal(html, '<progress data-bn="progress" value="1" max="4" aria-label="Upload" data-x="1">25%</progress>');
  });

  it('escapes the label and numeric attributes', () => {
    assertEscaped(renderProgress({ label: XSS, value: XSS, max: 100 }));
  });

  it('guards division by zero when max is 0', () => {
    const html = renderProgress({ value: 5, max: 0 });
    assert.ok(html.includes('>0%</progress>'));
    assert.ok(!html.includes('NaN'));
  });
});

describe('Spinner — hardening', () => {
  it('renders with minimal options', () => {
    assert.equal(renderSpinner(), '<span data-bn="spinner" data-size="default" role="status" aria-label="Loading"><span aria-hidden="true"></span></span>');
  });

  it('escapes label and size', () => {
    assertEscaped(renderSpinner({ label: XSS, size: XSS }));
  });

  it('has role="status" for live announcement', () => {
    assert.ok(renderSpinner({ size: 'lg' }).includes('role="status"'));
  });
});

describe('Skeleton — hardening', () => {
  it('renders with minimal options', () => {
    assert.equal(renderSkeleton(), '<div data-bn="skeleton" data-variant="text" style="width:100%;height:1rem" aria-hidden="true"></div>');
  });

  it('escapes width, height and variant', () => {
    assertEscaped(renderSkeleton({ width: XSS, height: XSS, variant: XSS }));
  });

  it('count 1 and count 3 use the same markup per placeholder', () => {
    const one = renderSkeleton({ width: '2rem' });
    assert.equal(renderSkeleton({ width: '2rem', count: 3 }), one + one + one);
  });
});

describe('Toast — hardening', () => {
  it('escapes the container position', () => {
    assertEscaped(renderToastContainer(XSS));
  });

  it('showToast returns a deterministic id and queues the toast', () => {
    resetIds();
    const toaster = createToaster({ duration: 0 });
    const id = showToast(toaster, { message: 'hi', duration: 0 });
    assert.equal(id, 'bn-toast-1');
    assert.equal(toaster.toasts()[0].message, 'hi');
  });

  it('showToast honours an explicit id', () => {
    const toaster = createToaster();
    assert.equal(showToast(toaster, { id: 'mine', duration: 0 }), 'mine');
  });

  it('dismissToast removes a toast by id', () => {
    const toaster = createToaster();
    const id = showToast(toaster, { duration: 0 });
    dismissToast(toaster, id);
    assert.equal(toaster.toasts().length, 0);
  });
});

describe('Dialog — hardening', () => {
  it('renders with minimal options', () => {
    resetIds();
    const html = renderDialog();
    assert.ok(html.startsWith('<dialog data-bn="dialog" data-size="default" id="bn-dialog-1" aria-modal="true" data-modal="true">'));
    assert.ok(!html.includes('dialog-title'));
    assert.ok(!html.includes('dialog-footer'));
  });

  it('renders with all options', () => {
    const html = renderDialog({ title: 'T', content: 'C', open: true, modal: false, closable: false, size: 'lg', footer: 'F', id: 'd', attrs: 'data-x="1"' });
    assert.ok(html.includes('data-size="lg" id="d" open data-modal="false" data-x="1">'));
    assert.ok(html.includes('<h2 data-bn="dialog-title">T</h2>'));
    assert.ok(!html.includes('dialog-close'));
    assert.ok(html.includes('<div data-bn="dialog-footer">F</div>'));
  });

  it('escapes title, size and id', () => {
    assertEscaped(renderDialog({ title: XSS, size: XSS, id: XSS }));
  });

  it('content and footer are HTML slots', () => {
    const html = renderDialog({ content: '<form></form>', footer: '<button>Ok</button>' });
    assert.ok(html.includes('<div data-bn="dialog-body"><form></form></div>'));
    assert.ok(html.includes('<button>Ok</button>'));
  });

  it('honours modal: true with aria-modal and modal: false without it', () => {
    assert.ok(renderDialog({ modal: true }).includes('aria-modal="true" data-modal="true"'));
    const nonModal = renderDialog({ modal: false });
    assert.ok(nonModal.includes('data-modal="false"'));
    assert.ok(!nonModal.includes('aria-modal'));
  });

  it('close button is labelled', () => {
    assert.ok(renderDialog().includes('aria-label="Close" type="button"'));
  });
});

describe('Drawer — hardening', () => {
  it('renders closed with inert so the close button is not tabbable', () => {
    resetIds();
    const html = renderDrawer();
    assert.ok(html.includes('id="bn-drawer-1" inert role="dialog"'));
    assert.ok(!html.includes('data-open'));
  });

  it('renders open without inert', () => {
    const html = renderDrawer({ open: true });
    assert.ok(html.includes(' data-open role="dialog"'));
    assert.ok(!html.includes('inert'));
    assert.ok(html.includes('<div data-bn="drawer-overlay" data-open></div>'));
  });

  it('renders with all options', () => {
    const html = renderDrawer({ title: 'T', content: 'C', open: false, position: 'left', size: 'sm', closable: false, overlay: false, id: 'dr', attrs: 'data-x="1"' });
    assert.ok(!html.includes('drawer-overlay'));
    assert.ok(html.includes('data-position="left" data-size="sm" id="dr" inert role="dialog" aria-modal="true" data-x="1">'));
    assert.ok(!html.includes('drawer-close'));
    assert.ok(html.includes('<h2 data-bn="drawer-title">T</h2>'));
  });

  it('escapes title, position, size and id', () => {
    assertEscaped(renderDrawer({ title: XSS, position: XSS, size: XSS, id: XSS }));
  });

  it('content is an HTML slot', () => {
    assert.ok(renderDrawer({ content: '<nav>N</nav>' }).includes('<div data-bn="drawer-body"><nav>N</nav></div>'));
  });
});

describe('Tabs — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderTabs({ id: 't' });
    assert.ok(html.includes('<div data-bn="tabs" data-variant="default" id="t">'));
    assert.ok(html.includes('<div data-bn="tab-list" role="tablist"></div>'));
  });

  it('renders with all options', () => {
    const html = renderTabs({ id: 't', variant: 'pills', activeTab: 'b', attrs: 'data-x="1"', tabs: [{ id: 'a', label: 'A', disabled: true }, { id: 'b', label: 'B', content: 'BB' }] });
    assert.ok(html.includes('data-variant="pills" id="t" data-x="1">'));
    assert.ok(html.includes('id="t-tab-a" aria-selected="false" aria-controls="t-panel-a" data-tab="a" disabled>A</button>'));
    assert.ok(html.includes('id="t-panel-b" aria-labelledby="t-tab-b">BB</div>'));
    assert.ok(html.includes('id="t-panel-a" aria-labelledby="t-tab-a" hidden></div>'));
  });

  it('escapes labels, ids and variant', () => {
    assertEscaped(renderTabs({ id: XSS, variant: XSS, tabs: [{ id: XSS, label: XSS }] }));
  });

  it('tab buttons are type="button"', () => {
    const html = renderTabs({ tabs: [{ id: 'a', label: 'A' }] });
    assert.ok(html.includes('<button data-bn="tab" role="tab" type="button"'));
  });

  it('panel content is an HTML slot', () => {
    assert.ok(renderTabs({ tabs: [{ id: 'a', label: 'A', content: '<p>x</p>' }] }).includes('<p>x</p>'));
  });
});

describe('Accordion — hardening', () => {
  it('renders with minimal options', () => {
    assert.equal(renderAccordion({ id: 'acc' }), '<div data-bn="accordion" id="acc"></div>');
  });

  it('renders with all options', () => {
    const html = renderAccordion({ id: 'acc', multiple: true, attrs: 'data-x="1"', items: [{ title: 'T', content: 'C', open: true }] });
    assert.ok(html.includes('<div data-bn="accordion" id="acc" data-x="1">'));
    assert.ok(html.includes('<details data-bn="accordion-item" open>'));
    assert.ok(!html.includes('name="acc"'));
  });

  it('exclusive mode names every details after the accordion id', () => {
    assert.ok(renderAccordion({ id: 'acc', items: [{ title: 'T' }] }).includes('<details data-bn="accordion-item" name="acc">'));
  });

  it('escapes titles and id', () => {
    assertEscaped(renderAccordion({ id: XSS, items: [{ title: XSS }] }));
  });

  it('section content is an HTML slot', () => {
    assert.ok(renderAccordion({ items: [{ title: 'T', content: '<ul><li>x</li></ul>' }] }).includes('<ul><li>x</li></ul>'));
  });
});

describe('Breadcrumb — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderBreadcrumb();
    assert.ok(html.startsWith('<nav data-bn="breadcrumb" aria-label="Breadcrumb">'));
    assert.ok(html.includes('<ol data-bn="breadcrumb-list"></ol>'));
  });

  it('renders with all options', () => {
    const html = renderBreadcrumb({ separator: '<svg></svg>', attrs: 'data-x="1"', items: [{ label: 'Home', href: '/' }, { label: 'Here' }] });
    assert.ok(html.includes('aria-label="Breadcrumb" data-x="1">'));
    assert.ok(html.includes('<a href="/">Home</a><span data-bn="breadcrumb-separator" aria-hidden="true"><svg></svg></span>'));
  });

  it('escapes labels and hrefs', () => {
    assertEscaped(renderBreadcrumb({ items: [{ label: XSS, href: XSS }, { label: XSS }] }));
  });

  it('marks the last item aria-current', () => {
    assert.ok(renderBreadcrumb({ items: [{ label: 'X' }] }).includes('<li data-bn="breadcrumb-item" aria-current="page">X</li>'));
  });
});

describe('Tooltip — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderTooltip({ id: 'tt' });
    assert.ok(html.includes('<button type="button" data-bn="tooltip-trigger" popovertarget="tt" popovertargetaction="toggle" aria-describedby="tt"></button>'));
    assert.ok(html.includes('<span data-bn="tooltip" id="tt" popover data-position="top" role="tooltip"></span>'));
  });

  it('renders with all options', () => {
    const html = renderTooltip({ id: 'tt', content: 'C', trigger: 'T', position: 'bottom', attrs: 'data-x="1"' });
    assert.ok(html.includes('<button type="button" data-bn="tooltip-trigger" popovertarget="tt" popovertargetaction="toggle" aria-describedby="tt" data-x="1">T</button>'));
    assert.ok(html.includes('data-position="bottom" role="tooltip">C</span>'));
  });

  it('escapes content, id and position', () => {
    assertEscaped(renderTooltip({ content: XSS, id: XSS, position: XSS, trigger: '' }));
  });

  it('a plain-text trigger is wrapped in a real <button>, a valid popover invoker', () => {
    const html = renderTooltip({ id: 'tt', content: 'c', trigger: 'Hover me' });
    assert.ok(html.includes('<button type="button" data-bn="tooltip-trigger" popovertarget="tt" popovertargetaction="toggle" aria-describedby="tt">Hover me</button>'));
  });

  it('a trigger HTML slot that already starts with <button> is used as the invoker in place, not double-wrapped', () => {
    const html = renderTooltip({ id: 'tt', content: 'c', trigger: '<button>?</button>' });
    assert.ok(html.includes('<button data-bn="tooltip-trigger" popovertarget="tt" popovertargetaction="toggle" aria-describedby="tt">?</button>'));
    assert.ok(!html.includes('<button type="button"><button'));
  });

  it('a trigger HTML slot that already starts with <input> is used as the invoker in place', () => {
    const html = renderTooltip({ id: 'tt', content: 'c', trigger: '<input type="button" value="?">' });
    assert.ok(html.includes('<input data-bn="tooltip-trigger" popovertarget="tt" popovertargetaction="toggle" aria-describedby="tt" type="button" value="?">'));
  });
});

describe('DropdownMenu — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderDropdownMenu({ id: 'dd' });
    assert.ok(html.includes('<button data-bn="dropdown-trigger" popovertarget="dd" type="button"></button>'));
    assert.ok(html.includes('<div data-bn="dropdown-menu" id="dd" popover data-position="bottom-start" role="menu"></div>'));
  });

  it('renders with all options', () => {
    const html = renderDropdownMenu({
      id: 'dd', trigger: 'Menu', position: 'top-end', attrs: 'data-x="1"',
      items: [{ label: 'Edit', action: 'edit', icon: '<svg></svg>', shortcut: 'E', disabled: true }, { separator: true }],
    });
    assert.ok(html.includes('<div data-bn="dropdown" data-x="1">'));
    assert.ok(html.includes('data-position="top-end"'));
    assert.ok(html.includes('data-action="edit" aria-disabled="true" type="button"><span data-bn="dropdown-icon"><svg></svg></span>Edit<span data-bn="dropdown-shortcut">E</span></button>'));
    assert.ok(html.includes('<hr data-bn="dropdown-separator" role="separator">'));
  });

  it('escapes labels, actions, shortcuts, id and position', () => {
    assertEscaped(renderDropdownMenu({ id: XSS, position: XSS, trigger: '', items: [{ label: XSS, action: XSS, shortcut: XSS }] }));
  });

  it('trigger and icon are HTML slots', () => {
    const html = renderDropdownMenu({ trigger: '<b>M</b>', items: [{ label: 'x', icon: '<i></i>' }] });
    assert.ok(html.includes('<b>M</b>'));
    assert.ok(html.includes('<i></i>'));
  });

  it('menu items have role="menuitem" and are type="button"', () => {
    assert.ok(renderDropdownMenu({ trigger: '', items: [{ label: 'x' }] }).includes('role="menuitem" data-action="" type="button"'));
  });
});

describe('CommandPalette — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderCommandPalette({ id: 'cp' });
    assert.ok(html.startsWith('<dialog data-bn="command-palette" id="cp">'));
    assert.ok(html.includes('<div data-bn="command-list" role="listbox"></div>'));
  });

  it('renders with all options', () => {
    const html = renderCommandPalette({
      id: 'cp', open: true, placeholder: 'Go', attrs: 'data-x="1"',
      commands: [{ label: 'Save', action: 'save', icon: '<svg></svg>', shortcut: 'S', group: 'File' }, { id: 'quit', label: 'Quit' }],
    });
    assert.ok(html.startsWith('<dialog data-bn="command-palette" id="cp" open data-x="1">'));
    assert.ok(html.includes('placeholder="Go"'));
    assert.ok(html.includes('role="group" aria-label="File"'));
    assert.ok(html.includes('<div data-bn="command-group-label">Commands</div>'));
    assert.ok(html.includes('data-action="quit"'));
    assert.ok(html.includes('<span data-bn="command-icon"><svg></svg></span><span data-bn="command-label">Save</span><kbd data-bn="command-shortcut">S</kbd>'));
  });

  it('escapes labels, groups, shortcuts, actions, placeholder and id', () => {
    assertEscaped(renderCommandPalette({ id: XSS, placeholder: XSS, commands: [{ label: XSS, action: XSS, shortcut: XSS, group: XSS }] }));
  });

  it('exposes combobox/listbox/option roles', () => {
    const html = renderCommandPalette({ commands: [{ label: 'x' }] });
    assert.ok(html.includes('role="combobox"'));
    assert.ok(html.includes('role="listbox"'));
    assert.ok(html.includes('role="option"'));
  });
});

describe('Combobox — hardening', () => {
  it('renders with minimal options', () => {
    resetIds();
    const html = renderCombobox();
    assert.ok(html.includes('id="bn-combobox-1"'));
    assert.ok(html.includes('<datalist id="bn-combobox-1-list"></datalist>'));
  });

  it('derives its id from the name', () => {
    const html = renderCombobox({ name: 'fruit' });
    assert.ok(html.includes('id="bn-combobox-fruit" name="fruit" list="bn-combobox-fruit-list"'));
  });

  it('renders with all options', () => {
    const html = renderCombobox({ name: 'f', label: 'Fruit', items: ['a', { value: 'b', label: 'B' }], placeholder: 'p', required: true, disabled: true, value: 'a', id: 'cb', attrs: 'data-x="1"' });
    assert.ok(html.includes('<label for="cb" data-bn="label">Fruit</label>'));
    assert.ok(html.includes('value="a" placeholder="p" required disabled'));
    assert.ok(html.includes('aria-expanded="false" data-x="1">'));
    assert.ok(html.includes('<option value="a">a</option><option value="b">B</option>'));
  });

  it('escapes attributes, label and options', () => {
    assertEscaped(renderCombobox({ name: XSS, label: XSS, placeholder: XSS, value: XSS, id: XSS, items: [{ value: XSS, label: XSS }] }));
  });

  it('label is associated with the input', () => {
    const html = renderCombobox({ name: 'f', label: 'L' });
    assert.ok(html.includes('for="bn-combobox-f"'));
    assert.ok(html.includes('role="combobox" aria-autocomplete="list"'));
  });
});

describe('Multiselect — hardening', () => {
  it('renders with minimal options', () => {
    resetIds();
    const html = renderMultiselect();
    assert.ok(html.includes('<select id="bn-multiselect-1" name="undefined" multiple hidden></select>'));
  });

  it('derives its id from the name', () => {
    assert.ok(renderMultiselect({ name: 'tags' }).includes('<select id="bn-multiselect-tags" name="tags"'));
  });

  it('renders with all options', () => {
    const html = renderMultiselect({ name: 't', label: 'Tags', items: ['a', { value: 'b', label: 'B' }], selected: ['b', 'zz'], placeholder: 'p', disabled: true, id: 'ms', attrs: 'data-x="1"' });
    assert.ok(html.includes('<div data-bn="multiselect" data-disabled>'));
    assert.ok(html.includes('<label for="ms" data-bn="label">Tags</label>'));
    assert.ok(html.includes('<span data-bn="tag" data-value="b">B<button type="button" data-bn="tag-remove" aria-label="Remove B">&times;</button></span>'));
    assert.ok(html.includes('data-value="zz">zz<'));
    assert.ok(html.includes('placeholder="p" autocomplete="off" aria-label="Tags" data-x="1">'));
    assert.ok(html.includes('<option value="b" selected>B</option>'));
    assert.ok(html.includes('multiple hidden disabled>'));
  });

  it('escapes attributes, label, tags and options', () => {
    assertEscaped(renderMultiselect({ name: XSS, label: XSS, placeholder: XSS, id: XSS, items: [{ value: XSS, label: XSS }], selected: [XSS] }));
  });

  it('search input falls back to a Search aria-label', () => {
    assert.ok(renderMultiselect({ name: 't' }).includes('aria-label="Search"'));
  });
});

describe('DataGrid — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderDataGrid({ id: 'g' });
    assert.ok(html.includes('<div data-bn="datagrid" id="g">'));
    assert.ok(html.includes('<td colspan="0" data-bn="datagrid-empty">No data</td>'));
    assert.ok(html.includes('Showing 0–0 of 0'));
  });

  it('renders with all options', () => {
    const html = renderDataGrid({
      id: 'g', attrs: 'data-x="1"', caption: 'People', page: 2, pageSize: 1, totalRows: 5, sortBy: 'n', sortDir: 'desc',
      selectable: true, selectedRows: [7],
      columns: [{ key: 'n', label: 'N', sortable: true, resizable: true, editable: true, width: '10rem' }],
      rows: [{ id: 7, n: 'Ann' }],
    });
    assert.ok(html.includes('<div data-bn="datagrid" id="g" data-x="1">'));
    assert.ok(html.includes('aria-label="People"'));
    assert.ok(html.includes('<caption>People</caption>'));
    assert.ok(html.includes('data-key="n" data-sortable data-sorted="desc" aria-sort="descending" style="width:10rem" data-resizable scope="col"><button type="button" data-bn="datagrid-th-button">N ↓</button></th>'));
    assert.ok(html.includes('<input type="checkbox" checked aria-label="Select row 7"'));
    assert.ok(html.includes('contenteditable="true" data-editable>Ann</td>'));
    assert.ok(html.includes('Showing 2–2 of 5'));
  });

  it('escapes labels, raw cell values, caption, empty message and ids', () => {
    assertEscaped(renderDataGrid({ id: XSS, caption: XSS, columns: [{ key: XSS, label: XSS }], rows: [{ [XSS]: XSS, id: XSS }] }));
    assertEscaped(renderDataGrid({ columns: [{ key: 'a', label: 'A' }], emptyMessage: XSS }));
  });

  it('column render() output is an HTML slot', () => {
    const html = renderDataGrid({ columns: [{ key: 'a', label: 'A', render: v => `<b>${v}</b>` }], rows: [{ a: 'x' }] });
    assert.ok(html.includes('<td data-bn="datagrid-td" data-key="a"><b>x</b></td>'));
  });

  it('scroll region is labelled and focusable', () => {
    const html = renderDataGrid({ columns: [] });
    assert.ok(html.includes('role="region" aria-label="Data grid" tabindex="0"'));
    assert.ok(html.includes('role="grid"'));
  });
});

describe('Tree — hardening', () => {
  it('renders with minimal options', () => {
    assert.equal(renderTree({ id: 't' }), '<ul data-bn="tree" id="t" role="tree"></ul>');
  });

  it('renders with all options', () => {
    const html = renderTree({
      id: 't', attrs: 'data-x="1"', selected: 'c', expanded: new Set(['p']),
      items: [{ id: 'p', label: 'P', icon: '<svg></svg>', children: [{ id: 'c', label: 'C' }] }],
    });
    assert.ok(html.includes('<ul data-bn="tree" id="t" role="tree" data-x="1">'));
    assert.ok(html.includes('role="treeitem" aria-expanded="true" aria-selected="false" data-node-id="p" data-level="0"'));
    assert.ok(html.includes('aria-label="Collapse" type="button">▾</button><span data-bn="tree-icon"><svg></svg></span>'));
    assert.ok(html.includes('<ul data-bn="tree-children" role="group"><li data-bn="tree-item" role="treeitem" aria-selected="true" data-node-id="c" data-level="1"><div data-bn="tree-item-content" tabindex="-1" data-selected>'));
  });

  it('the first item in document order is tabindex="0"; every other item is tabindex="-1" (roving tabindex)', () => {
    const html = renderTree({
      expanded: new Set(['p']),
      items: [
        { id: 'p', label: 'P', children: [{ id: 'c', label: 'C' }] },
        { id: 'q', label: 'Q' },
      ],
    });
    assert.ok(html.includes('<div data-bn="tree-item-content" tabindex="0">'));
    assert.equal((html.match(/tabindex="0"/g) || []).length, 1);
    assert.equal((html.match(/tabindex="-1"/g) || []).length, 2);
  });

  it('escapes labels, node ids and tree id', () => {
    assertEscaped(renderTree({ id: XSS, items: [{ id: XSS, label: XSS }] }));
  });

  it('leaf nodes omit aria-expanded; parents carry it', () => {
    const html = renderTree({ items: [{ id: 'p', label: 'P', children: [{ id: 'c', label: 'C' }] }] });
    assert.ok(!html.includes('aria-expanded="undefined"'));
    assert.ok(html.includes('aria-expanded="false"'));
    assert.ok(!renderTree({ items: [{ id: 'leaf', label: 'L' }] }).includes('aria-expanded'));
  });

  it('collapsed parents do not render their children', () => {
    const html = renderTree({ items: [{ id: 'p', label: 'P', children: [{ id: 'c', label: 'Hidden' }] }] });
    assert.ok(!html.includes('Hidden'));
    assert.ok(html.includes('aria-label="Expand"'));
  });
});

describe('TreeGrid — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderTreeGrid({ id: 'tg' });
    assert.ok(html.startsWith('<table data-bn="treegrid" id="tg" role="treegrid">'));
  });

  it('renders with all options', () => {
    const html = renderTreeGrid({
      id: 'tg', attrs: 'data-x="1"', expanded: new Set(['p']),
      columns: [{ key: 'name', label: 'Name' }, { key: 'size', label: 'Size' }],
      items: [{ id: 'p', name: 'Parent', size: 1, children: [{ id: 'c', name: 'Child', size: 2 }] }],
    });
    assert.ok(html.includes('role="treegrid" data-x="1">'));
    assert.ok(html.includes('<th scope="col">Name</th><th scope="col">Size</th>'));
    assert.ok(html.includes('data-node-id="p" aria-level="1" aria-expanded="true" role="row" tabindex="0"><td><span data-level="0">▾ </span>Parent</td><td>1</td></tr>'));
    assert.ok(html.includes('data-node-id="c" aria-level="2" role="row" tabindex="-1"><td><span data-level="1">    </span>Child</td><td>2</td></tr>'));
  });

  it('escapes column labels, cell values and ids', () => {
    assertEscaped(renderTreeGrid({ id: XSS, columns: [{ key: 'n', label: XSS }], items: [{ id: XSS, n: XSS }] }));
  });

  it('leaf rows omit aria-expanded', () => {
    const html = renderTreeGrid({ columns: [{ key: 'n', label: 'N' }], items: [{ n: 'leaf' }] });
    assert.ok(!html.includes('aria-expanded'));
    assert.ok(html.includes('aria-level="1"'));
  });

  it('the first row is tabindex="0"; every other row is tabindex="-1" (roving tabindex)', () => {
    const html = renderTreeGrid({
      expanded: new Set(['p']),
      columns: [{ key: 'n', label: 'N' }],
      items: [
        { id: 'p', n: 'Parent', children: [{ id: 'c', n: 'Child' }] },
        { id: 'q', n: 'Q' },
      ],
    });
    assert.ok(html.includes('data-node-id="p" aria-level="1" aria-expanded="true" role="row" tabindex="0">'));
    assert.equal((html.match(/tabindex="0"/g) || []).length, 1);
    assert.equal((html.match(/tabindex="-1"/g) || []).length, 2);
  });
});

describe('VirtualList — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderVirtualList({ id: 'v' });
    assert.ok(html.includes('<div data-bn="virtualizer" id="v" style="height:400px;overflow:auto">'));
    assert.ok(html.includes('data-item-height="40" data-total="0"'));
  });

  it('renders only the visible window plus overscan', () => {
    const items = Array.from({ length: 100 }, (_, i) => `i${i}`);
    const html = renderVirtualList({ items, itemHeight: 10, containerHeight: 50, overscan: 1 });
    assert.equal((html.match(/data-bn="virtual-item"/g) || []).length, 7);
  });

  it('default renderItem escapes items', () => {
    assertEscaped(renderVirtualList({ items: [XSS] }));
    assertEscaped(renderVirtualList({ id: XSS }));
  });

  it('custom renderItem is an HTML slot', () => {
    assert.ok(renderVirtualList({ items: ['a'], renderItem: i => `<li>${i}</li>` }).includes('<li>a</li>'));
  });
});

describe('Avatar — hardening', () => {
  it('with an image the wrapper has no role and the img carries alt', () => {
    const html = renderAvatar({ src: '/a.png', name: 'Jane Doe' });
    assert.equal(html, '<span data-bn="avatar" data-size="default" data-shape="circle"><img src="/a.png" alt="Jane Doe" data-bn="avatar-img"></span>');
    assert.ok(!html.includes('role="img"'));
  });

  it('without an image the wrapper is role="img" with an aria-label', () => {
    const html = renderAvatar({ name: 'Jane Doe' });
    assert.ok(html.includes('role="img" aria-label="Jane Doe"'));
    assert.ok(html.includes('<span data-bn="avatar-initials">JD</span>'));
  });

  it('renders with all options', () => {
    const html = renderAvatar({ src: '/a.png', alt: 'Alt', name: 'N', size: 'lg', shape: 'square', attrs: 'data-x="1"' });
    assert.ok(html.includes('data-size="lg" data-shape="square" data-x="1"><img src="/a.png" alt="Alt"'));
  });

  it('escapes src, alt, name, size and shape', () => {
    assertEscaped(renderAvatar({ src: XSS, alt: XSS, size: XSS, shape: XSS }));
    assertEscaped(renderAvatar({ name: XSS, size: XSS }));
  });

  it('falls back to an Avatar label', () => {
    assert.ok(renderAvatar().includes('aria-label="Avatar"'));
  });
});

describe('Calendar — hardening', () => {
  it('escapes event title, assignee, ids, status, color and empty message', () => {
    assertEscaped(renderCalendar({
      id: XSS, startDate: '2025-06-02',
      events: [{ id: XSS, title: XSS, assignee: XSS, status: XSS, color: XSS, start: '2025-06-02T09:00', end: '2025-06-02T10:00' }],
    }));
    assertEscaped(renderCalendar({ startDate: '2025-06-02', emptyMessage: XSS }));
  });

  it('interprets a date-only startDate as local midnight in every timezone', () => {
    const html = renderCalendar({ startDate: '2025-06-02T00:00' });
    assert.ok(html.includes('data-date="2025-06-02">Mon 6/2</div>'));
    assert.ok(html.includes('data-date="2025-06-08">Sun 6/8</div>'));
    assert.equal(renderCalendar({ startDate: '2025-06-02', id: 'c' }), renderCalendar({ startDate: '2025-06-02T00:00', id: 'c' }));
  });

  it('places an event that crosses midnight in the column of its local start day', () => {
    const html = renderCalendar({
      startDate: '2025-06-02',
      hours: { start: 0, end: 24 },
      events: [{ id: 'late', title: 'Late', start: '2025-06-02T23:30', end: '2025-06-03T00:30' }],
    });
    const monday = html.slice(html.indexOf('data-bn="calendar-day-column" data-date="2025-06-02"'), html.indexOf('data-bn="calendar-day-column" data-date="2025-06-03"'));
    assert.ok(monday.includes('data-event-id="late"'));
    assert.ok(monday.includes('grid-row: 25.5 / span 1'));
  });

  it('renders with all options', () => {
    const html = renderCalendar({
      id: 'cal', attrs: 'data-x="1"', startDate: '2025-06-02', hours: { start: 8, end: 10 }, emptyMessage: 'none',
      events: [{ id: 'e', title: 'T', start: '2025-06-02T08:00', end: '2025-06-02T09:00', status: 'done', color: 'red', assignee: 'Ann' }],
    });
    assert.ok(html.includes('<div data-bn="calendar" id="cal" data-x="1">'));
    assert.ok(html.includes('--bn-calendar-hours: 2;'));
    assert.ok(html.includes('data-status="done" title="T" style="grid-row: 2 / span 1; --bn-calendar-event-color: red;"'));
    assert.ok(html.includes('<span data-bn="calendar-event-assignee">Ann</span>'));
    assert.ok(!html.includes('calendar-empty'));
  });

  it('uses a deterministic id', () => {
    resetIds();
    assert.ok(renderCalendar({ startDate: '2025-06-02' }).includes('id="bn-calendar-1"'));
  });
});

describe('PipelineBlock — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderPipelineBlock({ id: 'b', title: 'T' });
    assert.ok(html.startsWith('<div data-bn="pipeline-block" draggable="true" data-block-id="b">'));
    assert.ok(!html.includes('subtitle'));
  });

  it('renders with all options without a stray space', () => {
    const html = renderPipelineBlock({ id: 'b', title: 'T', subtitle: 'S', status: 'hot', attrs: 'data-x="1"' });
    assert.ok(html.startsWith('<div data-bn="pipeline-block" draggable="true" data-block-id="b" data-status="hot" data-x="1">'));
    assert.ok(html.includes('<span data-bn="pipeline-block-subtitle">S</span>'));
  });

  it('escapes id, title, subtitle and status', () => {
    assertEscaped(renderPipelineBlock({ id: XSS, title: XSS, subtitle: XSS, status: XSS }));
  });
});

describe('Pipeline — hardening', () => {
  it('renders with minimal options', () => {
    resetIds();
    assert.ok(renderPipeline().startsWith('<div data-bn="pipeline" id="bn-pipeline-1">'));
  });

  it('escapes column and card fields', () => {
    assertEscaped(renderPipeline({
      id: XSS,
      columns: [{ id: XSS, title: XSS }],
      cards: [{ id: XSS, columnId: XSS, title: XSS, subtitle: XSS, description: XSS, status: XSS }],
    }));
    assertEscaped(renderPipeline({ columns: [{ id: 'a', title: 'A' }], emptyMessage: XSS }));
  });

  it('cards are draggable articles titled for hover', () => {
    const html = renderPipeline({ columns: [{ id: 'a', title: 'A' }], cards: [{ id: 'c', columnId: 'a', title: 'Card' }] });
    assert.ok(html.includes('<article data-bn="pipeline-card" data-card-id="c" draggable="true" title="Card">'));
  });
});

describe('Drag and drop init', () => {
  it('initCalendarDragDrop binds the five drag events and destroy unbinds them', () => {
    const el = fakeContainer();
    const handle = initCalendarDragDrop(el, {});
    assert.deepEqual([...el.listeners.keys()].sort(), ['dragend', 'dragleave', 'dragover', 'dragstart', 'drop']);
    handle.destroy();
    assert.equal(el.listeners.size, 0);
  });

  it('initPipelineDragDrop binds the five drag events and destroy unbinds them', () => {
    const el = fakeContainer();
    const handle = initPipelineDragDrop(el, {});
    assert.deepEqual([...el.listeners.keys()].sort(), ['dragend', 'dragleave', 'dragover', 'dragstart', 'drop']);
    handle.destroy();
    assert.equal(el.listeners.size, 0);
  });

  it('calendar drop reports the slot date/hour and drag payload', () => {
    const el = fakeContainer();
    const dropped = [];
    initCalendarDragDrop(el, { onDrop: d => dropped.push(d) });
    const slot = { removeAttribute() {}, dataset: { date: '2025-06-02', hour: '9' } };
    el.listeners.get('drop')({
      preventDefault() {},
      target: { closest: sel => (sel === '[data-bn="calendar-slot"]' ? slot : null) },
      dataTransfer: { getData: () => JSON.stringify({ type: 'event', id: 'e1' }) },
    });
    assert.deepEqual(dropped, [{ eventId: 'e1', date: '2025-06-02', hour: 9, sourceType: 'event' }]);
  });

  it('malformed drag data is ignored', () => {
    const el = fakeContainer();
    let calls = 0;
    initPipelineDragDrop(el, { onCardMove: () => { calls += 1; } });
    const cardArea = { removeAttribute() {}, closest: () => ({ dataset: { columnId: 'new' } }) };
    el.listeners.get('drop')({
      preventDefault() {},
      target: { closest: sel => (sel === '[data-bn="pipeline-column-cards"]' ? cardArea : null) },
      dataTransfer: { getData: () => 'not json' },
    });
    assert.equal(calls, 0);
  });

  it('pipeline drop reports card and target column', () => {
    const el = fakeContainer();
    const moves = [];
    initPipelineDragDrop(el, { onCardMove: m => moves.push(m) });
    const cardArea = { removeAttribute() {}, closest: () => ({ dataset: { columnId: 'won' } }) };
    el.listeners.get('drop')({
      preventDefault() {},
      target: { closest: sel => (sel === '[data-bn="pipeline-column-cards"]' ? cardArea : null) },
      dataTransfer: { getData: () => JSON.stringify({ type: 'pipeline-card', cardId: 'c1' }) },
    });
    assert.deepEqual(moves, [{ cardId: 'c1', targetColumnId: 'won', position: null }]);
  });
});

describe('LayoutGrid — hardening', () => {
  it('renders with minimal options', () => {
    const html = renderLayoutGrid();
    assert.ok(html.startsWith('<div data-bn="layout-grid" id="layout-grid" style="display:grid;grid-template-columns:repeat(12,1fr);gap:1rem">'));
  });

  it('renders with all options', () => {
    const html = renderLayoutGrid({ id: 'g', columns: 4, gap: '2px', minCellHeight: '1rem', editable: true, cells: [{ id: 'c1', label: 'L', colSpan: 2, rowSpan: 3 }, { content: '<b>x</b>' }, {}] });
    assert.ok(html.includes('repeat(4,1fr);gap:2px'));
    assert.ok(html.includes('data-cell-id="c1" style="grid-column: span 2; grid-row: span 3; min-height: 1rem" draggable="true">L</div>'));
    assert.ok(html.includes('data-cell-id="cell-1"'));
    assert.ok(html.includes('>Cell 3</div>'));
  });

  it('escapes id, cell ids, labels and style values', () => {
    assertEscaped(renderLayoutGrid({ id: XSS, gap: XSS, columns: XSS, minCellHeight: XSS, cells: [{ id: XSS, label: XSS }] }));
  });

  it('cell content is an HTML slot', () => {
    assert.ok(renderLayoutGrid({ cells: [{ content: '<b>x</b>' }] }).includes('><b>x</b></div>'));
  });
});
