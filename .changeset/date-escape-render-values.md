---
'@basenative/date': patch
---

Escape caller-supplied values in `renderDatepicker`, `renderTimepicker` and
`renderDateRange`.

All three interpolated `name`, `value`, `min`, `max`, `step`, `id` and `label`
straight into the markup, so a value containing a double quote closed its
attribute and the remainder became real attributes — an event handler among
them. Attribute values now go through `escapeAttr` and label/legend text
through `escapeText`, matching what `@basenative/components` has always done.

`attrs` is unchanged: it stays a raw markup composition point, as documented.

This adds `@basenative/runtime` as a dependency of `@basenative/date`, which
previously had none.
