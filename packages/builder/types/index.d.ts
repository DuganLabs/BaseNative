/**
 * @basenative/builder — public types.
 *
 * The builder is a signal-based drag-and-drop composer for BaseNative
 * components. State is a hierarchical tree of nodes; each node owns props,
 * signal bindings, and ordered children.
 */

export interface SignalBinding {
  /** Name of the signal in the user's scope (e.g. "count"). */
  ref: string;
  /** Optional expression body — defaults to `${ref}()`. */
  expr?: string;
}

export interface BuilderNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  bindings: Record<string, SignalBinding>;
  children: BuilderNode[];
}

export interface ComponentPropSchema {
  name: string;
  label?: string;
  kind: 'string' | 'number' | 'boolean' | 'enum' | 'signal';
  default?: unknown;
  options?: string[];
  description?: string;
  /**
   * When false, the prop is consumed by the preview composition and never
   * serialised as an attribute on the rendered root (checkbox: `checked`
   * belongs to the inner input the preview composes). Defaults to true.
   */
  attr?: boolean;
}

export interface ComponentDefinition {
  type: string;
  label: string;
  category: string;
  /** Semantic HTML tag this component renders to. */
  tag: string;
  /** Whether this component accepts children (containers). */
  container: boolean;
  /** Props the inspector exposes for editing. */
  props: ComponentPropSchema[];
  /** Default prop values used when adding via the palette. */
  defaults: Record<string, unknown>;
  /** Default text content (for components like text/heading). */
  defaultContent?: string;
  /** Optional ARIA role assigned to the rendered element. */
  role?: string;
  /**
   * The `data-bn` token the matching legacy @basenative/components render
   * function emits (`'button'`, `'input'`, …). Both the canvas and the code
   * generator add `data-bn="<bn>"` to the element, which is what the legacy
   * library's CSS selects on. Omit for plain HTML elements with no component,
   * and for catalog components (see `catalog`).
   */
  bn?: string;
  /**
   * Prop names the component serialises as `data-<name>` rather than as bare
   * attributes (legacy kit). Defaults to `[]`.
   */
  dataProps?: string[];
  /**
   * The Holy Trinity catalog component this definition emits
   * (`'hero'`, `'button'`, …). Catalog defs never stamp `data-bn`: the
   * trinity sheet selects on element + variant. Omit for plain HTML
   * elements and for legacy kit defs (see `bn`).
   */
  catalog?: string;
  /**
   * The variant stamped on the rendered root for a catalog def whose
   * variant is fixed (hero: `'stacked'`, input: `'default'`). For defs
   * whose variant is a prop, see `variantProps`.
   */
  variant?: string;
  /**
   * Prop names a catalog component serialises as the bare `variant`
   * attribute (button: `['variant']`). Each must be a declared prop with a
   * default. Defaults to `[]`.
   */
  variantProps?: string[];
}

export interface ComponentPalette {
  register(def: Partial<ComponentDefinition> & { type: string }): ComponentDefinition;
  unregister(type: string): boolean;
  get(type: string): ComponentDefinition | null;
  list(): ComponentDefinition[];
  byCategory(category: string): ComponentDefinition[];
  categories(): string[];
  search(query: string): ComponentDefinition[];
}

export interface BuilderStateOptions {
  initial?: BuilderNode | BuilderNode[];
  /** Maximum history entries kept on the past stack. */
  maxHistory?: number;
}

export interface BuilderState {
  /** Root nodes signal — readable via `state.tree()`. */
  tree: { (): BuilderNode[]; set(next: BuilderNode[] | ((v: BuilderNode[]) => BuilderNode[])): void; peek(): BuilderNode[] };
  selection: { (): string | null; set(id: string | null): void; peek(): string | null };
  hover: { (): string | null; set(id: string | null): void; peek(): string | null };
  canUndo: { (): boolean; peek(): boolean };
  canRedo: { (): boolean; peek(): boolean };

  getNode(id: string): BuilderNode | null;
  getParent(id: string): BuilderNode | null;
  getPath(id: string): string[];

  addNode(parentId: string | null, spec: Partial<BuilderNode> & { type: string }, index?: number): BuilderNode;
  removeNode(id: string): boolean;
  updateProps(id: string, patch: Record<string, unknown>): boolean;
  setBinding(id: string, propKey: string, binding: SignalBinding | null): boolean;
  moveNode(id: string, newParentId: string | null, index?: number): boolean;
  duplicateNode(id: string): BuilderNode | null;

  select(id: string | null): void;
  hoverNode(id: string | null): void;

  undo(): boolean;
  redo(): boolean;
  clear(): void;

  toJSON(): string;
  fromJSON(json: string): void;
  subscribe(callback: (event: BuilderEvent) => void): () => void;
}

export type BuilderEvent =
  | { type: 'add'; node: BuilderNode; parentId: string | null }
  | { type: 'remove'; id: string }
  | { type: 'update'; id: string; patch: Record<string, unknown> }
  | { type: 'binding'; id: string; propKey: string; binding: SignalBinding | null }
  | { type: 'move'; id: string; parentId: string | null; index: number }
  | { type: 'select'; id: string | null }
  | { type: 'hover'; id: string | null }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }
  | { type: 'load' };

export interface CodegenOptions {
  /** Indentation string per nesting level. Default: "  ". */
  indent?: string;
  /** Document mode wraps output in <!DOCTYPE> + html shell. Default: false. */
  document?: boolean;
  /** Title used in document mode. */
  title?: string;
  /** Names of signals to declare in the generated component scope. */
  signals?: Record<string, unknown>;
}

export function createBuilderState(options?: BuilderStateOptions): BuilderState;
export function createPalette(): ComponentPalette;
export function defaultPalette(): ComponentPalette;
export function generateBaseNative(state: BuilderState, options?: CodegenOptions): string;
export function renderTreeView(state: BuilderState): string;
export function renderInspector(state: BuilderState, palette: ComponentPalette): string;
export function escapeHtml(value: unknown): string;
/** Same escaping as `escapeHtml`, for attribute values. */
export function escapeAttr(value: unknown): string;
/** True for a string that is a valid JavaScript identifier (ASCII letters, digits, `_`, `$`; not starting with a digit). */
export function isValidIdentifier(name: unknown): boolean;
/** Build the DOM element for a builder node and its children, using `doc` to create elements. */
export function renderNodeToElement(doc: Document, node: BuilderNode, palette: ComponentPalette): HTMLElement;
/** HTML for the palette: one section per category, one draggable button per component. */
export function renderPaletteHTML(palette: ComponentPalette): string;

export class BnBuilder extends HTMLElement {
  state: BuilderState;
  palette: ComponentPalette;
}

export class BnBuilderCanvas extends HTMLElement {
  state: BuilderState;
  palette: ComponentPalette;
}

export class BnBuilderPalette extends HTMLElement {
  palette: ComponentPalette;
}

export class BnBuilderTree extends HTMLElement {
  state: BuilderState;
}

export class BnBuilderInspector extends HTMLElement {
  state: BuilderState;
  palette: ComponentPalette;
}
