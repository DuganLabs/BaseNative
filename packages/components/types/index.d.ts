import type { Signal } from '@basenative/runtime';

/*
 * Type declarations for @basenative/components.
 *
 * The public surface is the Holy Trinity catalog: every component is
 * an aggregate carrying its name, root element, create() view-model
 * factory, registerVariants, and the URLs of its template and styles.
 * Server-side assembly goes through the registry + loader; the legacy
 * string renderers (the render and init functions) were removed in 3.0.
 */

// ---------------------------------------------------------------- shared

/** A component aggregate: the module shape of every src/<name>/index.js. */
export interface ComponentDef {
  name: string;
  root: string;
  create: (props: never) => unknown;
  registerVariants: (registry: Registry) => void;
  template: URL;
  styles: URL;
}

export interface Registry {
  registerComponent: (def: {
    name: string;
    root: string;
    create: (props: never) => unknown;
    template?: string;
    styles?: string;
  }) => unknown;
  registerVariant: (component: string, name: string) => void;
  resolveVariant: (component: string, name: string) => string;
  listVariants: (component: string) => string[];
  listComponents: () => string[];
  getComponent: (name: string) => {
    name: string;
    root: string;
    create: (props: never) => unknown;
    template: string;
    styles: string;
  };
}

// Deterministic ids. Hydration needs either explicit `id` options or an
// identical render order on server and client with resetIds() per request.
export function nextId(prefix: string): string;
export function resetIds(): void;

// ---------------------------------------------------------------- registry & loader

export function createRegistry(): Registry;
/** The default registry instance, for apps that do not need isolation. */
export const registry: Registry;
export function validateTemplate(html: string): void;
export function validateCss(css: string): void;
export function loadRegistry(): Promise<Registry>;
export function renderComponent(
  registry: Registry,
  renderFn: (template: string, context: object) => string,
  name: string,
  props: object,
): { html: string; viewModel: unknown };
export function assembleStyles(registry: Registry, usedNames: string[]): Promise<string>;

// ---------------------------------------------------------------- components

export const accordion: ComponentDef;
export const alert: ComponentDef;
export const appBar: ComponentDef;
export const appShell: ComponentDef;
export const avatar: ComponentDef;
export const badge: ComponentDef;
export const breadcrumb: ComponentDef;
export const button: ComponentDef;
export const calendar: ComponentDef;
export const card: ComponentDef;
export const checkbox: ComponentDef;
export const choiceGroup: ComponentDef;
export const codeBlock: ComponentDef;
export const combobox: ComponentDef;
export const commandPalette: ComponentDef;
export const datagrid: ComponentDef;
export const dialog: ComponentDef;
export const drawer: ComponentDef;
export const dropdownMenu: ComponentDef;
export const emptyState: ComponentDef;
export const field: ComponentDef;
/** Bind the field's live validation report under a root (the document by default). Idempotent per root. */
export function bindFieldValidation(root?: Document | Element): void;
/** Report one control's validity on its field; returns whether it is valid. */
export function reportField(control: HTMLInputElement): boolean;
export const form: ComponentDef;
export const hero: ComponentDef;
export const input: ComponentDef;
export const listGroup: ComponentDef;
export const multiselect: ComponentDef;
export const pagination: ComponentDef;
export const pipeline: ComponentDef;
export const progress: ComponentDef;
export const radio: ComponentDef;
export const rating: ComponentDef;
export const searchField: ComponentDef;
export const segmentedControl: ComponentDef;
export const select: ComponentDef;
export const sidebar: ComponentDef;
export const siteFooter: ComponentDef;
export const stepper: ComponentDef;
export const table: ComponentDef;
export const tabs: ComponentDef;
export const textarea: ComponentDef;
export const themeToggle: ComponentDef;
export const toast: ComponentDef;
export const toggle: ComponentDef;
export const toolbar: ComponentDef;
export const tooltip: ComponentDef;
export const tree: ComponentDef;
export const virtualizer: ComponentDef;

// ---------------------------------------------------------------- toast queue

export interface ToastItem {
  message: string;
  tone?: string;
  dismissHtml?: string;
  id?: string;
  duration?: number;
}

export function createToaster(options?: { duration?: number }): {
  items: Signal<ToastItem[]>;
  push: (item: ToastItem) => string;
  dismiss: (id: string) => void;
};

// ---------------------------------------------------------------- calendar state

export function createCalendarState(options?: object): unknown;
export function createPipelineState(options?: object): unknown;
export function eventsCollide(a: object, b: object): boolean;
export function updateEvent(state: unknown, id: string, updates: object): unknown;
export function getEventDuration(event: object): number;

// ---------------------------------------------------------------- retained utilities

export function renderSkeleton(options?: object): string;
export function renderLayoutGrid(options?: object): string;
export function layoutGridStyles(): string;
