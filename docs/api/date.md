# @basenative/date

> Semantic date picker, time picker, and date range components rendered as native HTML inputs.

## Overview

`@basenative/date` renders date and time UI components as server-side HTML strings using native `<input type="date">`, `<input type="time">`, and a paired fieldset for date ranges. All components use `data-bn` attributes for progressive enhancement and follow the BaseNative axioms: no inline styles, semantic HTML only, and `display: contents` on host elements. Includes a `generateCalendarMonth` utility for custom calendar grid layouts.

## Installation

```bash
npm install @basenative/date
```

## Quick Start

```js
import { renderDatepicker, renderTimepicker, renderDateRange } from '@basenative/date';

// Render to an HTML string (use in SSR templates)
const dateInput = renderDatepicker({
  name: 'event_date',
  label: 'Event date',
  value: '2026-06-15',
  min: '2026-01-01',
  max: '2026-12-31',
  required: true,
});

const timeInput = renderTimepicker({
  name: 'event_time',
  label: 'Start time',
  value: '09:00',
});

const rangeInput = renderDateRange({
  nameStart: 'check_in',
  nameEnd: 'check_out',
  label: 'Stay duration',
});
```

## API Reference

### renderDatepicker(options)

Renders a date input wrapped in a `<div data-bn="datepicker">` container.

**Parameters:**
- `options.name` — `name` attribute for the `<input>`
- `options.label` — label text; omit to render without a label
- `options.value` — initial value in `YYYY-MM-DD` format; default `''`
- `options.min` — minimum date in `YYYY-MM-DD` format
- `options.max` — maximum date in `YYYY-MM-DD` format
- `options.required` — adds the `required` attribute; default `false`
- `options.disabled` — adds the `disabled` attribute; default `false`
- `options.id` — `id` attribute; auto-generated if omitted
- `options.attrs` — additional HTML attribute string appended to the `<input>`

**Returns:** HTML string.

**Output structure:**
```html
<div data-bn="datepicker">
  <label for="bn-date-event_date" data-bn="label">Event date</label>
  <input type="date" id="bn-date-event_date" name="event_date"
         min="2026-01-01" max="2026-12-31" required
         data-bn="datepicker-input">
</div>
```

---

### renderTimepicker(options)

Renders a time input wrapped in a `<div data-bn="timepicker">` container.

**Parameters:**
- `options.name` — `name` attribute
- `options.label` — label text
- `options.value` — initial value in `HH:MM` format; default `''`
- `options.min` — minimum time in `HH:MM` format
- `options.max` — maximum time in `HH:MM` format
- `options.step` — step in seconds (e.g. `900` for 15-minute intervals)
- `options.required` — default `false`
- `options.disabled` — default `false`
- `options.id` — auto-generated if omitted
- `options.attrs` — additional attribute string

**Returns:** HTML string.

---

### renderDateRange(options)

Renders a start/end date pair inside a `<fieldset data-bn="daterange">`.

**Parameters:**
- `options.nameStart` — `name` attribute for the start input; default `'start_date'`
- `options.nameEnd` — `name` attribute for the end input; default `'end_date'`
- `options.label` — `<legend>` text
- `options.valueStart` — initial start value in `YYYY-MM-DD` format; default `''`
- `options.valueEnd` — initial end value in `YYYY-MM-DD` format; default `''`
- `options.min` — minimum date applied to both inputs
- `options.max` — maximum date applied to both inputs
- `options.required` — default `false`
- `options.disabled` — default `false`
- `options.id` — base ID for the inputs; auto-generated if omitted
- `options.attrs` — additional attribute string on the `<fieldset>`

**Returns:** HTML string containing a fieldset with start and end date inputs separated by an en-dash.

---

### generateCalendarMonth(year, month)

Generates a calendar grid for a given month, suitable for building custom calendar components.

**Parameters:**
- `year` — four-digit year number
- `month` — zero-indexed month number (0 = January, 11 = December)

**Returns:** Object:
```js
{
  year: number,
  month: number,
  monthName: string,          // e.g. 'April'
  daysInMonth: number,
  weeks: Array<Array<       // 6-week grid
    null |                  // padding day
    { day: number, date: string } // date in 'YYYY-MM-DD' format
  >>
}
```

**Example:**
```js
const cal = generateCalendarMonth(2026, 3); // April 2026
for (const week of cal.weeks) {
  for (const day of week) {
    if (day) console.log(day.date); // '2026-04-01', etc.
  }
}
```

## Integration

All render functions return HTML strings for use in `@basenative/server` templates. Component values submitted through forms are standard HTML form values (`YYYY-MM-DD` strings) readable directly from `ctx.request.body` without any date parsing library.
