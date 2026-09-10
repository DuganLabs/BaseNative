# @basenative/components API

All components render semantic HTML. Include the CSS:

```html
<link rel="stylesheet" href="@basenative/components/tokens.css" />
<link rel="stylesheet" href="@basenative/components/theme.css" />
```

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

```js
renderButton('Submit', { variant: 'primary', disabled: false })
```

Variants: `primary`, `secondary`, `destructive`, `ghost`. Sizes: `default`, `sm`, `lg`.

## Input

```js
renderInput({ name: 'email', label: 'Email', type: 'email', error: 'Required' })
```

## Textarea

```js
renderTextarea({ name: 'bio', label: 'Bio', rows: 5 })
```

## Checkbox

```js
renderCheckbox({ name: 'agree', label: 'I agree to terms', checked: false })
```

## Radio Group

```js
renderRadioGroup({
  name: 'plan',
  label: 'Plan',
  items: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }],
  selected: 'free',
})
```

## Toggle / Switch

```js
renderToggle({ name: 'notifications', label: 'Enable notifications' })
```

## Select

```js
renderSelect({
  name: 'country',
  label: 'Country',
  placeholder: 'Select...',
  items: [{ value: 'us', label: 'USA' }, { value: 'uk', label: 'UK' }],
})
```

## Alert

```js
renderAlert('Changes saved!', { variant: 'success', dismissible: true })
```

Variants: `info`, `success`, `warning`, `error`.

## Toast

```js
import { createToaster, showToast, dismissToast } from '@basenative/components';

const toaster = createToaster({ position: 'top-right', duration: 5000 });
showToast(toaster, { message: 'Saved!', variant: 'success' });
```

Server-side: `renderToastContainer('top-right')`

## Table

```js
renderTable({
  columns: [{ key: 'name', label: 'Name', sortable: true }],
  rows: [{ name: 'Alice' }],
  emptyMessage: 'No data',
  caption: 'Users',
})
```

## Pagination

```js
renderPagination({ currentPage: 2, totalPages: 10, baseUrl: '/users' })
```

## Badge

```js
renderBadge('Active', { variant: 'success' })
```

Variants: `default`, `primary`, `success`, `warning`, `error`.

## Card

```js
renderCard({ header: 'Title', body: '<p>Content</p>', footer: 'Footer' })
```

## Progress

```js
renderProgress({ value: 75, max: 100, label: 'Upload progress' })
```

## Spinner

```js
renderSpinner({ size: 'lg', label: 'Loading data' })
```

Sizes: `sm`, `default`, `lg`.

## Skeleton

```js
renderSkeleton({ width: '200px', height: '1rem', count: 3 })
```

Variants: `text`, `circle`.

## Design Tokens

See `tokens.css` for the full list. Key tokens:

- Colors: `--bn-color-primary-*`, `--bn-color-surface`, `--bn-color-text`, `--bn-color-border`
- Spacing: `--bn-space-1` through `--bn-space-16`
- Typography: `--bn-font-size-*`, `--bn-font-weight-*`
- Radius: `--bn-radius-sm`, `--bn-radius-md`, `--bn-radius-lg`
- Shadows: `--bn-shadow-sm`, `--bn-shadow-md`, `--bn-shadow-lg`

## Theming

Dark mode activates via `prefers-color-scheme` or `data-theme="dark"` on any ancestor:

```html
<html data-theme="dark">
```

Density: `data-density="compact|default|spacious"` on any ancestor.
