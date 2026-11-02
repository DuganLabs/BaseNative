# @basenative/components

## 3.2.0

### Minor Changes

- ee5ae17: calendar: the month view pages. With no slots it renders its own grid and Previous/Next buttons from `year`/`month` state, names each button's target month, announces the new month, and fires `onMonthChange`.
- 3d16c15: The field root is now `<section variant="field">` instead of `<p>`. A `<p>` cannot hold a block control, so the HTML parser closed it at the first select or combobox and the label, control and hint fell out of the field. `variant: 'default'` still works and maps to `field`. The catalog native select carries `variant="native"` so it keeps its own chevron inside the box, and the builder palette emits the new field markup.
- 1134ecc: field: the field reports. `bindFieldValidation(root)` turns the browser's constraint validation into the field's report — `aria-invalid` on the control, the message in the field's `<output>` in place of its hint, `aria-describedby` on whichever shows — once a control is edited and left, clearing live as it is fixed; a form submit reports every field and focuses the first invalid one. input gains `name`, `placeholder`, `autocomplete`, `inputmode`, `required`, `readonly`, `pattern` (with `title` as its message), `min`, `max`, `step`, `minlength` and `maxlength`; textarea gains `name`, `required`, `minlength` and `maxlength`; form gains `statusMessage`, announced after a submit.
- 5ca4baf: field: `inline`, `drop` (file drop zone) and `code` (one-time code) variants; reveal, clear and stepper buttons, prefix/suffix and leading/trailing slots, required/optional marks, a success message and a live character count. input: `sm`/`lg` sizes, `accept`/`multiple`, read-only and disabled states, tabular numbers. textarea: auto-grow and `readonly`. form: a `<fieldset>` groups fields under its legend. The field's parts no longer inherit a page's global label, output and fieldset rules.
- e4eef9f: Code block owns its surface: the figure is the one card, the pre is transparent, focusable (`tabindex="0"`) with a token-driven focus ring, and code reads at subheadline size. App shell exposes `--size-app-shell-footer-inline-start` / `--size-app-shell-footer-inline` so a host can align the site footer to its content column. Syntax comment and tag colours retuned for AA contrast in light and dark.
- 67013fd: sidebar, app-shell: a `headerHtml` prop renders a masthead — at the top of the sidebar rail, and as a top bar on a phone where the rail is hidden (safe-area aware, hidden from 48rem) — with new `*-sidebar-header` and `*-app-shell-header` tokens. hero: the block margin token is `auto` inline, so the hero column centres instead of carrying an invalid shorthand. font: display tokens for a fluid 36–64px title (`font-display-size`, `-leading`, `-tracking`). The package description names the design system.
- 898544e: Subnav: a sticky one-row page nav that scrolls sideways (the current link stays in view), with an optional header slot for a search field; one row at ≥64rem. `search-field` takes a `placeholder`. Table: a `numeric` prop marks columns whose heading and cells align to the trailing edge in tabular figures. Toast: the stack takes one width and the message fills the item, so the dismiss action sits at its trailing edge; a fixed stack clears the phone app bar. The playground surface token is the card surface. theme: `--spacing-safe-top` is listed as upstream-owned. site: one page nav, search/filter and card recipe on Home, Compare, Components, Docs, AI, Playground and Builder; a centre-line scrollspy; the playground counter logs; a table scrolls inside its card instead of widening the page; compare verdict marks hang beside their first word (tokens `--size-compare-marker-hang`, `--spacing-compare-marker-top`).
- c33c958: Vertical rhythm is now part of the app shell. New tokens `--spacing-app-shell-section-gap` (48px on a phone, `--spacing-app-shell-section-gap-rail` 80px beside the rail) and `--spacing-app-shell-stack-gap` (16px) space the page's sections and the cards stacked inside them, so no page spaces its sections by hand. Adds `--spacing-20`, `--white-space-pre` and `--white-space-pre-wrap`. Code blocks, and bare reading `<pre>`s, wrap long lines on a phone (`--white-space-code-block-pre-phone`, `--overflow-wrap-code-block-pre-phone`) instead of clipping them at the card edge. The theme bridge lists `--spacing-20` as upstream-owned.
- 5ae07f7: A named select takes part in a form: the popover variant submits its value through a hidden input, and the native variant's `<select>` carries `name`. Select options are 44px rows, and the `data-bn` sidebar's links are 44px and stack above the content on a phone. site: the enterprise example renders its components as markup (they printed as escaped text), its New User form posts, and its role picker is the custom select, and it links the catalog sheet so its controls are styled.
- 6d735e2: Devtools move to `@basenative/runtime/devtools` so the runtime bundle stays under 10KB. The component token sheet is the one source for the site palette, with body text that clears WCAG AA and one card elevation.

### Patch Changes

- a302ee4: app-shell: after a stacked header with no hero actions, content follows at the header gap (`--spacing-app-shell-header-gap` 32px, `--spacing-app-shell-header-gap-rail` 40px) rather than the full section gap.
- 252d068: Site: one deploy, one version. Every page maps the bare `/basenative.js` import to the deploy's versioned bundle with an import map, the specimens fetch component templates under the same version, and the playground preview document is stamped the same way. A cached bundle or template can no longer outlive a deploy and break the interactive specimens.
- b2e4967: button: a button no longer adds its own inline margin beside a sibling button, so a row's gap is its only spacing and wrapped rows align (removes `--spacing-button-margin-inline-start-adjacent`). hero: the actions gap is 16px (`spacing-4`), so wrapped actions keep a full block gap.
- 579126b: Checkbox labels and radio option rows hold the 44px touch target (`--size-checkbox-min-block`, `--size-radio-option-min-block`), so the control itself keeps its own size.
- e17fb75: Code block: a caption that carries an action (a copy button) is the button's height, with the action at the bar's far end.
- 3b54d73: Code block: code never wraps. Each source line stays one line, a long line scrolls sideways inside the card, and the page never widens.
- 7048c41: Site: inline code wraps between identifier parts. Scorecard and comparison cells offer a break after each dot or slash and at snake_case words, and path code on component and docs pages breaks after its slashes, so no identifier splits inside a name on a phone. The layout audit enforces it (`ident`).
- 86fd2cf: Combobox: the input now shows the select's chevron, centred inside the field, with end padding so typed text never runs under it. It turns when the list opens and passes clicks through to the input.

  The engine's search clear button no longer draws beside the chevron.

- abba8d8: Combobox and multiselect collapse their popup when the filter matches nothing (new `expanded()` on the view model; `aria-expanded` follows it) instead of drawing an empty listbox.
- 7e18c9a: The docs-site tokens now live in the one token sheet (`tokens.css`, from `tokens/site.json`), and DESIGN.md is the design contract. No computed value changed.
- 5d75306: Form controls polish. Select: full APG listbox-button keyboard support (arrows, Home, End, type-ahead, Enter/Space, Tab) with an active row distinct from a trailing checkmark for the chosen option. Multiselect: the same checkmark/active idiom, lighter chips with 44px drawn-✕ targets named per option, no native search clear. Option rows are 44px under a coarse pointer. Radio and choice-group legends align with their options; radio rows are flush 44px targets.
- a4c56a6: Docs site: every form specimen (input, textarea, select, combobox, multiselect, search field, field, form) now renders at one width, filling the pane on a phone and stopping at a shared `--measure-field` on wide screens.
- b04eedf: App bar: More menu labels sit on the vertical centre of their 44px rows, aligned to the start.
- 680ebbd: The alert's dismiss control takes its own grid column instead of overlaying the body, so a text button never covers the message. The fixed app bar sits on a new chrome layer (`--layer-chrome`, `--layer-app-bar`) above raised content.
- 79b2714: Pagination: in the compact window each gap takes the row's spare width (16px up to 32px), so its glyph clears the current-page pill.
- a302ee4: Pagination: the current page sits on a tinted pill instead of reading as a heavier digit.
- 04e8c58: Pagination keeps the first and last pages on a narrow pane (`1 … 3 … 8`), turns Previous/Next into centred chevrons there, and draws gaps and disabled steps in an inert ink instead of the link tint. The registry now also rejects bound `:data-` attributes.
- ad0f5d0: One stack primitive for every page: any block surface (figure, table, pre, details, article, section, form, dl, iframe, listed ul/ol) that follows another inside a section is set off by the stack gap, whether or not it carries a variant. Component pages no longer stack the registry table and source cards with no gap. The stack is a layout-layer default that skips the inside of any component, so grids keep their own gap and the section gap always wins.
- 3ff13b7: Hero actions no longer add a top margin inside the caption's gap (`--spacing-hero-actions-margin-block-start` is 0); the caption gap alone spaces them.
- df9f0c3: Table code now wraps with `overflow-wrap: break-word` instead of `anywhere`, so a column keeps room for each identifier part and a name never breaks mid-word on wider monospace fonts.
- 940351a: Table: on a narrow container each cell's key is its own line above the value, and key/value pairs are spaced so they group.
- 625b9d0: Table columns wrap between words: cells use `break-word` instead of `anywhere`, so a column never shrinks below its longest word, column headings hold one line, and only `code` inside a cell wraps at any character. The datagrid sort header keeps its chevron inline after the label and centred on it, and drops the sorted-column fill.
- a065beb: Every control is a 44px tap target. Pagination, breadcrumb, footer, tab, dropdown-menu, list-group link, tree and app-bar items reserve `--size-target-min`; app-bar items keep the minimum at every width. A narrow pagination keeps one row by dropping far pages in a container query (`--display-pagination-item-compact`). Tree leaf text now lines up with toggle labels. Builder palette and toolbar buttons are 44px at every width.
- d69b8fc: Text holds WCAG AA in light mode. The ghost button and info badge paint the strong tint. The light `-strong` status colors are deepened so they clear 4.5:1 on their own fills. The destructive button paints the new `--color-danger-solid` / `--color-danger-solid-pressed`, so its white label clears 4.5:1 in both schemes. The completed stepper disc uses `--color-text-on-tint`, and a multiselect chip's remove action takes the chip label color.
- 1069e93: Tighten the design system for contrast and calm. Text that used the brand
  tint now uses `--color-tint-strong` (breadcrumb, pagination, alert title,
  toolbar more, search-field clear, app-bar current, site links), which clears
  WCAG AA in light and dark; the tint fill is softer; the hero is a plain page
  head with no frame; sidebar rows reach a 44px target; list groups sit on the
  raised grouped surface. The builder window fills its host column instead of
  breaking out under an app-shell rail, and its pane headings are sentence case.
- 6d4d501: Tree branches lead with a disclosure chevron that turns when the branch opens and toggles on click; the toggle reads in the item ink, and leaves reserve the chevron column so sibling labels align.
- 7860e99: tree: a branch's children render as its `role="group"` list directly inside the treeitem (pass `nested: true` when rendering the child list), so the markup is valid and the tree is one tree with one tab stop. The root list now handles the keys, selection and roving focus for nested items.
- Updated dependencies [67013fd]
- Updated dependencies [6d735e2]
  - @basenative/runtime@3.2.0
  - @basenative/forms@3.2.0

## 3.1.0

### Minor Changes

- f88c30b: Specimen behaviour moved into the components. The combobox and multiselect now own their filtering (a pure function of the field text), open on focus, and land a chosen label in the composed input; the select's arrow keys open its popover; the dialog family's shared behavior dismisses from the header close control and on Escape outside showModal; the toolbar closes its overflow on Escape; the tree's toggle button toggles through the list's delegated click and focus survives a toggle's re-render; the datagrid's sort control sorts through a delegated header click; toast items and alerts dismiss through their own models; the theme toggle's template binds its change; the virtualizer's template binds its scroll. The catalog pages now only mount the specimens — public/specimens.js builds each view model from the demo's props and hydrates the component's template. In the runtime, a `{{ raw() }}` text interpolation now parses into real nodes on the client, matching the server (it previously stayed literal).

### Patch Changes

- Updated dependencies [f88c30b]
  - @basenative/runtime@3.1.0
  - @basenative/forms@3.1.0

## 3.0.0

### Major Changes

- 8479fc7: One component system: the Holy Trinity catalog (template + token-only styles + view model per component directory) is now the only implementation in @basenative/components. The legacy string renderers and client initialisers are removed — every `render*` function, every `init*` initialiser, the site-chrome renderers (header, app nav, app shell, footer) and the marketing renderers (hero, pricing, feature/stat cards, FAQ). Behavior that lived in the initialisers — the APG keyboard patterns for tabs, combobox, multiselect, command-palette, dropdown-menu, tree and datagrid, dialog open/close, calendar and pipeline moves, the toaster — now lives in each component's `create()` view model.

  The package root exports the registry and loader (`createRegistry`, `registry`, `validateTemplate`, `validateCss`, `loadRegistry`, `renderComponent`, `assembleStyles`), every component aggregate, `createToaster`, the calendar-state helpers and the retained `renderSkeleton` / `renderLayoutGrid` utilities. Each component is also importable from its own subpath (`@basenative/components/<name>`), alongside new `./registry`, `./loader` and `./ids` subpaths. Migration guide: docs/migration.md.

### Patch Changes

- @basenative/forms@3.0.0
  - @basenative/runtime@3.0.0

## 2.4.0

### Patch Changes

- Updated dependencies [4f3a5bb]
  - @basenative/runtime@2.4.0
  - @basenative/forms@2.4.0

## 2.3.2

### Patch Changes

- Updated dependencies [fca7129]
  - @basenative/runtime@2.3.2
  - @basenative/forms@2.3.2

## 2.3.1

### Patch Changes

- 8b56bb1: Adaptive table and app-nav geometry. The Table component's narrow-width contract is now shipped, not just documented: `renderTable` labels every body and footer cell by default (`labelCells` defaults to true, stamping `srLabel` where a column has no visible label), the `[data-bn="table-container"]` wrapper is a named container, and `states.css` restacks the table against its own width under `@container table (max-width: 40rem)` — each row a block, each cell a line headed by its `data-label`, long unbroken content wrapping instead of clipping. The stack also resets cell `white-space`, so a consumer's wide-table `nowrap` (row headings are the common case) cannot pin a stacked cell open and force the table wide again. A table that opted out (`labelCells: false`) keeps the container's horizontal scroll. In the app nav, the More button renders inside the list in a cell of its own (`app-nav-more-cell`), so the bar's cells are equal width and its edge insets symmetric — as a content-sized flex child of the `<nav>` it measured 45.6px against 85.4px destination cells. Bar links lose their inline padding (the cell is the hit area) and labels can no longer unbalance a cell: cells carry `min-inline-size: 0` and a label ellipsises only when it truly cannot fit. Layout regression coverage for both contracts lives in `tests/e2e/adaptive.spec.js`, asserting rendered geometry (text rects inside cell boxes, cell widths, insets) rather than markup alone.
- bddc331: Tree and TreeGrid no longer overflow the call stack on deeply nested input. The shared node walk (`renderNodes`) rendered children by recursion and threw `RangeError: Maximum call stack size exceeded` at roughly 3,000 levels of nesting; it now walks with an explicit stack, producing byte-identical markup for ordinary inputs while depth is bounded by memory instead (verified to 100,000 levels). Regression coverage pins the exact pre-fix output for a mixed expanded/collapsed tree and a tree grid, plus the pathological-depth cases.
- @basenative/forms@2.3.1
  - @basenative/runtime@2.3.1

## 2.3.0

### Minor Changes

- 1e00b2f: App nav grows the two pieces a real phone-class surface needs. A material surface: the bar and rail now read `--bn-material-bg` / `--bn-material-backdrop` / `--bn-material-shadow` (opaque by default), so a platform token layer such as `@basenative/ios`'s glass ladder can glass them without component CSS changing. And a More overflow: pass `overflow` to `renderAppNav` and items past the bar's capacity (default 4) leave the phone-class bar for a More button and its sheet — the iOS tab-bar pattern, never a cram of wrapped labels — while the rail shows everything and hides the sheet; `initAppNav` wires the sheet's toggle (Escape and outside-click close, focus returns to the button). Also adds `renderListGroup`, the inset grouped list: a section heading, fact and link rows on one raised surface with hairline separators inset to the label edge, and an explanatory footer.

### Patch Changes

- 376c91b: App nav clearance now reserves the bar's full footprint: the phone-class page padding and the new scroll-padding include the bar's top border alongside its height token and the safe-area inset (the border was previously unreserved, leaving the last pixel row of a page under the bar), the More sheet's offset accounts for the same border, and at the unfolded class fragment targets clear the rail through scroll-padding-inline-start instead of the block-end reservation.
- 1dba9a9: Catalog review fixes. The app nav's keyboard sync is hardened: `initAppNav` now re-syncs on focus (the earliest keyboard signal, plus a settle pass), tracks the largest visual-viewport inset measured while a text-entry control holds focus — iOS reports the viewport in stages during a keyboard opening, and trusting the last report could leave the bar sunk back into the keyboard for the whole episode — and clears only when the keyboard is fully gone. Tooltips are placed with `position-area` and `position-try` span fallbacks, so a tooltip at a screen edge re-centres into the half that has room instead of painting off-screen or crushing into a sliver; the tooltip trigger joins the shared button-reset group (it previously rendered with user-agent button chrome) and the 24px target-size floor, and reads as plain text with a dotted underline. Dropdown menus gain flip position-try fallbacks for edge triggers. Avatars carry a `data-tone` (a stable hash of the name, 0–7) with a lit, ringed disc per tone, replacing the identical flat grey disc for every person. On coarse pointers the control-height ladder's default rung is 44px (2.75rem). Pipeline card titles/subtitles and calendar event titles no longer break words mid-word (`overflow-wrap: anywhere` removed). The drawer can no longer cover a sub-320px viewport edge to edge.
- 4c3dd72: Design pass over the catalog's visual layer. Combobox and multiselect labels (`[data-bn="label"]`) are styled at last — they previously matched no rule in the sheet and rendered as small grey user-agent text beside the field family's labels. The app nav is keyboard-aware: a new `--bn-app-nav-visual-inset` token carries the strip of the layout viewport covered by an on-screen keyboard (measured by `initAppNav` through `window.visualViewport`, pinch-zoom excluded), and the bar's and More sheet's bottom offsets read it, so the bar rides on top of the keyboard whole instead of floating mid-screen with its labels sliced; the rail posture pins the offset out. Card, dialog and drawer inline padding steps down from `--bn-space-6` to `--bn-space-5`, the hero's block padding dials in at phone widths, the skeleton shimmer is a theme-relative mix instead of a fixed grey stop, and the dropdown's anchor name is scoped to its wrapper so multi-dropdown pages pair each menu with its own trigger.
- @basenative/forms@2.3.0
  - @basenative/runtime@2.3.0

## 2.2.0

### Minor Changes

- 46bb7c1: Add `renderAppNav`: one primary nav that is a fixed bottom bar at phone class and a fixed side rail at the unfolded class — spanning a vertical fold (the iPhone Duo opened flat) or any viewport at least 939px wide. The adaptation is CSS alone, so a fold mid-task loses nothing: no second markup variant, no init, focus/scroll/aria-current untouched. Includes the `--bn-size-app-nav-bar` / `--bn-size-nav-rail` footprint tokens and the clearance rules that reserve exactly the bar's space for pages rendering it inside the page shell.

### Patch Changes

- @basenative/forms@2.2.0
  - @basenative/runtime@2.2.0

## 2.1.0

### Minor Changes

- bbedbac: Fill the design-system gaps that forced every property into one-off local builds. `@basenative/components` gains an exported field component (`renderField`, plus the `renderFormField` composer over the built-in controls), site chrome (`renderSiteHeader` with `initSiteHeader`, `renderSiteNav`, `renderSiteFooter`, `renderAppShell`), and marketing primitives (`renderHero`, `renderPricingCard`/`renderPricingCards`, `renderFeatureCard`, `renderStatCard`, `renderFaq`/`renderFaqItem`) — all in the existing idiom of pure render functions over `--bn-*` tokens, with matching styles in `components.css`, catalog and showcase entries, and API docs. `@basenative/icons` grows from 5 glyphs to a 29-icon core set covering the concepts product UI draws by hand today (dashboard, leads, jobs, campaigns, inventory, vehicles, reviews, reports, chat, settings, and the standard utility glyphs).

### Patch Changes

- @basenative/forms@2.1.0
  - @basenative/runtime@2.1.0

## 2.0.1

### Patch Changes

- Updated dependencies
  - @basenative/runtime@2.0.1
  - @basenative/forms@2.0.1

## 2.0.0

### Patch Changes

- Updated dependencies
  - @basenative/runtime@2.0.0
  - @basenative/forms@2.0.0

## 0.11.1

### Patch Changes

- ae4701e: First release on npmjs.org. `@basenative/*` moves off GitHub Packages, so installing any package no longer needs a token.

  Every package now declares a `types` condition for each JavaScript subpath, so TypeScript finds the declarations under `moduleResolution: "bundler"` and `"node16"`; ships without its test files; declares `sideEffects` for bundlers; and is published with an npm provenance attestation through trusted publishing.

  The version moves even where the code did not: the same version number already exists on GitHub Packages with different contents, and reusing it on npm would fail a consumer's lockfile integrity check when it switches registry.

- Updated dependencies [ae4701e]
  - @basenative/forms@1.0.5
  - @basenative/runtime@0.6.4

## 0.11.0

### Minor Changes

- aaffbe9: Make calendar events and pipeline cards movable by tap and by keyboard, not
  only by mouse drag.

  `initCalendarDragDrop` and `initPipelineDragDrop` bound only the HTML5 drag
  events, so on a phone or tablet nothing could be rescheduled at all (a touch
  drag fires no `dragstart`), and a keyboard user had no key that picked anything
  up — a WCAG 2.2 failure under 2.5.7 Dragging Movements and 2.1.1 Keyboard, and
  in GreenPut the product's only reschedule path.

  Both initialisers now add a select-then-place path beside the drag: one tap or
  click on an event or card picks it up (`data-picked`; a second tap cancels), one
  tap or click on a slot or column drops it, through the same `onDrop` /
  `onCardMove` payload — no consumer change. The same state machine runs from the
  keyboard: events, cards and pipeline blocks render with `tabindex="0"`; Enter or
  Space picks up, the arrow keys move the pending target (`data-drop-target`) by
  `snapMinutes` and by day on the calendar, or by position and column on the
  pipeline; Enter or Space drops; Escape cancels. Each calendar and pipeline
  renders one visually hidden instruction node (`[data-bn="calendar-help"]` /
  `[data-bn="pipeline-help"]`, `<id>-help`) that every movable block is
  `aria-describedby`, and a polite live region (`[data-bn="calendar-status"]` /
  `[data-bn="pipeline-status"]`) that announces pick-up, each move and the drop.
  Calendar events also carry `data-date` / `data-hour` / `data-minute` (their
  visible start) so the keyboard path begins where the event is. `components.css`
  styles `[data-picked]` beside `[data-dragging]`, and `bindDrag` accepts any
  event type, so one `destroy()` still tears every gesture down.

- 5a4f4a1: Ship the client initialisers the catalogue has been describing (BN-018, package half).

  `initCommandPalette`, `initDataGrid`, `initTree`, `initMultiselect`,
  `initVirtualList` and `initDropdownMenu` join `initTabs` and `initDrawer`:
  each takes the rendered root element, works off the existing `data-bn` hooks
  and native ARIA attributes, re-queries them on every interaction, and returns
  a handle with imperative methods and `destroy()`.

  - **Command palette** — typing filters by label substring (hiding empty
    groups), ArrowDown / ArrowUp rove `aria-activedescendant`, Enter or a click
    activates and closes, Escape closes, optional `hotkey: 'Mod+K'` toggles it.
    `renderCommandPalette` now gives every item an `id` and points the input's
    `aria-controls` at the list, so the footer's "↑↓ Navigate / ↵ Select / Esc
    Close" is finally true.
  - **Data grid** — a header button click emits `{ key, dir }` and moves
    `data-sorted` / `aria-sort` / the ↑↓ (without `onSort`, the rows are
    reordered in place, numeric-aware); select-all and the row checkboxes keep
    each other `checked` / `indeterminate` and emit the selection; arrow keys,
    Home and End rove focus between cells.
  - **Tree** — the toggle flips `aria-expanded` and shows / hides the child
    group, a click on the row selects, and the APG keys (arrows, Home, End,
    Enter, Space) move the roving `tabindex`. `renderTree` now renders a
    collapsed node's `[data-bn="tree-children"]` group `hidden` instead of
    omitting it, so expanding is an attribute flip rather than a round trip.
  - **Multiselect** — a tag's × deselects in the hidden `<select multiple>`,
    which stays the source of truth; Backspace on an empty input removes the
    last tag; Enter or a `<datalist>` pick adds one. `renderMultiselect` now
    backs the search input with a `<datalist>` of the item labels.
  - **Virtual list** — re-slices the window on `scroll` from the
    `data-item-height` already emitted and repositions it via `top`;
    `scrollTo`, `setItems`, `range`. `defaultRenderItem` is exported.
  - **Dropdown menu** — Arrow / Home / End between items, ArrowDown / ArrowUp
    on the trigger open it, activation calls `hidePopover()`.

  Types, `docs/api/components.md` and the source doc comments now agree on all
  of this; the data grid and tree comments no longer say the wiring is the
  caller's job.

- d0dff55: Bring checkbox, radio and toggle back into the control family, and give the
  selection controls their own tokens.

  The three selection controls had drifted out of the design system the text
  controls belong to. The toggle carried no border at all next to four outlined
  controls; the three of them were three hardcoded sizes; none had a hover,
  disabled or invalid treatment, so a disabled checkbox was pixel-identical to a
  live one while the input beside it correctly dimmed; and an `:indeterminate`
  checkbox — which the datagrid's select-all reaches on partial selection —
  rendered as an empty box, indistinguishable from "nothing selected".

  - New tokens: `--bn-color-control-selected` / `--bn-color-on-control-selected`
    (one selection colour for all three, where checkbox and radio previously
    painted `--bn-color-accent-600` and the toggle `--bn-color-primary-600`),
    `--bn-color-border-control-hover`, `--bn-control-indicator-size`,
    `--bn-radius-indicator`, and the `--bn-toggle-*` geometry derived from the
    indicator size.
  - `--bn-color-toggle-track-off` and `--bn-color-toggle-knob` now describe an
    outlined off state rather than a filled one, matching the unchecked checkbox.
  - `@basenative/theme` gains `control.indicator`, bridged as
    `--bn-theme-control-indicator`, so a theme that scales its control height
    scales the selection controls with it.
  - The datagrid's select-all and row-select checkboxes join the family. They
    carry their own `data-bn` names for the grid script, so they had never matched
    `[data-bn="checkbox"]` and rendered as raw user-agent checkboxes inside an
    otherwise fully themed table.
  - `input`, `textarea` and `select` now honour `--bn-radius-control`. They
    re-declared `--bn-radius-md` after the control primitive had applied it, so a
    consumer setting the token got a rounded button and a square input.

  Accessibility, in the same pass: the tree's roving `tabindex` moves onto the
  element carrying `role="treeitem"` rather than a presentational `<div>` inside
  it, and the virtual list's scroll port is keyboard-reachable and named.

- 2025896: Add `initDrawer(drawer, options)`, the client half of the drawer contract.

  `renderDrawer` marks a closed drawer `inert` and documented that "the client"
  removes it on open, but nothing shipped did, so an opened drawer's close button
  could not be clicked, tabbed to or read by assistive technology, and no scrim
  appeared. `initDrawer` returns `{ open, close, toggle, isOpen, destroy }`:
  `open()` lifts `inert`, adds `data-open` to the drawer and its overlay and moves
  focus to the close button (or the panel); `close()` reverses that and returns
  focus to the element that had it before. The close button, a click on the
  overlay (unless `dismissible: false`) and Escape all close it. The overlay is
  found as the drawer's preceding `[data-bn="drawer-overlay"]` sibling — what
  `renderDrawer` emits — or passed as `options.overlay`.

- 2c40bc7: Ship the two catalogue claims the stylesheet never backed. `[data-bn="textarea"]`
  now declares `field-sizing: content` and `resize: vertical`, so it grows with its
  value (the control-family floor keeps the starting height; engines without
  `field-sizing` still honour `rows`). `[data-bn="select"]` opts into
  `appearance: base-select` inside `@supports`, for itself and its
  `::picker(select)`. Both rules had existed only for the demo site's bare
  elements, scoped away from `[data-bn]`, so the catalogue described behaviour no
  consumer ever got.

### Patch Changes

- 2c40bc7: WCAG 2.5.8: `alert-dismiss` and breadcrumb links join the minimum-target block.
  The alert's × was the size of its glyph (~11×18px) and a breadcrumb link was its
  text line; both now resolve a 24×24 floor from `--bn-target-size-min` without
  changing what is visible. The block's comment records why `dialog-close`,
  `drawer-close`, `command-item` and `dropdown-item` clear the floor in their own
  rules, and the test suite now checks every member of the button-reset group
  against one or the other.
- 2025896: Fix calendar event placement for events not on the hour, and the one-row shift
  of every hour label and drop slot.

  `renderCalendar` emitted a fractional `grid-row` start (`grid-row: 4.5 / span 2`)
  for any event starting at 09:30, 10:15 or 14:45; the invalid declaration was
  dropped, and the absolutely positioned block fell back to covering its whole day
  column and swallowing every click and drag beneath it. Event rows are now
  integers, and the sub-hour remainder trimmed off the top and bottom of the row
  span travels in `--bn-calendar-event-rows`, `--bn-calendar-event-lead` and
  `--bn-calendar-event-trail`, which `components.css` turns into an inset offset —
  so a 09:30 booking still sits half a row down rather than being rounded onto the
  hour.

  Hour labels and drop slots were numbered for the outer grid (`+2`, past the
  header row) but live inside subgrids whose local row 1 already is the first hour
  row, so every row rendered one hour low, the last two hours shared one band, and
  the top band had no drop target. All three emissions now use `h - hours.start + 1`:
  7am is row 1 on the default grid, and a 9:00–11:00 event is `grid-row: 3 / span 2`.

- 2c40bc7: Pagination layout matches `:is(ul, ol)`. Every rule was scoped to `ul`, so a
  consumer's `<ol>` pager rendered as a browser-default numbered list while its
  links looked right.
- 2c40bc7: `[data-bn="virtualizer"]` takes `inline-size: 100%`. Its only descendant is
  absolutely positioned, so the box had no intrinsic width and collapsed to its
  two borders inside any flex parent — /components/virtual-list rendered as a
  2px sliver. The dead `[data-bn="virtual-window"] { position: relative }` rule
  (always beaten by the inline `position: absolute`) is gone.

## 0.10.0

### Minor Changes

- 84900fd: Bring checkbox, radio and toggle back into the control family, and give the
  selection controls their own tokens.

  The three selection controls had drifted out of the design system the text
  controls belong to. The toggle carried no border at all next to four outlined
  controls; the three of them were three hardcoded sizes; none had a hover,
  disabled or invalid treatment, so a disabled checkbox was pixel-identical to a
  live one while the input beside it correctly dimmed; and an `:indeterminate`
  checkbox — which the datagrid's select-all reaches on partial selection —
  rendered as an empty box, indistinguishable from "nothing selected".

  - New tokens: `--bn-color-control-selected` / `--bn-color-on-control-selected`
    (one selection colour for all three, where checkbox and radio previously
    painted `--bn-color-accent-600` and the toggle `--bn-color-primary-600`),
    `--bn-color-border-control-hover`, `--bn-control-indicator-size`,
    `--bn-radius-indicator`, and the `--bn-toggle-*` geometry derived from the
    indicator size.
  - `--bn-color-toggle-track-off` and `--bn-color-toggle-knob` now describe an
    outlined off state rather than a filled one, matching the unchecked checkbox.
  - `@basenative/theme` gains `control.indicator`, bridged as
    `--bn-theme-control-indicator`, so a theme that scales its control height
    scales the selection controls with it.
  - The datagrid's select-all and row-select checkboxes join the family. They
    carry their own `data-bn` names for the grid script, so they had never matched
    `[data-bn="checkbox"]` and rendered as raw user-agent checkboxes inside an
    otherwise fully themed table.
  - `input`, `textarea` and `select` now honour `--bn-radius-control`. They
    re-declared `--bn-radius-md` after the control primitive had applied it, so a
    consumer setting the token got a rounded button and a square input.

  Accessibility, in the same pass: the tree's roving `tabindex` moves onto the
  element carrying `role="treeitem"` rather than a presentational `<div>` inside
  it, and the virtual list's scroll port is keyboard-reachable and named.

## 0.9.0

### Minor Changes

- a5676c8: **Table: columns of figures, a footer, and labels that reach it.**

  `renderTable` could not express three things a data table needs the moment its
  values are money, counts or rates. Each had to be worked around in the
  consumer, which meant hand-editing the markup the renderer had just produced.

  - **`align` and `numeric` on a column.** `numeric: true` emits `data-numeric`
    and implies `align: 'end'`; an explicit `align` (`'start' | 'center' | 'end'`)
    wins, and an unknown value is dropped rather than emitted as an attribute no
    rule would match. The CSS gives numeric cells `font-variant-numeric:
tabular-nums lining-nums` and `white-space: nowrap`. Crucially the `<th>`
    carries the same attributes as its cells, so a heading can never drift out of
    alignment with the column under it — a left-aligned `Amount` over
    right-aligned figures breaks the vertical edge the eye tracks, and it was
    previously impossible to fix through the API. This is the supported form of
    the `cellAttrs: 'data-bn="num"'` workaround the previous release suggested,
    which styled nothing and never reached the header.
  - **`footer` rows.** A `<tfoot>` read with the same column keys and the same
    `render` / `cellAttrs` hooks as the body, the first cell of each row a
    `<th scope="row">`, styled above the accounting double rule. A totals row was
    previously unreachable.
  - **`emptyContent`** as an HTML slot beside the text-only `emptyMessage`, so an
    empty state can carry its own call to action (`No accounts yet. Connect a
bank →`).
  - **`labelCells` now labels footer cells too.** A stacked narrow-viewport
    layout hides `<thead>` and recovers each heading with
    `content: attr(data-label)`; a totals row that dropped out of that treatment
    was the one row on the page with no heading at all.

  Purely additive: no existing markup changes. A table that sets none of the new
  options renders byte-identically to the previous release.

  Decimal alignment remains the caller's half of the contract: right alignment
  plus tabular figures aligns decimal points only when every cell in a column
  renders the same number of fraction digits. Documented in
  `docs/api/components.md`.

## 0.8.0

### Minor Changes

- 37d2f5d: Make filled brand surfaces themable, and let badge/card/alert carry attributes.

  **Brand foregrounds.** Every foreground painted on a filled brand box was hardcoded
  to `--bn-color-white`: the primary and destructive button labels, the current page in
  pagination, the checkbox tick, the radio dot and the toggle knob. Re-pointing
  `--bn-color-primary-*` at a light brand hue therefore produced unreadable controls
  with no token to fix it — overriding `--bn-color-white` would repaint every white
  _surface_ in the sheet instead. Four new tokens name those foregrounds:

  | Token                    | Default                 |
  | ------------------------ | ----------------------- |
  | `--bn-color-on-primary`  | `--bn-color-white`      |
  | `--bn-color-on-accent`   | `--bn-color-on-primary` |
  | `--bn-color-on-error`    | `--bn-color-white`      |
  | `--bn-color-toggle-knob` | `--bn-color-white`      |

  Defaults are the previous values, so no existing theme changes. This was not
  hypothetical: T4BS's amber brand (`#e8920a`) would render a primary button at 2.46:1
  against white — it hand-rolled its own `[data-bn-button]` vocabulary instead of using
  `renderButton`, and Greenput invented a `--gp-color-primary-fg` token it had nowhere
  to connect. PendingBusiness, which _did_ adopt `renderDialog`/`renderButton`, was
  shipping a Confirm button at 3.66:1 and a destructive Revoke at 3.68:1 (2.72:1 on
  hover) — all below the 4.5:1 WCAG 1.4.3 floor, all fixed by setting one token.

  **`attrs` on `renderBadge`, `renderCard` and `renderAlert`,** plus `id` on
  `renderCard`. Without them a badge, card or alert was render-and-forget markup: it
  could not carry an `id`, an `aria-labelledby`, a `data-bn-bind` hydration hook or a
  test selector, which ruled it out of any app that wires signals to the DOM.

  **`--bn-radius-control` now reaches the button.** The shared control-geometry
  group applies `border-radius: var(--bn-radius-control)` to button/input/select/tab,
  and the `[data-bn="button"]` block a few rules later re-declared
  `border-radius: var(--bn-radius-md)` — same specificity, later in the sheet, so it
  won. A consumer that set `--bn-radius-control` got every control rounded except the
  button. The defaults are identical (`--bn-radius-control` aliases `--bn-radius-md`),
  so nothing moves unless the token is set.

  **Surfaces split from the page.** `--bn-color-surface` was doing two jobs: the page,
  and anything filled sitting on the page. Those are the same colour only on a light
  theme, so every dark-themed consumer that re-pointed it watched its inputs, selects,
  secondary buttons and cards dissolve into the page with a 1px border left. Two new
  tokens, both defaulting to `--bn-color-surface`:

  | Token                        | Applies to                                                                 |
  | ---------------------------- | -------------------------------------------------------------------------- |
  | `--bn-color-surface-control` | input, textarea, select, combobox input, checkbox, radio, secondary button |
  | `--bn-color-surface-card`    | card                                                                       |

  **`renderTable` can describe its cells.** Three additions, each one a thing a
  consumer had already built by hand:

  - `labelCells` stamps `data-label="<column label>"` on every body cell — the
    responsive stacked-table pattern (hide the `<thead>`, render each cell's heading
    from `content: attr(data-label)`). PendingBusiness hand-rolls its rows for exactly
    this.
  - `column.cellAttrs` (string, or `(value, row) => string`) appends attribute markup
    to a column's cells — `data-bn="num"` for numeric alignment, a test hook, an
    `aria-*`.
  - `column.srLabel` gives an accessible name to a column with no visible label.
    Without it the header was a bare `<th scope="col"></th>`, which axe flags;
    Greenput patches that in after mount, in a 100-line wrapper whose reason for
    existing is that the renderer had no per-cell hook at all.

  `[data-bn="sr-only"]` joins `components.css` to support `srLabel`: `reset.css` has
  the same recipe as a `.visually-hidden` class, but consumers whose house style
  forbids CSS classes never import that file.

  **`text` on `renderBadge`, `renderAlert` and `renderButton`** — an escaped label that
  replaces the unescaped `content` slot when present. These three almost always render
  data (a status, a server message, a record name), and the previous API made escaping
  a thing you had to remember at every call site.

## 0.7.1

### Patch Changes

- 9741b75: Public-readiness metadata sweep, no behavior change:

  - Add a per-package `LICENSE` file (Apache-2.0) — previously only the repo root
    carried one, so it was never included in the published tarball.
  - Fix `repository.url`/`homepage`/`bugs.url` to the correct `DuganLabs/BaseNative`
    casing with a `git+` prefix on `repository.url`, matching npm's convention; add
    the `bugs` field to `@basenative/eslint-config` and `@basenative/tsconfig`, which
    were missing it.
  - Normalize `publishConfig` to `{ "access": "public" }` across every publishable
    package. The previous per-package `registry` override duplicated the scope
    mapping `.npmrc` already sets for `@basenative:*` (and that the Release/publish
    workflows reassert via `actions/setup-node`'s `registry-url`/`scope` inputs), so
    it only added drift risk and would have blocked a future npmjs registry target.
  - Fix README `## License` sections that said `MIT` while `package.json` and the
    repo `LICENSE` say `Apache-2.0` (`auth`, `config`, `date`, `db`, `fetch`, `flags`,
    `fonts`, `forms`, `i18n`, `icons`, `logger`, `marketplace`, `middleware`,
    `notify`, `realtime`, `router`, `runtime`, `server`, `tenant`, `upload`,
    `visual-builder`); add a missing `## License` section to `builder` and `evals`.
  - Add the missing `README.md` for `@basenative/integrations` (Plaid Link +
    accounts/transfers, and the pure float-yield-optimization math).

  No `private`/version/`exports` changes. `@basenative/evals`, `fonts`, and `icons`
  stay private and are not part of this changeset.

- Updated dependencies [9741b75]
  - @basenative/forms@1.0.4
  - @basenative/runtime@0.6.3

## 0.7.0

### Minor Changes

- a1fc563: Close the upstream gaps GreenPut's platform app had to work around when it adopted this package (DuganLabs/GreenPut#91):

  - **Calendar — fix for UTC timestamps.** `renderCalendar` bucketed events into day columns with `event.start.startsWith(date)` while positioning rows by local hours, so the UTC ISO timestamps every API returns (`2025-06-03T03:00:00Z`) landed on the wrong day in any non-UTC zone. Events are now bucketed by the local calendar date of their parsed `start`/`end` — in an optional IANA `timeZone`, or through a `toLocalDate(value)` hook — so API timestamps and the `toISOString()` output of `createCalendarState().moveEvent()` render on the right day. Events whose `start` cannot be parsed are skipped instead of drawn in the first column. Consumers that pre-formatted local `YYYY-MM-DDTHH:mm` strings keep working unchanged.
  - **Calendar additions.** `now` (default `new Date()`, `null` to disable) marks today's header and column with `data-today` (the header also gets `aria-current="date"`), styled through new theme-safe `--bn-calendar-today-header-bg` / `--bn-calendar-today-text` / `--bn-calendar-today-bg` tokens. Whichever `hours` bound is omitted is derived from the events (7 / 19 widened to cover every rendered segment, clamped to 0–24). Multi-day events are repeated in every day column they cover, clipped to each day, with `data-continues="after" | "both" | "before"`. `invoiced`, `paid` and `cancelled`/`canceled` events are styled alongside `scheduled` / `in_progress` / `completed`.
  - **`initCalendarDragDrop(container, { onDrop, dragSource?, snapMinutes? })`.** `dragSource` lets a palette or sidebar of `renderPipelineBlock` cards outside the calendar supply drag payloads (any element, including an ancestor of the container). Drops now report `minute` (the pointer's offset within the slot, snapped down to `snapMinutes`, default 15) and `datetime` (`YYYY-MM-DDTHH:MM`) besides `date` / `hour`.
  - **Pipeline.** Cards accept `actions` and `footer` HTML slots (documented as not escaped) and an escaped `badge` (+ `badgeVariant`) rendered through `renderBadge`. Each column `<section>` is `aria-labelledby` its header, which shows the title and a card count (automatic, or `count` per column). `data-status` on cards and pipeline blocks draws a start-edge accent from the same semantic `-600` tokens the badges use, with a new `--bn-pipeline-status-color` fallback. `initPipelineDragDrop` reports the real `position` (index within the target column; +1 in the lower half of the card under the pointer; the column length on empty space) instead of `null`, and `createPipelineState().moveCard(id, columnId, position)` inserts the card at that index.
  - **Dialog.** The title carries `id="{id}-title"` and the `<dialog>` `aria-labelledby`; a new escaped `description` option renders `<p data-bn="dialog-description" id="{id}-description">` at the top of the body and sets `aria-describedby`.
  - **Tabs.** New `initTabs(root, { onChange?, activation? })` implements the WAI-ARIA APG tabs pattern — click / ArrowLeft / ArrowRight / Home / End switching (wrapping, skipping disabled tabs), `aria-selected`, roving `tabindex`, panel `hidden` toggling — and returns `{ select(id), active(), destroy() }`; `select()` is silent so a route can keep its own state as the source of truth. `renderTabs` now emits the roving `tabindex` in SSR markup.
  - **Table.** A column may give `render(value, row)` — an HTML slot alongside the escaped default (a nullish result renders an empty cell) — and `renderTable` accepts `attrs` on its container.
  - **Badge docs.** `renderBadge(content)`'s `content` has been an HTML slot since 0.5.0; the API reference, README and type declarations now say so. No behaviour change.

## 0.6.2

### Patch Changes

- Updated dependencies [d21dbdd]
  - @basenative/runtime@0.6.2
  - @basenative/forms@1.0.3

## 0.6.1

### Patch Changes

- 463fa97: Fix two keyboard-accessibility defects found during the CSS design-system pass:

  - **Tooltip**: `renderTooltip()`'s trigger was a `<span popovertarget>`. Per the HTML spec, only button-like elements (`<button>`, and `<input type="button|submit|reset|image">`) can be popover invokers, so the tooltip could never open by click or keyboard in any browser. The trigger now renders as a `<button type="button">` (`<span>` → `<button type="button">`) carrying the same `data-bn="tooltip-trigger"` attribute, `popovertarget`/`popovertargetaction="toggle"`, and a new `aria-describedby` pointing at the tooltip id. A `trigger` HTML slot that already starts with `<button` or `<input` is used in place instead of being double-wrapped, with those same attributes spliced onto it.
  - **Tree / TreeGrid / DataGrid**: `[data-bn="tree-item-content"]`, `[data-bn="treegrid-row"]` and sortable `[data-bn="datagrid-th"]` headers carry `:focus-visible` styling but were never focusable — no `tabindex` was ever emitted, so keyboard users could not reach them. Tree items and TreeGrid rows now carry a static roving `tabindex` (the first item in document order gets `tabindex="0"`, every other item gets `tabindex="-1"`); this package ships no client-side `initTree()`/`initTreeGrid()`, so moving that `tabindex` on arrow-key presses is left to the caller — documented accordingly. Sortable DataGrid column headers now render as a real `<button type="button" data-bn="datagrid-th-button">` inside the `<th>` (plus `aria-sort`), the WAI-ARIA APG sortable-column-header pattern, so they are reachable and activatable with no client JS at all.

  No CSS changes. Markup and docs (`docs/api/components.md`, `README.md`, `types/index.d.ts`) only.

- 50740f9: Fix three visual defects surfaced by a screenshot QA pass of the showcase site:

  - Calendar: the hour-gutter labels used `grid-row: h - hourStart + 1` while the time slots and events used `+ 2`, so a label sat one row above the slot/event it described (an 11:00–12:00 event could visually appear to span the 12pm–2pm rows). Labels now use the same `+ 2` convention. Calendar events also get `overflow: hidden`, `min-height: 0`, and `align-self: stretch` so a card's content can never grow its grid row, and `calendar-event-title` is clamped to 2 lines with an ellipsis.
  - Accordion: `[data-bn="accordion-header"]` centred its `::before` disclosure triangle against the full header block, so a two-line summary put the marker between the lines instead of next to the first one. `align-items` is now `flex-start` with a small `margin-top` offset on the marker that keeps single-line headers pixel-identical.
  - Mobile nav: the horizontally-scrolling header `menu` had no scroll affordance and could clip an item mid-glyph at the viewport edge. Added a sticky right-edge fade (progressively faded out near the end of scroll via `animation-timeline: scroll()` behind `@supports`, a constant fade otherwise) plus `padding-inline-end`/`scroll-padding-inline-end` so the last item clears the fade.

- Updated dependencies [df5e5d7]
- Updated dependencies [40a3472]
  - @basenative/forms@1.0.2
  - @basenative/runtime@0.6.1

## 0.6.0

### Minor Changes

- 7c7e4e1: Design-system pass over the shared CSS so the 33 components read as one system:

  - **Contrast**: input, checkbox, radio, select, combobox, multiselect, datagrid checkbox, spinner track, skeleton and toggle track borders meet WCAG 1.4.11 (3:1) through a new `--bn-color-border-control` token; `--bn-color-text-subtle` and error text meet 4.5:1 in both themes (new `--bn-color-error-fg`).
  - **One control-height ladder** (40px default, `data-size="sm"`/`"lg"` = 32/48) shared by button, input, select, combobox, dropdown trigger, pagination and tabs instead of five different heights.
  - **Overlays**: dialog and command palette centre again; dropdown menu and tooltip anchor to their trigger (absolute fallback, `anchor-name` progressive enhancement).
  - **Theme-safe state**: tree selection, table zebra, toggle track, calendar events and pipeline drop targets route through tokens defined in both light and dark palettes; nine previously undefined custom properties are now defined.
  - **Hit areas**: every interactive control gets a 24×24 minimum target without changing its visible size; one shared `:focus-visible` rule (the command input previously had no focus indicator).
  - **Tokens**: `--bn-radius-control/-container/-modal`, `--bn-shadow-modal`, `--bn-motion-fast/-base/-slow`, `--bn-scrim`; toast variants get a left accent bar.
  - **Packaging**: the main export now carries a `types` condition so TypeScript consumers resolve `types/index.d.ts` without a local shim; `./layers.css` is exported (it was missing from the 0.5.0 tarball).

### Patch Changes

- Updated dependencies [62d9857]
  - @basenative/runtime@0.6.0
  - @basenative/forms@1.0.1

## 0.5.0

### Minor Changes

- 7523b61: Harden every renderer: one escaping policy, deterministic ids, accessibility fixes.

  **Escaping (behaviour change).** Every attribute interpolation (id, name, value, placeholder, alt, src, href, aria-\*, data-\*, variant/size/position) and every text-semantic field (label, helpText, error, caption, emptyMessage, item and option labels, tooltip content, breadcrumb labels, avatar name, table and grid cell values, calendar and pipeline titles) is now HTML-escaped through `@basenative/runtime/shared/escape` — the same escaper the SSR renderer uses — replacing nine private, divergent copies (one of which did not escape `<`). Designated **content slots** are not escaped and are documented as `HTML slot: not escaped; pass trusted markup only`: button/badge/alert content, card header/body/footer, dialog and drawer body and footer, accordion and tab panel content, dropdown and tooltip triggers, icons, DataGrid `render()`, custom `renderItem`, and `attrs`. `renderBadge` content was previously escaped and is now a slot.

  **Deterministic ids (behaviour change).** Generated ids are `bn-<prefix>-<n>` from a counter instead of `Math.random()`, so SSR output is stable and `aria-controls` / `aria-labelledby` pairs survive hydration. New exports `nextId(prefix)` and `resetIds()` — call `resetIds()` once per SSR request. Every renderer honours an explicit `id` first. `showToast` ids are now strings and accept `options.id`.

  **Fixes.** Tree/TreeGrid leaves no longer emit `aria-expanded="undefined"`; Input help and error get distinct `<id>-help` / `<id>-error` ids and `aria-describedby` lists both; Textarea and Select emit `aria-describedby` and an error id (Select gains `helpText`); Dialog honours `modal`; tab buttons are `type="button"`; a closed Drawer is `inert`; Progress guards `max=0`; Calendar uses local time consistently (day headers no longer shift in non-UTC zones); Avatar with an `<img>` no longer double-announces; a missing `attrs` no longer leaves a stray space.

  Tests: 136 → 301.

## 0.4.1

### Patch Changes

- Updated dependencies [ce9ff49]
- Updated dependencies [f7e26f4]
- Updated dependencies [d3e979d]
  - @basenative/runtime@0.5.0
  - @basenative/forms@1.0.0

## 0.4.0

### Minor Changes

- fdfa251: v1.0 release readiness: comprehensive test coverage, complete documentation, deployment examples, and CI/CD hardening.
  - 682 tests across all 21 packages (was ~250)
  - Package-level READMEs for npm publishing
  - Cloudflare Workers and Node.js deployment examples
  - CLAUDE.md for AI assistant guidance
  - Root README rewrite for open-source audience
  - All package.json files have complete npm publishing metadata

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/runtime@0.4.0
  - @basenative/forms@0.4.0
