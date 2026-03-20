# Limitations

BaseNative has addressed the core framework gaps. Remaining limitations:

Current limitations:

- no i18n framework
- no combobox, multiselect, or date/time components
- no tree, data grid, treegrid, or virtualizer components
- SSR streaming renders-then-chunks (not true progressive streaming)
- no CLI scaffolding tool

Template expressions intentionally support a safe subset of JavaScript-like syntax. They are not intended to run arbitrary program text.

If a UI requires complex logic, move that logic into named functions in your script and call those functions from the template.

## Resolved (previously listed)

- ~~no router package~~ → `@basenative/router`
- ~~no forms package~~ → `@basenative/forms`
- ~~no validation adapters~~ → built-in validators + `zodAdapter()`
- ~~no packaged component library~~ → `@basenative/components` (15 components)
- ~~no devtools~~ → `enableDevtools()` + `window.__BASENATIVE_DEVTOOLS__`
