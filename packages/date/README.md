# @basenative/date

> Native date/time picker components using semantic HTML inputs

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/date
```

## Quick Start

```js
import { renderDatepicker, renderTimepicker, renderDateRange } from '@basenative/date';

// Render a date picker
const html = renderDatepicker({
  name: 'startDate',
  label: 'Start Date',
  value: '2024-01-15',
  min: '2024-01-01',
  max: '2024-12-31',
  required: true,
});

// Render a time picker
const timeHtml = renderTimepicker({
  name: 'startTime',
  label: 'Start Time',
  value: '09:00',
});

// Render a date range (two date inputs)
const rangeHtml = renderDateRange({
  startName: 'startDate',
  endName: 'endDate',
  startLabel: 'From',
  endLabel: 'To',
});
```

## Server-side rendering

```js
import { render } from '@basenative/server';
import { renderDatepicker } from '@basenative/date';

const page = render('<main>{{ datepicker }}</main>', {
  datepicker: renderDatepicker({ name: 'dob', label: 'Date of Birth' }),
});
```

## API

### `renderDatepicker(options?)`

Renders an `<input type="date">` wrapped in a labeled container. Returns an HTML string.

Options:

- `name` — Input `name` attribute.
- `label` — Label text (omitted if not provided).
- `value` — Initial value in `YYYY-MM-DD` format.
- `min` / `max` — Date range constraints in `YYYY-MM-DD` format.
- `required` — Adds the `required` attribute.
- `disabled` — Adds the `disabled` attribute.
- `id` — Element ID (auto-generated if omitted).
- `attrs` — Additional raw HTML attribute string appended to the input.

### `renderTimepicker(options?)`

Renders an `<input type="time">` with the same option shape as `renderDatepicker`, using `HH:MM` values.

### `renderDateRange(options?)`

Renders two linked date inputs (start and end). Options include all `renderDatepicker` options prefixed with `start` and `end` (e.g. `startName`, `endName`, `startLabel`, `endLabel`, `startValue`, `endValue`).

## License

MIT
