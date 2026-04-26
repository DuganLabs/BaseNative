// Built with BaseNative — basenative.dev

export type KeyType = 'char' | 'action';

export interface Key {
  type: KeyType;
  label: string;
  key: string;
  span?: number;
  variant?: string;
}

export interface Layout {
  rows: Key[][];
  name?: string;
}

export type KeyStatus = 'green' | 'yellow' | 'present' | 'absent' | 'staked';

export interface StateMap {
  [letter: string]: KeyStatus | undefined;
}

export interface KeyboardOptions {
  layout?: Layout | 'qwerty' | 'alphanumeric' | 'numpad' | 'phone' | Array<Array<Key | string>>;
  label?: string;
  primary?: string;
  disabled?: boolean;
  id?: string;
  theme?: string;
  onKey?: (char: string, event?: Event) => void;
  onAction?: (action: string, event?: Event) => void;
  state?: () => StateMap;
  runtime?: { effect: (fn: () => void) => (() => void) | void };
  bindHardware?: boolean;
  haptic?: boolean;
}

export interface HydrateHandle {
  destroy(): void;
  refresh(): void;
}

export interface KeyboardHandle {
  html: string;
  hydrate(rootEl: Element): HydrateHandle;
}

export function Keyboard(options?: KeyboardOptions): KeyboardHandle;
export function renderKeyboard(options?: KeyboardOptions): string;
export function hydrateKeyboard(rootEl: Element, options?: KeyboardOptions): HydrateHandle;

export const LAYOUTS: {
  qwerty: Layout;
  alphanumeric: Layout;
  numpad: Layout;
  phone: Layout;
};

export function defineLayout(rows: Array<Array<Key | string>>, meta?: { name?: string }): Layout;
export function validateLayout(layout: Layout): true;
export function normalizeKey(raw: Key | string): Key;

export function keyState(
  state: StateMap | (() => StateMap),
  letter: string,
): () => KeyStatus | undefined;

export function applyAriaAttributes(rootEl: Element, options?: { label?: string }): void;
export function preventFocusSteal(rootEl: Element): () => void;
export function bindHardwareKeys(
  target: EventTarget,
  handlers: {
    onKey?: (char: string, event: KeyboardEvent) => void;
    onAction?: (action: string, event: KeyboardEvent) => void;
  },
  options?: { charSet?: Set<string> },
): () => void;
export function haptic(ms?: number): void;
