export interface PatchStats {
  /** Live nodes reused in place. */
  matched: number;
  /** Nodes imported from the new render. */
  inserted: number;
  /** Live nodes the new render no longer contains. */
  removed: number;
  attrsChanged: number;
  textChanged: number;
  /** Form controls whose value or checked state was re-synced. */
  formChanged: number;
  /** Subtrees left alone because of `data-bn-hmr-skip`. */
  skipped: number;
}

export type PatchResult =
  | { ok: true; stats: PatchStats; focusDisturbed: boolean }
  | { ok: false; reason: string };

export function parseDocument(
  html: unknown,
  parser?: { parseFromString(source: string, type: string): Document }
): Document | null;

export function keyOf(node: Node | null): string | null;
export function isCompatible(live: Node | null, next: Node | null): boolean;
export function canPatch(
  liveDoc: Document,
  nextDoc: Document
): { ok: true } | { ok: false; reason: string };

export function patchDocument(liveDoc: Document, nextDoc: Document): PatchResult;
export function patchElement(liveRoot: Element, nextRoot: Element): PatchResult;
