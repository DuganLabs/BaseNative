---
'@basenative/components': minor
'@basenative/builder': patch
---

The field root is now `<section variant="field">` instead of `<p>`. A `<p>` cannot hold a block control, so the HTML parser closed it at the first select or combobox and the label, control and hint fell out of the field. `variant: 'default'` still works and maps to `field`. The catalog native select carries `variant="native"` so it keeps its own chevron inside the box, and the builder palette emits the new field markup.
