---
'@basenative/components': major
---

One component system: the Holy Trinity catalog (template + token-only styles + view model per component directory) is now the only implementation in @basenative/components. The legacy string renderers and client initialisers are removed — every `render*` function, every `init*` initialiser, the site-chrome renderers (header, app nav, app shell, footer) and the marketing renderers (hero, pricing, feature/stat cards, FAQ). Behavior that lived in the initialisers — the APG keyboard patterns for tabs, combobox, multiselect, command-palette, dropdown-menu, tree and datagrid, dialog open/close, calendar and pipeline moves, the toaster — now lives in each component's `create()` view model.

The package root exports the registry and loader (`createRegistry`, `registry`, `validateTemplate`, `validateCss`, `loadRegistry`, `renderComponent`, `assembleStyles`), every component aggregate, `createToaster`, the calendar-state helpers and the retained `renderSkeleton` / `renderLayoutGrid` utilities. Each component is also importable from its own subpath (`@basenative/components/<name>`), alongside new `./registry`, `./loader` and `./ids` subpaths. Migration guide: docs/migration.md.
