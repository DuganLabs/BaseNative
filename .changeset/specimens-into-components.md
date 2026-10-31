---
"@basenative/runtime": patch
"@basenative/components": minor
---

Specimen behaviour moved into the components. The combobox and multiselect now own their filtering (a pure function of the field text), open on focus, and land a chosen label in the composed input; the select's arrow keys open its popover; the dialog family's shared behavior dismisses from the header close control and on Escape outside showModal; the toolbar closes its overflow on Escape; the tree's toggle button toggles through the list's delegated click and focus survives a toggle's re-render; the datagrid's sort control sorts through a delegated header click; toast items and alerts dismiss through their own models; the theme toggle's template binds its change; the virtualizer's template binds its scroll. The catalog pages now only mount the specimens — public/specimens.js builds each view model from the demo's props and hydrates the component's template. In the runtime, a `{{ raw() }}` text interpolation now parses into real nodes on the client, matching the server (it previously stayed literal).
