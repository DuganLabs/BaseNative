// Built with BaseNative — basenative.dev

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export type RawOption = string | ComboboxOption;

export type FilterFn = (option: ComboboxOption, query: string) => boolean;

/**
 * A signal-shaped value source. Functions are signal accessors;
 * `{ get }` is an ergonomic alternative.
 */
export type ValueSource =
  | string
  | (() => string)
  | { get: () => string };

export interface ComboboxOptions {
  id?: string;
  name?: string;
  label?: string;
  options?: RawOption[];
  value?: ValueSource;
  onChange?: (value: string) => void;
  onCreate?: (label: string) => void;
  allowCreate?: boolean;
  createLabel?: (input: string) => string;
  placeholder?: string;
  ariaDescribedBy?: string;
  theme?: string;
  filter?: FilterFn;
  runtime?: { effect: (fn: () => void) => (() => void) | void };
}

export interface VisibleEntry {
  kind: 'opt' | 'create';
  option?: ComboboxOption;
  query?: string;
  id: string;
}

export interface ComboboxHandle {
  destroy(): void;
  refresh(): void;
  open(): void;
  close(): void;
  setOptions(next: RawOption[]): void;
  /** @internal — exposed for testing. */
  _getVisible(): VisibleEntry[];
  /** @internal — exposed for testing. */
  _getQuery(): string;
}

export interface ComboboxFactory {
  html: string;
  hydrate(rootEl: Element): ComboboxHandle;
}

export function Combobox(options?: ComboboxOptions): ComboboxFactory;
export function renderCombobox(options?: ComboboxOptions): string;
export function hydrateCombobox(rootEl: Element, options?: ComboboxOptions): ComboboxHandle;
export function normalizeOption(raw: RawOption): ComboboxOption | null;

export const defaultFilter: FilterFn;
export const prefixFilter: FilterFn;
export const fuzzyFilter: FilterFn;

export function applyAriaAttributes(rootEl: Element, options?: { label?: string; expanded?: boolean }): void;
export function escapeOnKeydown(rootEl: Element, onEscape: (e: Event) => void): () => void;
export function announce(rootEl: Element, message: string): void;
