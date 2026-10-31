// @ts-check
/* @basenative/components — the Holy Trinity component catalog.
   One implementation per component: its directory under src/
   (index.html template, styles.css, index.js view model). This
   module is the public surface: the registry and loader for
   server-side assembly, every component aggregate (its create()
   is the view-model factory), and the package utilities. The
   legacy string renderers (the render and init functions) were
   removed in 3.0 — see the migration note in docs/migration.md. */

// Deterministic ids (hydration needs explicit ids or identical render order + resetIds() per request)
export { nextId, resetIds } from './ids.js';

// The registry (validation + variant resolution) and the server loader
export { createRegistry, registry, validateTemplate, validateCss } from './registry.js';
export { loadRegistry, renderComponent, assembleStyles } from './loader.js';

// Every component: the aggregate carries name, root, create,
// registerVariants, template and styles.
export { accordion } from './accordion/index.js';
export { alert } from './alert/index.js';
export { appBar } from './app-bar/index.js';
export { appShell } from './app-shell/index.js';
export { avatar } from './avatar/index.js';
export { badge } from './badge/index.js';
export { breadcrumb } from './breadcrumb/index.js';
export { button } from './button/index.js';
export { calendar } from './calendar/index.js';
export { card } from './card/index.js';
export { checkbox } from './checkbox/index.js';
export { choiceGroup } from './choice-group/index.js';
export { codeBlock } from './code-block/index.js';
export { combobox } from './combobox/index.js';
export { commandPalette } from './command-palette/index.js';
export { datagrid } from './datagrid/index.js';
export { dialog } from './dialog/index.js';
export { drawer } from './drawer/index.js';
export { dropdownMenu } from './dropdown-menu/index.js';
export { emptyState } from './empty-state/index.js';
export { field } from './field/index.js';
export { form } from './form/index.js';
export { hero } from './hero/index.js';
export { input } from './input/index.js';
export { listGroup } from './list-group/index.js';
export { multiselect } from './multiselect/index.js';
export { pagination } from './pagination/index.js';
export { pipeline } from './pipeline/index.js';
export { progress } from './progress/index.js';
export { radio } from './radio/index.js';
export { rating } from './rating/index.js';
export { searchField } from './search-field/index.js';
export { segmentedControl } from './segmented-control/index.js';
export { select } from './select/index.js';
export { sidebar } from './sidebar/index.js';
export { siteFooter } from './site-footer/index.js';
export { stepper } from './stepper/index.js';
export { table } from './table/index.js';
export { tabs } from './tabs/index.js';
export { textarea } from './textarea/index.js';
export { themeToggle } from './theme-toggle/index.js';
export { toast } from './toast/index.js';
export { toggle } from './toggle/index.js';
export { toolbar } from './toolbar/index.js';
export { tooltip } from './tooltip/index.js';
export { tree } from './tree/index.js';
export { virtualizer } from './virtualizer/index.js';

// The toast queue factory (the toast component aggregate is above).
export { createToaster } from './toast/index.js';

// Calendar & pipeline state management (structured state the
// calendar/pipeline compositions move with moveEvent/moveCard).
export { createCalendarState, createPipelineState, eventsCollide, updateEvent, getEventDuration } from './calendar-state.js';

// Retained utilities: the skeleton placeholder and the visual
// builder layout grid predate the catalog and have no catalog
// counterpart.
export { renderSkeleton } from './skeleton.js';
export { renderLayoutGrid, layoutGridStyles } from './layout-grid.js';
