import type { Signal } from '@basenative/runtime';

/*
 * Type declarations for @basenative/components.
 *
 * Every declaration below mirrors the destructured options and return value of
 * the corresponding function in packages/components/src/. Where the source only
 * forwards a value into a `data-*` attribute (and the CSS styles a fixed set of
 * values), the union lists the styled values and `(string & {})` keeps any
 * other string assignable, exactly as the JavaScript accepts it.
 *
 * `attrs` is a raw string of extra HTML attributes spliced verbatim into the
 * outermost element (e.g. `'data-testid="x" aria-describedby="y"'`).
 */

// ---------------------------------------------------------------- shared

/** A select-style option: a bare string is used as both value and label. */
export type SelectItem = string | { value: string; label: string; disabled?: boolean };

// Deterministic ids. Hydration needs either explicit `id` options or an
// identical render order on server and client with resetIds() per request.
export function nextId(prefix: string): string;
export function resetIds(): void;

// ---------------------------------------------------------------- Button

/** Returns the class string `bn-button bn-button--${variant} bn-button--${size}`. */
export function buttonVariants(variant?: string, size?: string): string;

export function renderButton(content: string, options?: {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
  /** `type` attribute, default `'button'`. */
  type?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Input

export function renderInput(options?: {
  name: string;
  /** `type` attribute, default `'text'`. */
  type?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  error?: string;
  /** Element id; defaults to `name`. */
  id?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Textarea

export function renderTextarea(options?: {
  name: string;
  label?: string;
  placeholder?: string;
  value?: string;
  /** Default 3. */
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  error?: string;
  id?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Checkbox

export function renderCheckbox(options?: {
  name: string;
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  value?: string;
  id?: string;
  /** Spliced onto the wrapping `<label>`. */
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Radio

export function renderRadioGroup(options?: {
  name: string;
  /** Rendered as the `<legend>`. */
  label?: string;
  items?: SelectItem[];
  /** Value of the checked radio. */
  selected?: string;
  /** Disables every radio in the group. */
  disabled?: boolean;
  /** Spliced onto the `<fieldset>`. */
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Toggle

export function renderToggle(options?: {
  name: string;
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  id?: string;
  /** Spliced onto the wrapping `<label>`. */
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Select

export function renderSelect(options?: {
  name: string;
  label?: string;
  items?: SelectItem[];
  selected?: string;
  /** Rendered as a disabled first `<option value="">`. */
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  error?: string;
  id?: string;
  /** Spliced onto the `<select>`. */
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Alert

export function renderAlert(content: string, options?: {
  /** `error` and `warning` get `role="alert"`; `info` and `success` get `role="status"`. */
  variant?: 'info' | 'success' | 'warning' | 'error';
  dismissible?: boolean;
}): string;

// ---------------------------------------------------------------- Toast

export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | (string & {});

export interface ToastItem {
  /** `options.id`, or the next deterministic `bn-toast-<n>` id. */
  id: string;
  message: string;
  variant: string;
  duration: number;
}

export interface Toaster {
  position: ToastPosition;
  /** Default auto-dismiss in ms (5000). */
  duration: number;
  toasts: Signal<ToastItem[]>;
}

export function createToaster(options?: { position?: ToastPosition; duration?: number }): Toaster;
/** Appends a toast and schedules its dismissal (unless `duration` is 0 or negative). Returns the toast id. */
export function showToast(toaster: Toaster, options?: {
  /** Explicit id; otherwise the next deterministic `bn-toast-<n>` id. */
  id?: string;
  message?: string;
  variant?: 'info' | 'success' | 'warning' | 'error' | (string & {});
  /** Overrides `toaster.duration`. */
  duration?: number;
}): string;
export function dismissToast(toaster: Toaster, id: string): void;
export function renderToastContainer(position?: ToastPosition): string;

// ---------------------------------------------------------------- Table

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

export function renderTable(options?: {
  columns?: TableColumn[];
  rows?: Array<Record<string, unknown>>;
  /** Default `'No data'`. */
  emptyMessage?: string;
  caption?: string;
}): string;

// ---------------------------------------------------------------- Pagination

/** Returns `''` when `totalPages <= 1`. */
export function renderPagination(options?: {
  /** 1-indexed, default 1. */
  currentPage?: number;
  totalPages?: number;
  /** Base URL for page links; `?page=N` (or `&page=N`) is appended. */
  baseUrl?: string;
  /** Number of page links either side of the current page, default 2. */
  window?: number;
}): string;

// ---------------------------------------------------------------- Badge

export function renderBadge(content: string, options?: {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}): string;

// ---------------------------------------------------------------- Card

export function renderCard(options?: {
  header?: string;
  body?: string;
  footer?: string;
  /** Emitted as `data-variant`, default `'default'`. */
  variant?: string;
}): string;

// ---------------------------------------------------------------- Progress & Spinner

export function renderProgress(options?: {
  value?: number;
  /** Default 100. */
  max?: number;
  /** Emitted as `aria-label`. */
  label?: string;
  attrs?: string;
}): string;

export function renderSpinner(options?: {
  size?: 'sm' | 'default' | 'lg' | (string & {});
  /** `aria-label`, default `'Loading'`. */
  label?: string;
}): string;

// ---------------------------------------------------------------- Skeleton

export function renderSkeleton(options?: {
  /** CSS width, default `'100%'`. */
  width?: string;
  /** CSS height, default `'1rem'`. */
  height?: string;
  variant?: 'text' | 'circle';
  /** Number of placeholder blocks, default 1. */
  count?: number;
}): string;

// ---------------------------------------------------------------- Combobox

export function renderCombobox(options?: {
  name?: string;
  label?: string;
  /** Rendered as `<datalist>` options. */
  items?: SelectItem[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  /** Default `bn-combobox-${name}` (random suffix when `name` is absent). */
  id?: string;
  /** Spliced onto the `<input>`. */
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Multiselect

export function renderMultiselect(options?: {
  name?: string;
  label?: string;
  items?: SelectItem[];
  /** Values that are pre-selected; rendered as removable tags. */
  selected?: string[];
  /** Default `'Select items...'`. */
  placeholder?: string;
  disabled?: boolean;
  /** Default `bn-multiselect-${name}` (random suffix when `name` is absent). */
  id?: string;
  /** Spliced onto the search `<input>`. */
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Data Grid

export interface DataGridColumn<Row = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  /** CSS width applied as an inline `style` on the `<th>`. */
  width?: string;
  resizable?: boolean;
  /** Renders the cell as `contenteditable`. */
  editable?: boolean;
  /** Custom cell renderer; receives `row[key]` and the row. Output is not escaped. */
  render?: (value: unknown, row: Row) => string;
}

export function renderDataGrid<Row extends Record<string, unknown> = Record<string, unknown>>(options?: {
  columns?: Array<DataGridColumn<Row>>;
  /** `row.id` (falling back to the row index) becomes `data-row-id`. */
  rows?: Row[];
  /** Key of the column currently sorted. */
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  /** 1-indexed, default 1. */
  page?: number;
  /** Default 50. */
  pageSize?: number;
  /** Total row count for the footer; defaults to `rows.length`. */
  totalRows?: number;
  /** Adds a select-all header checkbox and a per-row checkbox. */
  selectable?: boolean;
  /** Row ids whose checkbox is pre-checked. */
  selectedRows?: Array<string | number>;
  /** Default `'No data'`. */
  emptyMessage?: string;
  /** `<caption>` text; also used as the scroll region's `aria-label`. */
  caption?: string;
  /** Default `bn-datagrid-<random>`. */
  id?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Tree & TreeGrid

export interface TreeNode {
  /** Node id; falls back to `label`. */
  id?: string;
  label: string;
  /** Raw HTML/text placed before the label. */
  icon?: string;
  children?: TreeNode[];
}

export function renderTree(options?: {
  items?: TreeNode[];
  /** Ids of nodes whose children are rendered. */
  expanded?: ReadonlySet<string>;
  /** Id of the selected node. */
  selected?: string;
  /** Default `bn-tree-<random>`. */
  id?: string;
  attrs?: string;
}): string;

export interface TreeGridColumn {
  key: string;
  label: string;
}

/** A tree-grid row: column values keyed by `TreeGridColumn.key`, plus an optional id and children. */
export type TreeGridNode = Record<string, unknown> & {
  /** Node id; falls back to the first column's value. */
  id?: string;
  children?: TreeGridNode[];
};

export function renderTreeGrid(options?: {
  columns?: TreeGridColumn[];
  items?: TreeGridNode[];
  expanded?: ReadonlySet<string>;
  /** Default `bn-treegrid-<random>`. */
  id?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Virtual List

/**
 * Renders the first window of items (enough to fill `containerHeight`, plus
 * `overscan` on each side) inside a spacer sized for the full list.
 */
export function renderVirtualList<T = unknown>(options?: {
  items?: T[];
  /** Pixel height of one item, default 40. */
  itemHeight?: number;
  /** Pixel height of the scroll container, default 400. */
  containerHeight?: number;
  /** Default: `<div data-bn="virtual-item" data-index="${index}">${item}</div>`. */
  renderItem?: (item: T, index: number) => string;
  /** Extra items rendered beyond the visible window, default 5. */
  overscan?: number;
  /** Default `bn-virtual-<random>`. */
  id?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Dialog

export function renderDialog(options?: {
  /** Rendered as an `<h2>` in the header. */
  title?: string;
  /** Body HTML. */
  content?: string;
  /** Adds the `open` attribute. */
  open?: boolean;
  /** Accepted for forward compatibility; currently has no effect on the markup. */
  modal?: boolean;
  /** Renders a close button, default true. */
  closable?: boolean;
  size?: 'sm' | 'default' | 'lg' | (string & {});
  /** Footer HTML. */
  footer?: string;
  /** Default `bn-dialog-<random>`. */
  id?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Drawer

export function renderDrawer(options?: {
  title?: string;
  content?: string;
  /** Adds `data-open` to the drawer (and its overlay). */
  open?: boolean;
  /** Edge the panel slides from, default `'right'`. */
  position?: 'left' | 'right' | (string & {});
  size?: 'sm' | 'default' | 'lg' | (string & {});
  closable?: boolean;
  /** Renders a preceding `[data-bn="drawer-overlay"]`, default true. */
  overlay?: boolean;
  /** Default `bn-drawer-<random>`. */
  id?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Tabs

export interface TabItem {
  id: string;
  label: string;
  /** Panel HTML. */
  content?: string;
  disabled?: boolean;
}

export function renderTabs(options?: {
  tabs?: TabItem[];
  /** Id of the active tab; defaults to the first tab. */
  activeTab?: string;
  variant?: 'default' | 'pills' | (string & {});
  /** Default `bn-tabs-<random>`; prefixes every tab/panel id. */
  id?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Accordion

export interface AccordionItem {
  /** `<summary>` HTML. */
  title: string;
  content: string;
  open?: boolean;
}

export function renderAccordion(options?: {
  items?: AccordionItem[];
  /** When false (default), all `<details>` share a `name` so only one stays open. */
  multiple?: boolean;
  /** Default `bn-accordion-<random>`. */
  id?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Breadcrumb

export interface BreadcrumbItem {
  label: string;
  /** Link target; required for every item except the last (which is rendered as plain text). */
  href?: string;
}

export function renderBreadcrumb(options?: {
  items?: BreadcrumbItem[];
  /** Default `'/'`. */
  separator?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Avatar

export function renderAvatar(options?: {
  /** Image URL; when absent, initials derived from `name` are shown. */
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'default' | 'lg' | 'xl' | (string & {});
  shape?: 'circle' | 'square' | (string & {});
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Tooltip

export function renderTooltip(options?: {
  /** Tooltip HTML. */
  content?: string;
  /** Trigger HTML (wrapped in a `popovertarget` span). */
  trigger?: string;
  /** Emitted as `data-position`, default `'top'`. */
  position?: 'top' | 'bottom' | 'left' | 'right' | (string & {});
  /** Default `bn-tooltip-<random>`. */
  id?: string;
  /** Spliced onto the trigger span. */
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Dropdown Menu

export type DropdownMenuItem =
  | { separator: true }
  | {
      separator?: false;
      label: string;
      /** Emitted as `data-action`. */
      action?: string;
      icon?: string;
      shortcut?: string;
      disabled?: boolean;
    };

export function renderDropdownMenu(options?: {
  /** Trigger button HTML. */
  trigger?: string;
  items?: DropdownMenuItem[];
  /** Emitted as `data-position`, default `'bottom-start'`. */
  position?: string;
  /** Popover id, default `bn-dropdown-<random>`. */
  id?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Command Palette

export interface CommandPaletteCommand {
  id?: string;
  label: string;
  /** Emitted as `data-action`; falls back to `id`. */
  action?: string;
  /** Group heading, default `'Commands'`. */
  group?: string;
  icon?: string;
  shortcut?: string;
}

export function renderCommandPalette(options?: {
  commands?: CommandPaletteCommand[];
  /** Default `'Type a command...'`. */
  placeholder?: string;
  open?: boolean;
  /** Default `bn-command-<random>`. */
  id?: string;
  attrs?: string;
}): string;

// ---------------------------------------------------------------- Calendar

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO datetime. */
  start: string;
  /** ISO datetime. */
  end: string;
  status?: string;
  /** CSS color override (`--bn-calendar-event-color`). */
  color?: string;
  assignee?: string;
  [extra: string]: unknown;
}

export function renderCalendar(options?: {
  /** ISO date (YYYY-MM-DD) of the first of the 7 rendered days. */
  startDate: string;
  events?: CalendarEvent[];
  /** Working-hours range, default `{ start: 7, end: 19 }`. */
  hours?: { start?: number; end?: number };
  /** Default `'No events'`. */
  emptyMessage?: string;
  /** Default `bn-calendar-<random>`. */
  id?: string;
  attrs?: string;
}): string;

export function renderPipelineBlock(options?: {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  attrs?: string;
}): string;

export interface PipelineColumn {
  id: string;
  title: string;
}

export interface PipelineCard {
  id: string;
  columnId: string;
  title: string;
  subtitle?: string;
  description?: string;
  status?: string;
  [extra: string]: unknown;
}

export function renderPipeline(options?: {
  columns?: PipelineColumn[];
  cards?: PipelineCard[];
  /** Default `bn-pipeline-<random>`. */
  id?: string;
  /** Shown in a column with no cards, default `'No items'`. */
  emptyMessage?: string;
  attrs?: string;
}): string;

export interface CalendarDropEvent {
  /** `data-event-id` of a calendar event, or `data-block-id` of a pipeline block. */
  eventId: string;
  date: string;
  hour: number;
  sourceType: 'event' | 'pipeline';
}

export function initCalendarDragDrop(
  container: HTMLElement,
  callbacks?: { onDrop?: (event: CalendarDropEvent) => void }
): { destroy: () => void };

export interface PipelineCardMoveEvent {
  cardId: string;
  targetColumnId: string;
  /** Always `null` — the DOM handler does not compute an index. */
  position: number | null;
}

export function initPipelineDragDrop(
  container: HTMLElement,
  callbacks?: { onCardMove?: (event: PipelineCardMoveEvent) => void }
): { destroy: () => void };

// ---------------------------------------------------------------- Calendar & Pipeline state

export function eventsCollide(
  event1: { start: string; end: string },
  event2: { start: string; end: string }
): boolean;

/** Returns `{ ...event, ...overrides }`. */
export function updateEvent<T extends object, U extends object>(event: T, overrides: U): T & U;

/** Whole minutes between two ISO datetimes. */
export function getEventDuration(start: string, end: string): number;

export type CalendarChangeEvent =
  | { type: 'add' | 'remove' | 'move' | 'update'; event: CalendarEvent }
  | { type: 'clear' };

export interface CalendarCollisionError {
  type: 'collision';
  eventId: string;
  targetDate: string;
  targetHour: number;
}

export interface CalendarState {
  /** Snapshot copy of all events. */
  events(): CalendarEvent[];
  selectedDate(): string | undefined;
  /** Id of the event being dragged, or null. */
  dragState(): string | null;
  getEvent(id: string): CalendarEvent | undefined;
  /** Adds the event (status defaults to `'scheduled'`) and returns the stored copy. */
  addEvent(event: CalendarEvent): CalendarEvent;
  removeEvent(id: string): boolean;
  /**
   * Moves an event to `date` at `hour`, keeping its duration unless
   * `durationMinutes` is given. Returns null (and calls `onError`) on a
   * collision, or null when the id is unknown.
   */
  moveEvent(id: string, date: string, hour: number, durationMinutes?: number | null): CalendarEvent | null;
  updateEventProperties(id: string, overrides: Partial<CalendarEvent>): CalendarEvent | null;
  setDragState(id: string | null): void;
  clearEvents(): void;
  getEventsInRange(startDate: string, endDate?: string): CalendarEvent[];
  getEventsForDay(date: string): CalendarEvent[];
  onEventChange: ((change: CalendarChangeEvent) => void) | null;
  onEventMove: ((move: { eventId: string; date: string; hour: number }) => void) | null;
  onError: ((error: CalendarCollisionError) => void) | null;
  onDragStateChange: ((id: string | null) => void) | null;
}

export function createCalendarState(options?: {
  /** Initial value of `selectedDate()`. */
  startDate?: string;
  initialEvents?: CalendarEvent[];
}): CalendarState;

export type PipelineChangeEvent =
  | { type: 'add' | 'remove' | 'move' | 'update'; card: PipelineCard }
  | { type: 'reorder'; columnId: string; cardOrder: string[] };

export interface PipelineState {
  columns(): PipelineColumn[];
  cards(): PipelineCard[];
  dragState(): string | null;
  getCard(id: string): PipelineCard | undefined;
  getColumn(id: string): PipelineColumn | undefined;
  addCard(card: PipelineCard): PipelineCard;
  removeCard(id: string): boolean;
  /** Returns null when the card or target column is unknown. */
  moveCard(id: string, targetColumnId: string, position?: number | null): PipelineCard | null;
  reorderCards(columnId: string, cardOrder: string[]): void;
  updateCard(id: string, overrides: Partial<PipelineCard>): PipelineCard | null;
  getCardsInColumn(columnId: string): PipelineCard[];
  setDragState(id: string | null): void;
  onCardChange: ((change: PipelineChangeEvent) => void) | null;
  onCardMove: ((move: { cardId: string; targetColumnId: string; position: number | null }) => void) | null;
  onDragStateChange: ((id: string | null) => void) | null;
}

export function createPipelineState(options?: {
  columns?: PipelineColumn[];
  initialCards?: PipelineCard[];
}): PipelineState;

// ---------------------------------------------------------------- Layout Grid

export interface LayoutGridCell {
  /** Default `cell-${index}`. */
  id?: string;
  label?: string;
  /** Cell HTML; falls back to `label`, then `Cell N`. */
  content?: string;
  /** Default 1. */
  colSpan?: number;
  /** Default 1. */
  rowSpan?: number;
}

export function renderLayoutGrid(options?: {
  /** Default 12. */
  columns?: number;
  /** CSS gap, default `'1rem'`. */
  gap?: string;
  /** CSS min-height per cell, default `'4rem'`. */
  minCellHeight?: string;
  cells?: LayoutGridCell[];
  /** Default `'layout-grid'`. */
  id?: string;
  /** Adds `draggable="true"` to every cell. */
  editable?: boolean;
}): string;

/** CSS rules for `[data-bn="layout-grid"]` / `[data-bn="layout-cell"]`. */
export function layoutGridStyles(): string;
