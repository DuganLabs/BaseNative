# @basenative/components API

All components render semantic HTML. Include the CSS:

```html
<link rel="stylesheet" href="@basenative/components/tokens.css" />
<link rel="stylesheet" href="@basenative/components/theme.css" />
```

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
