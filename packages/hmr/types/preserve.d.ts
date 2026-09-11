export interface ElementRef {
  path: string | null;
  tag?: string;
  name?: string | null;
}

export interface FocusSnapshot extends ElementRef {
  selection: { start: number; end: number; direction: string } | null;
}

export interface ScrollSnapshot {
  window: { x: number; y: number };
  containers: Array<ElementRef & { top: number; left: number }>;
}

export interface PreservedState {
  focus: FocusSnapshot | null;
  scroll: ScrollSnapshot;
  open: Array<ElementRef & { modal: boolean }>;
}

export interface RestoreResult {
  focusRestored: boolean;
  /** True when focus never left the node — the patch was clean. */
  focusUntouched: boolean;
  scrollers: number;
  opened: number;
}

export function pathTo(el: Element | null): string | null;
export function resolvePath(doc: Document, path: string | null): Element | null;
export function resolveRef(doc: Document, ref: ElementRef | null): Element | null;
export function capture(doc: Document): PreservedState;
export function restore(doc: Document, state: PreservedState | null): RestoreResult;
