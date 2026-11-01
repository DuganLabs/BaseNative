---
'@basenative/components': minor
---

field: the field reports. `bindFieldValidation(root)` turns the browser's constraint validation into the field's report — `aria-invalid` on the control, the message in the field's `<output>` in place of its hint, `aria-describedby` on whichever shows — once a control is edited and left, clearing live as it is fixed; a form submit reports every field and focuses the first invalid one. input gains `name`, `placeholder`, `autocomplete`, `inputmode`, `required`, `readonly`, `pattern` (with `title` as its message), `min`, `max`, `step`, `minlength` and `maxlength`; textarea gains `name`, `required`, `minlength` and `maxlength`; form gains `statusMessage`, announced after a submit.
