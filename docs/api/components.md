# @basenative/components API

Every function in this package is a pure `render*` helper that returns an HTML string (or a small state helper for toasts, calendars and pipelines). Markup is semantic HTML tagged with `data-bn="…"` attributes; there is no client-side JavaScript except the opt-in drag-and-drop initialisers.

All `render*` functions accept an `attrs` option unless the table says otherwise: a raw string of extra HTML attributes spliced verbatim into the outermost element (for example `attrs: 'data-testid="save" aria-describedby="hint"'`). Content options (`content`, `body`, `title`, `label`, …) are inserted as HTML, not escaped, unless noted.

## Styling

Load the bundled stylesheet (it imports every layer in cascade order):

```html
<link rel="stylesheet" href="node_modules/@basenative/components/src/index.css" />
```

or, with a bundler, `import '@basenative/components/css'`.

The individual layers are also exported. `./layers.css` contains only the `@layer reset, tokens, layout, components, states;` declaration that fixes the cascade order, so it must be loaded **first** when importing layers individually:

| Export | File | Layer |
|--------|------|-------|
| `./css` | `src/index.css` | imports all of the below in order |
| `./layers.css` | `src/layers.css` | declares layer order — load first |
| `./reset.css` | `src/reset.css` | `reset` |
| `./tokens.css` | `src/tokens.css` | `tokens` (design tokens, density scales) |
| `./theme.css` | `src/theme.css` | `tokens` (light/dark palettes) |
| `./layout.css` | `src/layout.css` | `layout` |
| `./components.css` | `src/components.css` | `components` |
| `./states.css` | `src/states.css` | `states` |

## Escaping Policy

Every renderer uses the runtime's shared `escapeText` / `escapeAttr` (`@basenative/runtime/shared/escape`):

- **Escaped** — every attribute interpolation (`id`, `name`, `value`, `placeholder`, `alt`, `src`, `href`, `aria-*`, `data-*`, variant/size/position fragments) and every text-semantic field (`label`, `helpText`, `error`, `caption`, `emptyMessage`, item labels, tooltip content, breadcrumb labels, avatar name, tree/table cell values, calendar and pipeline titles).
- **Not escaped (HTML slots)** — designated composition points documented on each parameter as "HTML slot: not escaped; pass trusted markup only": button content, card header/body/footer, alert content, badge content, dialog/drawer body and footer, accordion and tab panel content, dropdown/tooltip trigger, menu/command/tree icons, breadcrumb separator, a DataGrid column's `render()` result, a custom `renderItem`, and every `attrs` option.

```js
renderInput({ name: 'q', label: '<b>Not bold</b>' })   // label is escaped
renderButton('<b>Bold</b>')                             // content is a slot
```

## Deterministic Ids

```js
import { nextId, resetIds } from '@basenative/components';

resetIds();            // once per SSR request, before rendering
nextId('dialog');      // 'bn-dialog-1'
```

Renderers that need an id draw from a module counter, never `Math.random()`, so two renders of the same page produce identical markup. Every renderer honours an explicit `id` option first. Hydration matches server and client markup by id, so pass explicit `id`s to hydrated components, or render the same components in the same order on both sides and call `resetIds()` per request.

## Button

`renderButton(content, options?)` → `string`. `buttonVariants(variant?, size?)` → `string` returns the class string `bn-button bn-button--{variant} bn-button--{size}` for hand-written markup.

```js
renderButton('Submit', { variant: 'primary', type: 'submit' })
buttonVariants('ghost', 'sm') // 'bn-button bn-button--ghost bn-button--sm'
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'destructive' \| 'ghost'` | `'primary'` | Emitted as `data-variant` |
| `size` | `'default' \| 'sm' \| 'lg'` | `'default'` | Emitted as `data-size` |
| `disabled` | `boolean` | `false` | Adds `disabled` |
| `type` | `string` | `'button'` | `type` attribute |
| `attrs` | `string` | `''` | Extra attributes |

Renders:

```html
<button data-bn="button" data-variant="primary" data-size="default" type="submit">Submit</button>
```

Accessibility: a native `<button>`; `type="button"` by default so it does not submit forms accidentally.

## Input

`renderInput(options)` → `string`

```js
renderInput({ name: 'email', label: 'Email', type: 'email', required: true, error: 'Required' })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | — | `name` attribute; also the default `id` |
| `type` | `string` | `'text'` | `type` attribute |
| `label` | `string` | — | Renders a `<label for>` |
| `placeholder` | `string` | `''` | Escaped |
| `value` | `string` | `''` | Escaped |
| `required` | `boolean` | `false` | |
| `disabled` | `boolean` | `false` | |
| `helpText` | `string` | `''` | Help line, id `{id}-help` |
| `error` | `string` | `''` | Error line with `role="alert"`; sets `aria-invalid="true"` |
| `id` | `string` | `name` | |
| `attrs` | `string` | `''` | Extra attributes on the `<input>` |

Renders:

```html
<div data-bn="field">
  <label for="email">Email</label>
  <input data-bn="input" type="email" id="email" name="email" value="" placeholder="" required aria-describedby="email-error" aria-invalid="true" />
  <span data-bn="field-error" id="email-error" role="alert">Required</span>
</div>
```

Accessibility: label is associated via `for`/`id`; `aria-describedby` points at the help or error line; errors use `role="alert"`.

## Textarea

`renderTextarea(options)` → `string`

```js
renderTextarea({ name: 'bio', label: 'Bio', rows: 5 })
```

Same options as Input minus `type`, plus `rows` (`number`, default `3`). `value` is HTML-escaped. Renders `<div data-bn="field">` containing `<label>`, `<textarea data-bn="textarea">`, optional `[data-bn="field-help"]` and `[data-bn="field-error"][role="alert"]`.

Accessibility: `aria-invalid="true"` when `error` is set; `aria-describedby` lists the help (`{id}-help`) and/or error (`{id}-error`) ids, same as Input.

## Checkbox

`renderCheckbox(options)` → `string`

```js
renderCheckbox({ name: 'agree', label: 'I agree to terms', checked: false })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | — | |
| `label` | `string` | `''` | Text inside the `<span>` |
| `checked` | `boolean` | `false` | |
| `disabled` | `boolean` | `false` | |
| `value` | `string` | `''` | Escaped; omitted when empty |
| `id` | `string` | `name` | |
| `attrs` | `string` | `''` | Extra attributes on the wrapping `<label>` |

Renders:

```html
<label data-bn="checkbox-label"><input data-bn="checkbox" type="checkbox" id="agree" name="agree" /><span>I agree to terms</span></label>
```

Accessibility: the input is wrapped by its label, so the whole row is clickable and the accessible name comes from the label text.

## Radio Group

`renderRadioGroup(options)` → `string`

```js
renderRadioGroup({
  name: 'plan',
  label: 'Plan',
  items: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }],
  selected: 'free',
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | — | Shared `name`; each radio gets id `{name}-{value}` |
| `label` | `string` | — | Rendered as `<legend>` |
| `items` | `Array<string \| { value, label, disabled? }>` | `[]` | |
| `selected` | `string` | `''` | Value of the checked radio |
| `disabled` | `boolean` | `false` | Disables all radios |
| `attrs` | `string` | `''` | Extra attributes on the `<fieldset>` |

Renders:

```html
<fieldset data-bn="radio-group"><legend>Plan</legend>
  <label data-bn="radio-label"><input data-bn="radio" type="radio" id="plan-free" name="plan" value="free" checked /><span>Free</span></label>
  …
</fieldset>
```

Accessibility: `<fieldset>`/`<legend>` group the radios under one accessible name.

## Toggle / Switch

`renderToggle(options)` → `string`

```js
renderToggle({ name: 'notifications', label: 'Enable notifications' })
```

Options: `name`, `label`, `checked`, `disabled`, `id` (default `name`), `attrs` (on the wrapping `<label>`). Renders:

```html
<label data-bn="toggle-label"><input data-bn="toggle" type="checkbox" role="switch" id="notifications" name="notifications" /><span>Enable notifications</span></label>
```

Accessibility: native checkbox with `role="switch"`.

## Select

`renderSelect(options)` → `string`

```js
renderSelect({
  name: 'country',
  label: 'Country',
  placeholder: 'Select...',
  items: [{ value: 'us', label: 'USA' }, { value: 'uk', label: 'UK' }],
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | — | |
| `label` | `string` | — | `<label for>` |
| `items` | `Array<string \| { value, label, disabled? }>` | `[]` | Values and labels are escaped |
| `selected` | `string` | `''` | |
| `placeholder` | `string` | `''` | Disabled first option with `value=""`, selected when nothing else is |
| `required` | `boolean` | `false` | |
| `disabled` | `boolean` | `false` | |
| `helpText` | `string` | `''` | Help line, id `{id}-help` |
| `error` | `string` | `''` | Error line with `role="alert"`; sets `aria-invalid` |
| `id` | `string` | `name` | |
| `attrs` | `string` | `''` | Extra attributes on the `<select>` |

Renders `<div data-bn="field">` with `<label>`, `<select data-bn="select">…</select>` and optional `[data-bn="field-help"]` and `[data-bn="field-error"]`.

Accessibility: `aria-invalid="true"` when `error` is set; `aria-describedby` lists the help (`{id}-help`) and/or error (`{id}-error`) ids, same as Input.

## Combobox

`renderCombobox(options)` → `string`. A text input backed by a native `<datalist>`.

```js
renderCombobox({ name: 'city', label: 'City', items: ['Berlin', 'Boston', { value: 'sf', label: 'San Francisco' }] })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | — | |
| `label` | `string` | — | `<label for>` |
| `items` | `Array<string \| { value, label }>` | `[]` | `<datalist>` options; value and label are escaped |
| `placeholder` | `string` | `''` | |
| `required` | `boolean` | `false` | |
| `disabled` | `boolean` | `false` | |
| `value` | `string` | `''` | |
| `id` | `string` | `bn-combobox-{name}` | `bn-combobox-{n}` when `name` is absent; `{id}-list` is the datalist id |
| `attrs` | `string` | `''` | Extra attributes on the `<input>` |

Renders:

```html
<div data-bn="combobox">
  <label for="bn-combobox-city" data-bn="label">City</label>
  <input type="text" id="bn-combobox-city" name="city" list="bn-combobox-city-list" value="" placeholder="" data-bn="combobox-input" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false">
  <datalist id="bn-combobox-city-list"><option value="Berlin">Berlin</option>…</datalist>
</div>
```

Accessibility: `role="combobox"`, `aria-autocomplete="list"`; the `<datalist>` gives native keyboard suggestions without JavaScript.

## Multiselect

`renderMultiselect(options)` → `string`. Selected values render as removable tags in front of a search input; a hidden `<select multiple>` carries the form value.

```js
renderMultiselect({ name: 'tags', label: 'Tags', items: ['a11y', 'css', 'html'], selected: ['css'] })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | — | `name` of the hidden `<select>` |
| `label` | `string` | — | Also the search input's `aria-label` (falls back to `'Search'`) |
| `items` | `Array<string \| { value, label }>` | `[]` | |
| `selected` | `string[]` | `[]` | Pre-selected values |
| `placeholder` | `string` | `'Select items...'` | Search input placeholder |
| `disabled` | `boolean` | `false` | Adds `data-disabled` to the wrapper and `disabled` to the select |
| `id` | `string` | `bn-multiselect-{name}` | `bn-multiselect-{n}` when `name` is absent |
| `attrs` | `string` | `''` | Extra attributes on the search `<input>` |

Renders:

```html
<div data-bn="multiselect">
  <label for="bn-multiselect-tags" data-bn="label">Tags</label>
  <div data-bn="multiselect-container">
    <div data-bn="multiselect-tags"><span data-bn="tag" data-value="css">css<button type="button" data-bn="tag-remove" aria-label="Remove css">×</button></span></div>
    <input type="text" data-bn="multiselect-search" placeholder="Select items..." autocomplete="off" aria-label="Tags">
  </div>
  <select id="bn-multiselect-tags" name="tags" multiple hidden>…</select>
</div>
```

Accessibility: each remove button has an `aria-label`; the hidden native select keeps the value submittable.

## Alert

`renderAlert(content, options?)` → `string`. The first argument is the message HTML; there is no `type`/`message` option.

```js
renderAlert('Changes saved!', { variant: 'success', dismissible: true })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `variant` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | Emitted as `data-variant` |
| `dismissible` | `boolean` | `false` | Adds a dismiss button |

Renders:

```html
<div data-bn="alert" data-variant="success" role="status">
  <span data-bn="alert-content">Changes saved!</span>
  <button data-bn="alert-dismiss" type="button" aria-label="Dismiss">×</button>
</div>
```

Accessibility: `error` and `warning` use `role="alert"` (assertive); `info` and `success` use `role="status"` (polite). `attrs` is not supported.

## Toast

Client side: `createToaster(options?)` → `Toaster`, `showToast(toaster, options?)` → toast id (`string`), `dismissToast(toaster, id)`. Server side: `renderToastContainer(position?)` → `string`.

```js
import { createToaster, showToast, dismissToast } from '@basenative/components';

const toaster = createToaster({ position: 'top-right', duration: 5000 });
const id = showToast(toaster, { message: 'Saved!', variant: 'success' });
dismissToast(toaster, id);
```

| Function | Option | Type | Default |
|----------|--------|------|---------|
| `createToaster` | `position` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` |
| `createToaster` | `duration` | `number` (ms) | `5000` |
| `showToast` | `id` | `string` | next deterministic `bn-toast-<n>` id |
| `showToast` | `message` | `string` | `''` |
| `showToast` | `variant` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` |
| `showToast` | `duration` | `number` (ms; `0` or negative disables auto-dismiss) | `toaster.duration` |

`Toaster` is `{ position, duration, toasts }` where `toasts` is a `Signal<ToastItem[]>` from `@basenative/runtime`; render the queue with your own template. `renderToastContainer('top-right')` (the argument is the position string, not a toaster) renders:

```html
<div data-bn="toast-container" data-position="top-right" role="region" aria-live="polite" aria-label="Notifications"></div>
```

## Table

`renderTable(options)` → `string`

```js
renderTable({
  columns: [{ key: 'name', label: 'Name', sortable: true }],
  rows: [{ name: 'Alice' }],
  emptyMessage: 'No data',
  caption: 'Users',
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `Array<{ key, label, sortable? }>` | `[]` | `sortable` adds `data-sortable` to the `<th>` |
| `rows` | `Array<Record<string, unknown>>` | `[]` | Cell values are stringified and escaped |
| `emptyMessage` | `string` | `'No data'` | Single full-width row when `rows` is empty |
| `caption` | `string` | `''` | `<caption>` |

Renders `<div data-bn="table-container"><table data-bn="table"><caption>…</caption><thead><tr><th scope="col" data-sortable>Name</th></tr></thead><tbody>…</tbody></table></div>`. Header cells carry `scope="col"`; `attrs` is not supported.

## Data Grid

`renderDataGrid(options)` → `string`. Sortable, selectable, paginated grid with a scroll region and a "Showing x–y of z" footer.

```js
renderDataGrid({
  columns: [
    { key: 'name', label: 'Name', sortable: true, width: '40%' },
    { key: 'total', label: 'Total', render: (v) => `$${v}` },
  ],
  rows: [{ id: 'r1', name: 'Acme', total: 120 }],
  sortBy: 'name', sortDir: 'asc', selectable: true, selectedRows: ['r1'],
  page: 1, pageSize: 50, totalRows: 300, caption: 'Invoices',
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `DataGridColumn[]` | `[]` | `{ key, label, sortable?, width?, resizable?, editable?, render?(value, row) }` |
| `rows` | `object[]` | `[]` | `row.id` (else the index) becomes `data-row-id` |
| `sortBy` | `string` | — | Key of the sorted column (adds `data-sorted` and an arrow) |
| `sortDir` | `'asc' \| 'desc'` | `'asc'` | |
| `page` | `number` | `1` | 1-indexed, footer only |
| `pageSize` | `number` | `50` | Footer only — rows are not sliced |
| `totalRows` | `number` | `rows.length` | Footer total |
| `selectable` | `boolean` | `false` | Select-all header checkbox plus a checkbox per row |
| `selectedRows` | `Array<string \| number>` | `[]` | Row ids whose checkbox is checked |
| `emptyMessage` | `string` | `'No data'` | |
| `caption` | `string` | — | `<caption>` and the scroll region's `aria-label` (falls back to `'Data grid'`) |
| `id` | `string` | `bn-datagrid-{n}` | |
| `attrs` | `string` | `''` | |

Renders:

```html
<div data-bn="datagrid" id="bn-datagrid-x">
  <div data-bn="datagrid-scroll" role="region" aria-label="Invoices" tabindex="0">
    <table data-bn="datagrid-table" role="grid">
      <caption>Invoices</caption>
      <thead><tr><th data-bn="datagrid-th-select"><input type="checkbox" aria-label="Select all" data-bn="datagrid-select-all"></th>
        <th data-bn="datagrid-th" data-key="name" data-sortable data-sorted="asc" aria-sort="ascending" style="width:40%" scope="col"><button type="button" data-bn="datagrid-th-button">Name ↑</button></th>…</tr></thead>
      <tbody><tr data-bn="datagrid-row" data-row-id="r1">
        <td data-bn="datagrid-td-select"><input type="checkbox" checked aria-label="Select row r1" data-bn="datagrid-row-select" data-row-id="r1"></td>
        <td data-bn="datagrid-td" data-key="name">Acme</td>…</tr></tbody>
    </table>
  </div>
  <div data-bn="datagrid-footer"><span data-bn="datagrid-info">Showing 1–50 of 300</span></div>
</div>
```

A `sortable` column's header is a real `<button type="button" data-bn="datagrid-th-button">` inside the `<th>` — the WAI-ARIA APG sortable-column-header pattern — so it is reachable with Tab and activatable with Enter/Space in every browser with no client-side JavaScript; a non-`sortable` column's `<th>` stays plain text. The currently-sorted `<th>` also carries `aria-sort="ascending"|"descending"`. Wiring that button's `click` to actually re-sort `rows` (and re-render with updated `sortBy`/`sortDir`) is left to the caller — the same division of labour as Table's `data-sortable`.

Accessibility: the scroll region is focusable (`tabindex="0"`) and labelled; every checkbox has an `aria-label`; `editable` columns render `contenteditable` cells; sortable headers are real, keyboard-operable `<button>`s (see above). Cell values are not escaped — escape user data in `render`.

## Tree

`renderTree(options)` → `string`

```js
renderTree({
  items: [{ id: 'src', label: 'src', children: [{ id: 'index', label: 'index.js' }] }],
  expanded: new Set(['src']),
  selected: 'index',
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `TreeNode[]` | `[]` | `{ id?, label, icon?, children? }`; `id` falls back to `label` |
| `expanded` | `Set<string>` | `new Set()` | Node ids whose children are rendered |
| `selected` | `string` | — | Id of the selected node |
| `id` | `string` | `bn-tree-{n}` | |
| `attrs` | `string` | `''` | |

Renders:

```html
<ul data-bn="tree" id="bn-tree-x" role="tree">
  <li data-bn="tree-item" role="treeitem" aria-expanded="true" aria-selected="false" data-node-id="src" data-level="0">
    <div data-bn="tree-item-content" tabindex="0"><button data-bn="tree-toggle" aria-label="Collapse" type="button">▾</button><span data-bn="tree-label">src</span></div>
    <ul data-bn="tree-children" role="group">…</ul>
  </li>
</ul>
```

Accessibility: `role="tree"` / `treeitem` / `group`; toggles are labelled Expand/Collapse. Leaf nodes carry no `aria-expanded` attribute. `[data-bn="tree-item-content"]` carries a static roving `tabindex`: the first item in document order gets `tabindex="0"`, every other item gets `tabindex="-1"`, so Tab reaches the tree at all. This package renders markup only — there is no `initTree()` shipped that moves that `tabindex` on arrow-key presses — so a caller that wants full arrow-key roving between items must add its own keydown handler that updates `tabindex` and calls `.focus()` as it moves.

## Tree Grid

`renderTreeGrid(options)` → `string`. A `<table role="treegrid">` whose first column is indented per nesting level.

```js
renderTreeGrid({
  columns: [{ key: 'name', label: 'Name' }, { key: 'size', label: 'Size' }],
  items: [{ id: 'src', name: 'src', size: '—', children: [{ name: 'index.js', size: '2 KB' }] }],
  expanded: new Set(['src']),
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `Array<{ key, label }>` | `[]` | |
| `items` | `TreeGridNode[]` | `[]` | Column values keyed by `key`, plus `id?` (falls back to the first column's value) and `children?` |
| `expanded` | `Set<string>` | `new Set()` | |
| `id` | `string` | `bn-treegrid-{n}` | |
| `attrs` | `string` | `''` | |

Renders `<table data-bn="treegrid" role="treegrid">` with `<th scope="col">` headers and one `<tr data-bn="treegrid-row" role="row" aria-level="1" data-node-id="src">` per visible node; a row with children also carries `aria-expanded` (`"true"` or `"false"`), while leaf rows carry no `aria-expanded` attribute. The first cell is prefixed with `<span data-level="0">▸ </span>`.

Like Tree, `[data-bn="treegrid-row"]` carries a static roving `tabindex` (first row `0`, every other row `-1`) with no client-side `initTreeGrid()` shipped to move it between rows on arrow keys — see the Tree accessibility note above for what that means for keyboard navigation.

## Virtual List

`renderVirtualList(options)` → `string`. Server-renders only the first window of items inside a spacer sized for the whole list; a client hydrator can swap the window on scroll.

```js
renderVirtualList({
  items: rows,
  itemHeight: 32,
  containerHeight: 480,
  renderItem: (row, i) => `<div data-bn="virtual-item" data-index="${i}">${row.name}</div>`,
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `T[]` | `[]` | |
| `itemHeight` | `number` (px) | `40` | |
| `containerHeight` | `number` (px) | `400` | |
| `renderItem` | `(item, index) => string` | wraps `${item}` in `[data-bn="virtual-item"]` | |
| `overscan` | `number` | `5` | Extra items rendered beyond the visible count (applied twice) |
| `id` | `string` | `bn-virtual-{n}` | |
| `attrs` | `string` | `''` | |

Renders:

```html
<div data-bn="virtualizer" id="bn-virtual-x" style="height:400px;overflow:auto">
  <div data-bn="virtual-spacer" style="height:{items.length * itemHeight}px;position:relative">
    <div data-bn="virtual-window" style="position:absolute;top:0;left:0;right:0" data-item-height="40" data-total="{items.length}">…</div>
  </div>
</div>
```

## Pagination

`renderPagination(options)` → `string`. Returns `''` when `totalPages <= 1`.

```js
renderPagination({ currentPage: 2, totalPages: 10, baseUrl: '/users' })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `currentPage` | `number` | `1` | 1-indexed |
| `totalPages` | `number` | `1` | |
| `baseUrl` | `string` | `''` | `?page=N` (or `&page=N`) is appended |
| `window` | `number` | `2` | Page links either side of the current page; gaps become `…` |

Renders `<nav data-bn="pagination" aria-label="Pagination"><ul>…</ul></nav>` with `rel="prev"`/`rel="next"` links, `aria-current="page"` on the active link, `aria-disabled="true"` spans at the ends and `[data-bn="pagination-ellipsis"]` gaps. `attrs` is not supported.

## Badge

`renderBadge(content, options?)` → `string`. `content` is escaped.

```js
renderBadge('Active', { variant: 'success' })
```

`variant`: `'default' | 'primary' | 'success' | 'warning' | 'error'` (default `'default'`). Renders `<span data-bn="badge" data-variant="success">Active</span>`. `attrs` is not supported.

## Card

`renderCard(options)` → `string`

```js
renderCard({ header: 'Title', body: '<p>Content</p>', footer: 'Footer' })
```

Options: `header`, `body`, `footer` (HTML strings, default `''`; header/footer omitted when empty) and `variant` (`string`, default `'default'`, emitted as `data-variant`). Renders:

```html
<article data-bn="card" data-variant="default">
  <header data-bn="card-header">Title</header>
  <div data-bn="card-body"><p>Content</p></div>
  <footer data-bn="card-footer">Footer</footer>
</article>
```

`attrs` is not supported.

## Avatar

`renderAvatar(options)` → `string`. Shows an image, or up to two initials derived from `name` (`'?'` when no name).

```js
renderAvatar({ name: 'Ada Lovelace', size: 'lg' })
renderAvatar({ src: '/ada.png', alt: 'Ada Lovelace', shape: 'square' })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `src` | `string` | — | Image URL |
| `alt` | `string` | `''` | Image alt; falls back to `name` |
| `name` | `string` | — | Source of the initials and the fallback label |
| `size` | `'sm' \| 'default' \| 'lg' \| 'xl'` | `'default'` | |
| `shape` | `'circle' \| 'square'` | `'circle'` | |
| `attrs` | `string` | `''` | |

Without `src`: `<span data-bn="avatar" data-size="lg" data-shape="circle" role="img" aria-label="Ada Lovelace"><span data-bn="avatar-initials">AL</span></span>` (the `aria-label` falls back to `'Avatar'`). With `src`: `<span data-bn="avatar" data-size="lg" data-shape="circle"><img src="…" alt="Ada Lovelace" data-bn="avatar-img"></span>` — the wrapper carries no `role`, since the `<img>`'s `alt` already gives it an accessible name.

## Progress

`renderProgress(options)` → `string`

```js
renderProgress({ value: 75, max: 100, label: 'Upload progress' })
```

Options: `value` (default `0`), `max` (default `100`), `label` (escaped `aria-label`), `attrs`. Renders `<progress data-bn="progress" value="75" max="100" aria-label="Upload progress">75%</progress>` — the text content is the percentage fallback.

## Spinner

`renderSpinner(options)` → `string`

```js
renderSpinner({ size: 'lg', label: 'Loading data' })
```

Options: `size` (`'sm' | 'default' | 'lg'`, default `'default'`) and `label` (`aria-label`, default `'Loading'`). Renders `<span data-bn="spinner" data-size="lg" role="status" aria-label="Loading data"><span aria-hidden="true"></span></span>`. `attrs` is not supported.

## Skeleton

`renderSkeleton(options)` → `string`

```js
renderSkeleton({ width: '200px', height: '1rem', count: 3 })
```

Options: `width` (default `'100%'`), `height` (default `'1rem'`), `variant` (`'text' | 'circle'`, default `'text'`), `count` (default `1`). Renders `count` copies of `<div data-bn="skeleton" data-variant="text" style="width:200px;height:1rem" aria-hidden="true"></div>`. `attrs` is not supported.

## Dialog

`renderDialog(options)` → `string`. Native `<dialog>`; `modal` selects the semantics the client should apply — a modal dialog (`aria-modal="true" data-modal="true"`) is opened with `showModal()`, a non-modal one (`data-modal="false"`) with `show()`.

```js
renderDialog({
  title: 'Delete project?',
  content: '<p>This cannot be undone.</p>',
  footer: renderButton('Delete', { variant: 'destructive' }),
  size: 'sm',
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | — | `<h2 data-bn="dialog-title">` |
| `content` | `string` | `''` | Body HTML |
| `open` | `boolean` | `false` | Adds `open` |
| `modal` | `boolean` | `true` | `true` adds `aria-modal="true" data-modal="true"`; `false` adds `data-modal="false"` |
| `closable` | `boolean` | `true` | Renders the close button |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | |
| `footer` | `string` | `''` | Footer HTML |
| `id` | `string` | `bn-dialog-{n}` | |
| `attrs` | `string` | `''` | |

Renders:

```html
<dialog data-bn="dialog" data-size="sm" id="bn-dialog-x" aria-modal="true" data-modal="true">
  <div data-bn="dialog-header"><h2 data-bn="dialog-title">Delete project?</h2><button data-bn="dialog-close" aria-label="Close" type="button">×</button></div>
  <div data-bn="dialog-body"><p>This cannot be undone.</p></div>
  <div data-bn="dialog-footer">…</div>
</dialog>
```

Accessibility: the native `<dialog>` handles focus trapping and Escape when opened with `showModal()`; the close button is labelled.

## Drawer

`renderDrawer(options)` → `string`. Side panel; the overlay is rendered as a sibling **before** the `<aside>`.

```js
renderDrawer({ title: 'Filters', content: '<form>…</form>', position: 'left', open: true })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | — | |
| `content` | `string` | `''` | |
| `open` | `boolean` | `false` | Adds `data-open` to the drawer and overlay |
| `position` | `'left' \| 'right'` | `'right'` | Emitted as `data-position` |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | |
| `closable` | `boolean` | `true` | |
| `overlay` | `boolean` | `true` | Renders `[data-bn="drawer-overlay"]` |
| `id` | `string` | `bn-drawer-{n}` | |
| `attrs` | `string` | `''` | |

Renders:

```html
<div data-bn="drawer-overlay" data-open></div><aside data-bn="drawer" data-position="left" data-size="default" id="bn-drawer-x" data-open role="dialog" aria-modal="true">
  <div data-bn="drawer-header"><h2 data-bn="drawer-title">Filters</h2><button data-bn="drawer-close" aria-label="Close" type="button">×</button></div>
  <div data-bn="drawer-body">…</div>
</aside>
```

Accessibility: `role="dialog" aria-modal="true"`; focus management is left to the caller because `<aside>` is not a native dialog.

## Tabs

`renderTabs(options)` → `string`

```js
renderTabs({
  tabs: [
    { id: 'overview', label: 'Overview', content: '<p>…</p>' },
    { id: 'settings', label: 'Settings', content: '<form>…</form>', disabled: true },
  ],
  activeTab: 'overview',
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tabs` | `Array<{ id, label, content?, disabled? }>` | `[]` | |
| `activeTab` | `string` | first tab's id | |
| `variant` | `'default' \| 'pills'` | `'default'` | |
| `id` | `string` | `bn-tabs-{n}` | Prefixes every tab and panel id |
| `attrs` | `string` | `''` | |

Renders:

```html
<div data-bn="tabs" data-variant="default" id="t">
  <div data-bn="tab-list" role="tablist">
    <button data-bn="tab" role="tab" id="t-tab-overview" aria-selected="true" aria-controls="t-panel-overview" data-tab="overview">Overview</button>…
  </div>
  <div data-bn="tab-panel" role="tabpanel" id="t-panel-overview" aria-labelledby="t-tab-overview">…</div>
  <div data-bn="tab-panel" role="tabpanel" id="t-panel-settings" aria-labelledby="t-tab-settings" hidden>…</div>
</div>
```

Accessibility: full `tablist`/`tab`/`tabpanel` wiring with `aria-controls` and `aria-labelledby`; inactive panels are `hidden`.

## Accordion

`renderAccordion(options)` → `string`. Native `<details>`/`<summary>`.

```js
renderAccordion({
  items: [{ title: 'Shipping', content: '<p>…</p>', open: true }, { title: 'Returns', content: '<p>…</p>' }],
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `Array<{ title, content, open? }>` | `[]` | `title` is escaped text; `content` is an HTML slot: not escaped |
| `multiple` | `boolean` | `false` | When false every `<details>` shares `name="{id}"`, so only one can be open |
| `id` | `string` | `bn-accordion-{n}` | |
| `attrs` | `string` | `''` | |

Renders `<div data-bn="accordion" id="…">` containing `<details data-bn="accordion-item" name="…" open><summary data-bn="accordion-header">Shipping</summary><div data-bn="accordion-content">…</div></details>` per item.

Accessibility: native disclosure semantics and keyboard handling; no JavaScript needed.

## Breadcrumb

`renderBreadcrumb(options)` → `string`

```js
renderBreadcrumb({ items: [{ label: 'Home', href: '/' }, { label: 'Projects', href: '/projects' }, { label: 'Alpha' }] })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `Array<{ label, href? }>` | `[]` | The last item is rendered as plain text; the others as links |
| `separator` | `string` | `'/'` | Rendered `aria-hidden` after each link |
| `attrs` | `string` | `''` | |

Renders:

```html
<nav data-bn="breadcrumb" aria-label="Breadcrumb">
  <ol data-bn="breadcrumb-list">
    <li data-bn="breadcrumb-item"><a href="/">Home</a><span data-bn="breadcrumb-separator" aria-hidden="true">/</span></li>
    <li data-bn="breadcrumb-item" aria-current="page">Alpha</li>
  </ol>
</nav>
```

## Tooltip

`renderTooltip(options)` → `string`. Popover-API tooltip: a trigger `<button>` with `popovertarget` followed by a `popover` span.

Per the HTML spec, only button-like elements (`<button>`, and `<input
type="button|submit|reset|image">`) can be popover invokers — a `<span
popovertarget>` never opens by click or keyboard, in any browser. `trigger`
is therefore always rendered as one of those elements:

- Plain text, or any markup not already starting with `<button` or `<input`,
  is wrapped in a fresh `<button type="button">`.
- A `trigger` that already starts with `<button` or `<input`
  (case-insensitive) is used **in place**, not wrapped — nesting one
  interactive element inside another is invalid HTML — and instead gets
  `data-bn="tooltip-trigger"`, `popovertarget`, `popovertargetaction="toggle"`,
  `aria-describedby` and `attrs` spliced onto that existing tag.

```js
renderTooltip({ trigger: 'Hover me', content: 'More information', position: 'bottom' })
// or, supplying your own invoker:
renderTooltip({ trigger: '<button type="button">?</button>', content: 'More information', position: 'bottom' })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `content` | `string` | — | Tooltip text; escaped (not an HTML slot) |
| `trigger` | `string` | — | HTML slot: not escaped; pass trusted markup only. Wrapped in a `<button type="button">` invoker unless it already starts with `<button` or `<input` |
| `position` | `string` | `'top'` | Emitted as `data-position` |
| `id` | `string` | `bn-tooltip-{n}` | Popover id |
| `attrs` | `string` | `''` | Extra attributes spliced onto the trigger invoker |

Renders, for a plain-text or non-invoker `trigger`:

```html
<button type="button" data-bn="tooltip-trigger" popovertarget="id" popovertargetaction="toggle" aria-describedby="id">Hover me</button><span data-bn="tooltip" id="id" popover data-position="bottom" role="tooltip">More information</span>
```

or, for `trigger: '<button type="button">?</button>'`:

```html
<button data-bn="tooltip-trigger" popovertarget="id" popovertargetaction="toggle" aria-describedby="id" type="button">?</button><span data-bn="tooltip" id="id" popover data-position="bottom" role="tooltip">More information</span>
```

Accessibility: `role="tooltip"`; the trigger is always a real button-like invoker, so it is reachable by Tab and toggles the popover natively on click or Enter/Space; `aria-describedby` on the trigger points at the tooltip id.

## Dropdown Menu

`renderDropdownMenu(options)` → `string`. Popover-API menu.

```js
renderDropdownMenu({
  trigger: 'Actions',
  items: [
    { label: 'Rename', action: 'rename', shortcut: 'F2' },
    { separator: true },
    { label: 'Delete', action: 'delete', disabled: true },
  ],
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trigger` | `string` | — | Trigger button HTML |
| `items` | `Array<{ label, action?, icon?, shortcut?, disabled? } \| { separator: true }>` | `[]` | `action` becomes `data-action` |
| `position` | `string` | `'bottom-start'` | Emitted as `data-position` |
| `id` | `string` | `bn-dropdown-{n}` | Popover id |
| `attrs` | `string` | `''` | |

Renders:

```html
<div data-bn="dropdown">
  <button data-bn="dropdown-trigger" popovertarget="bn-dropdown-x" type="button">Actions</button>
  <div data-bn="dropdown-menu" id="bn-dropdown-x" popover data-position="bottom-start" role="menu">
    <button data-bn="dropdown-item" role="menuitem" data-action="rename" type="button">Rename<span data-bn="dropdown-shortcut">F2</span></button>
    <hr data-bn="dropdown-separator" role="separator">
    <button data-bn="dropdown-item" role="menuitem" data-action="delete" aria-disabled="true" type="button">Delete</button>
  </div>
</div>
```

Accessibility: `role="menu"`/`menuitem`/`separator`; disabled items use `aria-disabled` (they stay focusable). Arrow-key navigation is not provided.

## Command Palette

`renderCommandPalette(options)` → `string`. Cmd+K style `<dialog>` with a search input and grouped commands.

```js
renderCommandPalette({
  commands: [
    { id: 'new', label: 'New file', shortcut: '⌘N', group: 'File' },
    { id: 'theme', label: 'Toggle theme', group: 'View' },
  ],
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `commands` | `Array<{ id?, label, action?, group?, icon?, shortcut? }>` | `[]` | Grouped by `group` (default `'Commands'`); `data-action` is `action ?? id` |
| `placeholder` | `string` | `'Type a command...'` | |
| `open` | `boolean` | `false` | Adds `open` |
| `id` | `string` | `bn-command-{n}` | |
| `attrs` | `string` | `''` | |

Renders:

```html
<dialog data-bn="command-palette" id="bn-command-x">
  <div data-bn="command-header"><input data-bn="command-input" type="text" placeholder="Type a command..." role="combobox" aria-expanded="true" autocomplete="off" autofocus></div>
  <div data-bn="command-list" role="listbox">
    <div data-bn="command-group" role="group" aria-label="File">
      <div data-bn="command-group-label">File</div>
      <button data-bn="command-item" role="option" data-action="new" type="button"><span data-bn="command-label">New file</span><kbd data-bn="command-shortcut">⌘N</kbd></button>
    </div>
  </div>
  <div data-bn="command-footer"><span>↑↓ Navigate</span><span>↵ Select</span><span>Esc Close</span></div>
</dialog>
```

Accessibility: `combobox` input over a `listbox` of `option`s grouped with labelled `group`s. Filtering and arrow-key navigation are left to client code.

## Calendar

`renderCalendar(options)` → `string`. A CSS-grid week view (7 days from `startDate`) with one drop-zone slot per hour and draggable event blocks.

```js
renderCalendar({
  startDate: '2025-06-02',
  events: [{ id: '1', title: 'Site visit', start: '2025-06-02T09:00', end: '2025-06-02T11:00', assignee: 'Ana' }],
  hours: { start: 7, end: 19 },
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `startDate` | `string` (YYYY-MM-DD) | — | First rendered day |
| `events` | `CalendarEvent[]` | `[]` | `{ id, title, start, end, status?, color?, assignee? }` |
| `hours` | `{ start?, end? }` | `{ start: 7, end: 19 }` | Rendered hour range |
| `emptyMessage` | `string` | `'No events'` | Shown when `events` is empty |
| `id` | `string` | `bn-calendar-{n}` | |
| `attrs` | `string` | `''` | |

Renders:

```html
<div data-bn="calendar" id="bn-calendar-x">
  <div data-bn="calendar-grid" style="--bn-calendar-hours: 12; --bn-calendar-cols: 7;">
    <div data-bn="calendar-corner"></div>
    <div data-bn="calendar-day-header" data-date="2025-06-02">Mon 6/2</div>…
    <div data-bn="calendar-time-gutter"><div data-bn="calendar-time-label" data-hour="7" style="grid-row: 1">7am</div>…</div>
    <div data-bn="calendar-day-column" data-date="2025-06-02" style="grid-column: 2">
      <div data-bn="calendar-slot" data-date="2025-06-02" data-hour="7" style="grid-row: 2"></div>…
      <div data-bn="calendar-event" draggable="true" data-event-id="1" title="Site visit" style="grid-row: 4 / span 2;">
        <span data-bn="calendar-event-title">Site visit</span><span data-bn="calendar-event-assignee">Ana</span><span data-bn="calendar-event-time">9:00 AM – 11:00 AM</span>
      </div>
    </div>
  </div>
</div>
```

Event times are formatted with `toLocaleTimeString` in the server's locale/time zone. `status` becomes `data-status`; `color` sets `--bn-calendar-event-color`.

## Pipeline Block

`renderPipelineBlock(options)` → `string`. A draggable card for use outside the calendar (e.g. an unscheduled-jobs sidebar); dropping it on a calendar slot reports `sourceType: 'pipeline'`.

```js
renderPipelineBlock({ id: 'job-7', title: 'Install boiler', subtitle: 'Acme Corp', status: 'pending' })
```

Options: `id` (required, `data-block-id`), `title` (required), `subtitle`, `status` (`data-status`), `attrs`. Renders `<div data-bn="pipeline-block" draggable="true" data-block-id="job-7" data-status="pending"><span data-bn="pipeline-block-title">…</span><span data-bn="pipeline-block-subtitle">…</span></div>`.

## Pipeline

`renderPipeline(options)` → `string`. Kanban board: columns of draggable cards.

```js
renderPipeline({
  columns: [{ id: 'new', title: 'New leads' }, { id: 'won', title: 'Won' }],
  cards: [{ id: 'c1', columnId: 'new', title: 'Acme Corp', subtitle: '$12k', description: 'Boiler replacement' }],
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `Array<{ id, title }>` | `[]` | |
| `cards` | `Array<{ id, columnId, title, subtitle?, description?, status? }>` | `[]` | Cards are placed by `columnId` |
| `id` | `string` | `bn-pipeline-{n}` | |
| `emptyMessage` | `string` | `'No items'` | Shown inside a column with no cards |
| `attrs` | `string` | `''` | |

Renders:

```html
<div data-bn="pipeline" id="bn-pipeline-x">
  <section data-bn="pipeline-column" data-column-id="new">
    <header data-bn="pipeline-column-header">New leads</header>
    <div data-bn="pipeline-column-cards">
      <article data-bn="pipeline-card" data-card-id="c1" draggable="true" title="Acme Corp">
        <div data-bn="pipeline-card-title">Acme Corp</div><div data-bn="pipeline-card-subtitle">$12k</div><div data-bn="pipeline-card-description">…</div>
      </article>
    </div>
  </section>
</div>
```

## Drag and Drop

`initCalendarDragDrop(container, { onDrop })` and `initPipelineDragDrop(container, { onCardMove })` attach native HTML5 drag-and-drop listeners to a rendered `[data-bn="calendar"]` or `[data-bn="pipeline"]` element. Both return `{ destroy() }`.

```js
import { initCalendarDragDrop, initPipelineDragDrop } from '@basenative/components';

const cal = initCalendarDragDrop(document.querySelector('[data-bn="calendar"]'), {
  onDrop: ({ eventId, date, hour, sourceType }) => { /* sourceType: 'event' | 'pipeline' */ },
});
const board = initPipelineDragDrop(document.querySelector('[data-bn="pipeline"]'), {
  onCardMove: ({ cardId, targetColumnId, position }) => { /* position is always null */ },
});
cal.destroy(); board.destroy();
```

While dragging, the dragged element gets `data-dragging` and the hovered slot/column gets `data-drop-target`; both are cleared on `dragend`. `eventId` is the `data-event-id` of a calendar event or the `data-block-id` of a pipeline block.

## Calendar State

`createCalendarState(options?)` → `CalendarState`. Framework-free event store with collision detection; works on the server (no DOM, no signals — each getter returns a fresh copy).

```js
import { createCalendarState } from '@basenative/components';

const cal = createCalendarState({ startDate: '2025-06-02', initialEvents: [] });
cal.addEvent({ id: '1', title: 'Meeting', start: '2025-06-02T09:00', end: '2025-06-02T10:00' });
cal.onEventMove = ({ eventId, date, hour }) => save(eventId, date, hour);
cal.moveEvent('1', '2025-06-03', 14); // null on collision (also calls onError)
```

| Member | Description |
|--------|-------------|
| `events()` / `selectedDate()` / `dragState()` | Current snapshot; `selectedDate()` starts as `startDate` |
| `getEvent(id)` | Event or `undefined` |
| `addEvent(event)` | Stores the event (`status` defaults to `'scheduled'`) and returns the stored copy |
| `removeEvent(id)` | `true` when removed |
| `moveEvent(id, date, hour, durationMinutes?)` | Re-schedules keeping the duration; returns the updated event or `null` on collision / unknown id |
| `updateEventProperties(id, overrides)` | Shallow merge; returns the updated event or `null` |
| `setDragState(id \| null)` | Stores the dragged id and calls `onDragStateChange` |
| `clearEvents()` | |
| `getEventsInRange(start, end = start)` / `getEventsForDay(date)` | Events overlapping the inclusive date range |
| `onEventChange`, `onEventMove`, `onError`, `onDragStateChange` | Assignable callbacks, initially `null` |

`onEventChange` receives `{ type: 'add' \| 'remove' \| 'move' \| 'update', event }` or `{ type: 'clear' }`; `onError` receives `{ type: 'collision', eventId, targetDate, targetHour }`. The `hours` option listed in the source JSDoc is accepted but ignored.

Helpers: `eventsCollide(a, b)` → `boolean` (half-open interval overlap of `start`/`end`), `updateEvent(event, overrides)` → merged copy, `getEventDuration(start, end)` → whole minutes.

## Pipeline State

`createPipelineState(options?)` → `PipelineState`. Kanban store matching `renderPipeline`.

```js
import { createPipelineState } from '@basenative/components';

const board = createPipelineState({
  columns: [{ id: 'new', title: 'New' }, { id: 'won', title: 'Won' }],
  initialCards: [{ id: 'c1', columnId: 'new', title: 'Acme' }],
});
board.onCardMove = ({ cardId, targetColumnId }) => save(cardId, targetColumnId);
board.moveCard('c1', 'won');
```

| Member | Description |
|--------|-------------|
| `columns()` / `cards()` / `dragState()` | Current snapshot |
| `getCard(id)` / `getColumn(id)` | |
| `addCard(card)` | Requires `id`, `columnId`, `title` |
| `removeCard(id)` | `true` when removed |
| `moveCard(id, targetColumnId, position?)` | Returns the updated card, or `null` when the card or column is unknown |
| `reorderCards(columnId, cardOrder)` | Sorts that column's cards by the given id order |
| `updateCard(id, overrides)` | Shallow merge |
| `getCardsInColumn(columnId)` | |
| `setDragState(id \| null)` | |
| `onCardChange`, `onCardMove`, `onDragStateChange` | Assignable callbacks, initially `null` |

`onCardChange` receives `{ type: 'add' \| 'remove' \| 'move' \| 'update', card }` or `{ type: 'reorder', columnId, cardOrder }`.

## Layout Grid

`renderLayoutGrid(options?)` → `string` and `layoutGridStyles()` → `string`. A CSS-grid canvas for `@basenative/visual-builder`; cells become draggable when `editable` is set.

```js
renderLayoutGrid({
  columns: 12,
  cells: [{ id: 'hero', colSpan: 12, content: '<h1>Hero</h1>' }, { id: 'side', colSpan: 4 }, { id: 'main', colSpan: 8 }],
  editable: true,
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `number` | `12` | `grid-template-columns: repeat(n, 1fr)` |
| `gap` | `string` | `'1rem'` | |
| `minCellHeight` | `string` | `'4rem'` | |
| `cells` | `Array<{ id?, label?, content?, colSpan?, rowSpan? }>` | `[]` | `content` falls back to `label`, then `Cell N`; `id` falls back to `cell-{index}` |
| `id` | `string` | `'layout-grid'` | |
| `editable` | `boolean` | `false` | Adds `draggable="true"` to every cell |

Renders `<div data-bn="layout-grid" id="layout-grid" style="display:grid;grid-template-columns:repeat(12,1fr);gap:1rem">` containing `<div data-bn="layout-cell" data-cell-id="hero" style="grid-column: span 12; grid-row: span 1; min-height: 4rem" draggable="true">…</div>` per cell. This component uses inline `style` for its grid geometry and is not covered by `components.css`; inject `layoutGridStyles()` into a `<style>` tag. `attrs` is not supported.

## Design Tokens

See `tokens.css` for the full list. Key tokens:

- Colors: `--bn-color-primary-50` … `--bn-color-primary-900`, `--bn-color-surface(-raised|-muted|-subtle|-inset|-inverse)`, `--bn-color-text(-muted|-subtle|-link|-inverse)`, `--bn-color-border(-strong|-focus)`, status `--bn-color-{info,success,warning,error}(-bg|-border|-text)`
- Spacing: `--bn-space-0` through `--bn-space-16`
- Typography: `--bn-font-size-{xs,sm,base,lg,xl}`, `--bn-font-weight-{normal,medium,semibold,bold}`, `--bn-font-family`, `--bn-font-mono`
- Radius: `--bn-radius-sm`, `--bn-radius-md`, `--bn-radius-lg`, `--bn-radius-xl`, `--bn-radius-full`
- Shadows: `--bn-shadow-sm`, `--bn-shadow-md`, `--bn-shadow-lg`
- Focus and stacking: `--bn-focus-ring`, `--bn-z-dropdown`, `--bn-z-modal`, `--bn-z-toast`

## Theming

Dark mode activates via `prefers-color-scheme` or `data-theme="dark"` on any ancestor:

```html
<html data-theme="dark">
```

Density: `data-density="compact|default|spacious"` on any ancestor.
