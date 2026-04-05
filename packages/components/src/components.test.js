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
    assert.ok(html.includes('Alice'));
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
