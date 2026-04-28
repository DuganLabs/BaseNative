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
