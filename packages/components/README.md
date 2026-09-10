# @basenative/components

> 32 modules of semantic UI components rendered as HTML strings — no framework, no client JavaScript required beyond three opt-in initialisers

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

The package exports 48 symbols from 32 source modules (re-exported through `src/index.js`): 34 `render*` helpers, the toast queue (`createToaster`, `showToast`, `dismissToast`, `renderToastContainer`), the tabs, calendar and pipeline client-side initialisers (`initTabs`, `initCalendarDragDrop`, `initPipelineDragDrop`), state stores and helpers, and two small utilities (`buttonVariants`, `layoutGridStyles`). Full reference with options tables, rendered markup and accessibility notes: [docs/api/components.md](../../docs/api/components.md). Type declarations ship in `types/index.d.ts`.

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
  ${renderAlert('Changes saved successfully.', { variant: 'info' })}
  ${renderButton('Submit', { variant: 'primary', type: 'submit' })}
  ${renderInput({ name: 'email', label: 'Email', type: 'email', required: true })}
`;
```

Two calling conventions exist, and the reference documents which applies to each function:

- content-first: `renderButton(content, options?)`, `renderAlert(content, options?)`, `renderBadge(content, options?)`
- options-only: everything else, e.g. `renderInput({ name, label, … })`

Most `render*` helpers accept an `attrs` string of extra HTML attributes that is spliced verbatim into the outermost element. `renderAlert`, `renderBadge`, `renderCard`, `renderTable`, `renderPagination`, `renderSpinner`, `renderSkeleton` and `renderLayoutGrid` do not.

## Styles

All styling lives in CSS cascade layers (`reset`, `tokens`, `layout`, `components`, `states`); components carry no inline styles except the geometry of the calendar, virtual list and layout grid.

The simplest option is the bundled entry, which imports every layer in the right order:

```html
<link rel="stylesheet" href="node_modules/@basenative/components/src/index.css">
```

```js
import '@basenative/components/css';
```

Each layer is also exported individually. **`@basenative/components/layers.css` declares the cascade order (`@layer reset, tokens, layout, components, states;`) and must be loaded first** whenever you import the individual files — otherwise the layers are ordered by first appearance and `states` may lose to `components`:

| Export | Contents |
|--------|----------|
| `@basenative/components/css` | `index.css` — imports everything below, in order |
| `@basenative/components/layers.css` | Layer order declaration — load first |
| `@basenative/components/reset.css` | `reset` layer |
| `@basenative/components/tokens.css` | `tokens` layer: design tokens and density scales |
| `@basenative/components/theme.css` | `tokens` layer: light/dark palettes (`prefers-color-scheme`, `data-theme`) |
| `@basenative/components/layout.css` | `layout` layer |
| `@basenative/components/components.css` | `components` layer: every `[data-bn]` component |
| `@basenative/components/states.css` | `states` layer: hover/focus/disabled/loading |

```js
import '@basenative/components/layers.css'; // first
import '@basenative/components/tokens.css';
import '@basenative/components/theme.css';
import '@basenative/components/components.css';
```

Dark mode: `prefers-color-scheme: dark` or `data-theme="dark"` on any ancestor. Density: `data-density="compact|default|spacious"`.

## API

All components are pure functions that return an HTML string. See [docs/api/components.md](../../docs/api/components.md) for options and markup.

### Form Controls
- `renderButton(content, options)` — Button with `variant` (`primary`, `secondary`, `ghost`, `destructive`), `size` (`sm`, `default`, `lg`), `disabled`, `type`.
- `renderInput(options)` — Text input with label, help text, and error state.
- `renderTextarea(options)` — Multiline text input.
- `renderCheckbox(options)` — Checkbox with label.
- `renderRadioGroup(options)` — Group of radio inputs in a `<fieldset>`.
- `renderToggle(options)` — Toggle/switch input (`role="switch"`).
- `renderSelect(options)` — `<select>` with option list.
- `renderCombobox(options)` — `<input>` + `<datalist>` combobox.
- `renderMultiselect(options)` — Multi-value select with removable tags.

### Feedback
- `renderAlert(content, options)` — Inline alert with `variant` (`info`, `success`, `warning`, `error`) and `dismissible`.
- `createToaster(options)` / `showToast(toaster, options)` / `dismissToast(toaster, id)` / `renderToastContainer(position)` — Toast notification system.
- `renderProgress(options)` / `renderSpinner(options)` — Progress bar and loading spinner.
- `renderSkeleton(options)` — Skeleton loading placeholder.

### Data Display
- `renderTable(options)` — Accessible `<table>` with columns and rows config.
- `renderDataGrid(options)` — Data grid with sorting indicators, row selection, editable cells and a pagination footer. Sortable headers are real `<button>`s inside the `<th>` — keyboard-operable with no client JS.
- `renderTree(options)` / `renderTreeGrid(options)` — Tree view and tree grid. Items/rows carry a static roving `tabindex` (first `0`, rest `-1`); moving it between items on arrow keys is left to your own keydown handler.
- `renderVirtualList(options)` — First window of a virtualised list plus a spacer for the full height.
- `renderBadge(content, options)` — Small status badge.
- `renderAvatar(options)` — User avatar with fallback initials.
- `renderPagination(options)` — Page navigation controls.

### Layout & Navigation
- `renderCard(options)` — Content card with optional header/footer.
- `renderDialog(options)` — Native `<dialog>`, named by its title (`aria-labelledby`) and described by an optional `description` (`aria-describedby`).
- `renderDrawer(options)` — Side drawer panel with overlay.
- `renderTabs(options)` — Tabbed content panels with a roving `tabindex`; `initTabs(root, { onChange?, activation? })` wires click / ArrowLeft / ArrowRight / Home / End switching, `aria-selected`, `tabindex` and panel `hidden` toggling (WAI-ARIA APG tabs pattern) and returns `{ select(id), active(), destroy() }`.
- `renderAccordion(options)` — `<details>`/`<summary>` accordion.
- `renderBreadcrumb(options)` — Breadcrumb navigation trail.
- `renderTooltip(options)` — Popover-API tooltip; the trigger renders as a real `<button type="button">` (or your own `<button>`/`<input>` slot, wired in place) since only button-like elements are valid popover invokers.
- `renderDropdownMenu(options)` — Popover-API dropdown menu.
- `renderCommandPalette(options)` — Keyboard-driven command palette.
- `renderLayoutGrid(options)` / `layoutGridStyles()` — Drag-and-drop CSS grid canvas for the visual builder, plus its CSS.

### Scheduling
- `renderCalendar(options)` — Week view with hourly drop zones and draggable events. Buckets by the local calendar date of each parsed timestamp (or `timeZone`), marks today (`now`), derives the hour range from the events, and repeats multi-day events per day.
- `renderPipelineBlock(options)` — Draggable card that can be dropped onto the calendar.
- `renderPipeline(options)` — Kanban board of columns and cards; columns are sections labelled by a header with a card count, cards take an escaped `badge` plus `actions`/`footer` HTML slots, and known `status` values get a token-driven accent.
- `initCalendarDragDrop(container, { onDrop, dragSource?, snapMinutes? })` / `initPipelineDragDrop(container, { onCardMove })` — Client-side HTML5 drag-and-drop; return `{ destroy() }`. Calendar drops report `minute`/`datetime` as well as the slot, `dragSource` lets a sidebar outside the calendar supply payloads, and pipeline drops report the real `position` within the target column.
- `createCalendarState(options)` / `createPipelineState(options)` — DOM-free stores with collision detection and change callbacks.
- `eventsCollide(a, b)` / `updateEvent(event, overrides)` / `getEventDuration(start, end)` — Calendar helpers.

### Utilities
- `buttonVariants(variant?, size?)` — Function returning the class string `bn-button bn-button--{variant} bn-button--{size}` for hand-written markup.

## License

Apache-2.0
