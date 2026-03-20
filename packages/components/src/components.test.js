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
