---
'@basenative/components': patch
---

Combobox and multiselect collapse their popup when the filter matches nothing (new `expanded()` on the view model; `aria-expanded` follows it) instead of drawing an empty listbox.
