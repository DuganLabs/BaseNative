# @basenative/components

> 30+ semantic UI components rendered as HTML strings — no framework, no JavaScript required

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/components
```

## Quick Start

```js
import {
  renderButton,
  renderInput,
  renderAlert,
  renderTable,
  renderDialog,
} from '@basenative/components';

// All components return HTML strings for use with @basenative/server
const html = `
  ${renderAlert({ type: 'info', message: 'Changes saved successfully.' })}
  ${renderButton({ label: 'Submit', variant: 'primary', type: 'submit' })}
  ${renderInput({ name: 'email', label: 'Email', type: 'email', required: true })}
`;
```

## Styles

```html
<!-- Import the component stylesheet (cascade layers, no inline styles) -->
<link rel="stylesheet" href="node_modules/@basenative/components/src/index.css">
```

## API

All components are pure functions that accept an options object and return an HTML string.

### Form Controls
- `renderButton(options)` — Button with `variant` (`primary`, `secondary`, `ghost`, `destructive`) and `size`.
- `renderInput(options)` — Text input with label, help text, and error state.
- `renderTextarea(options)` — Multiline text input.
- `renderCheckbox(options)` — Checkbox with label.
- `renderRadioGroup(options)` — Group of radio inputs.
- `renderToggle(options)` — Toggle/switch input.
- `renderSelect(options)` — `<select>` with option list.
- `renderCombobox(options)` — Searchable combobox.
- `renderMultiselect(options)` — Multi-value select.

### Feedback
- `renderAlert(options)` — Inline alert with `type` (`info`, `success`, `warn`, `error`) and `message`.
- `createToaster()` / `showToast(toaster, options)` / `dismissToast(toaster, id)` / `renderToastContainer(toaster)` — Toast notification system.
- `renderProgress(options)` / `renderSpinner(options)` — Progress bar and loading spinner.
- `renderSkeleton(options)` — Skeleton loading placeholder.

### Data Display
- `renderTable(options)` — Accessible `<table>` with columns and rows config.
- `renderDataGrid(options)` — Feature-rich data grid with sorting and pagination.
- `renderTree(options)` / `renderTreeGrid(options)` — Tree view and tree grid.
- `renderVirtualList(options)` — Virtualized list for large datasets.
- `renderBadge(options)` — Small status badge.
- `renderAvatar(options)` — User avatar with fallback initials.
- `renderPagination(options)` — Page navigation controls.

### Layout & Navigation
- `renderCard(options)` — Content card with optional header/footer.
- `renderDialog(options)` — Modal dialog.
- `renderDrawer(options)` — Side drawer panel.
- `renderTabs(options)` — Tabbed content panels.
- `renderAccordion(options)` — Collapsible accordion sections.
- `renderBreadcrumb(options)` — Breadcrumb navigation trail.
- `renderTooltip(options)` — Tooltip wrapper.
- `renderDropdownMenu(options)` — Dropdown menu with items.
- `renderCommandPalette(options)` — Keyboard-driven command palette.

### Utilities
- `buttonVariants` — Object map of available button variant class names.

## License

MIT
