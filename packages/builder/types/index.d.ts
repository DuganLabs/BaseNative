export interface BuilderNode {
  id: string;
  type: string;
  props: Record<string, string | number | boolean>;
  bindings: Record<string, string>;
  events: Record<string, string>;
  children: string[];
  parentId: string | null;
}

export interface SignalAccessor<T> {
  (): T;
  set(value: T | ((prev: T) => T)): void;
  peek(): T;
}

export interface BuilderState {
  readonly ROOT_ID: string;
  tree: SignalAccessor<Map<string, BuilderNode>>;
  selectedId: SignalAccessor<string | null>;
  selectedNode: SignalAccessor<BuilderNode | null>;
  addNode(input: {
    type: string;
    parentId?: string;
    props?: Record<string, unknown>;
    bindings?: Record<string, string>;
    events?: Record<string, string>;
    index?: number;
  }): string | null;
  removeNode(id: string): boolean;
  moveNode(id: string, target: { parentId?: string; index?: number }): boolean;
  updateProps(id: string, patch: Record<string, unknown>): boolean;
  updateBindings(id: string, patch: Record<string, string | undefined>): boolean;
  updateEvents(id: string, patch: Record<string, string | undefined>): boolean;
  getNode(id: string): BuilderNode | null;
  getRoot(): BuilderNode;
  select(id: string | null): boolean;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  toJSON(): string;
  fromJSON(json: string | object): void;
}

export interface ComponentDefinition {
  type: string;
  label: string;
  category: string;
  tag: string;
  container: boolean;
  selfClosing: boolean;
  defaultProps: Record<string, unknown>;
  inspectableProps: string[];
  inspectableBindings: string[];
  inspectableEvents: string[];
  textProp: string | null;
}

export interface Palette {
  register(component: Partial<ComponentDefinition> & { type: string }): ComponentDefinition;
  unregister(type: string): boolean;
  get(type: string): ComponentDefinition | null;
  has(type: string): boolean;
  list(): ComponentDefinition[];
  categories(): Map<string, ComponentDefinition[]>;
  search(query: string): ComponentDefinition[];
}

export interface BuilderOptions {
  state?: BuilderState;
  palette?: Palette;
  canvas?: HTMLElement;
  tree?: HTMLElement;
  inspector?: HTMLElement;
  paletteTarget?: HTMLElement;
}

export interface Builder {
  state: BuilderState;
  palette: Palette;
  generate(options?: { componentName?: string }): string;
  dispose(): void;
}

export interface DropHandlers {
  onOver?(event: DragEvent): void;
  onLeave?(event: DragEvent): void;
  onPaletteDrop?(payload: { type: string; event: DragEvent }): void;
  onNodeDrop?(payload: { nodeId: string; event: DragEvent }): void;
}

export const ROOT_ID: string;
export const PALETTE_MIME: string;
export const NODE_MIME: string;
export const BUILTIN_DEFINITIONS: ComponentDefinition[];

export function createBuilder(options?: BuilderOptions): Builder;
export function createBuilderState(): BuilderState;
export function createPalette(): Palette;
export function createDefaultPalette(): Palette;
export function generateComponent(
  state: BuilderState,
  palette: Palette,
  options?: { componentName?: string },
): string;
export function generateMarkup(
  state: BuilderState,
  palette: Palette,
  options?: { baseDepth?: number },
): string;
export function generateModule(
  state: BuilderState,
  palette: Palette,
  options?: { componentName?: string },
): string;
export function escapeHTML(value: unknown): string;
export function escapeAttr(value: unknown): string;
export function isValidIdentifier(name: string): boolean;
export function attachPaletteSource(element: HTMLElement, type: string): () => void;
export function attachNodeSource(element: HTMLElement, nodeId: string): () => void;
export function attachDropTarget(element: HTMLElement, handlers?: DropHandlers): () => void;
export function computeInsertionIndex(rect: DOMRect | null, clientY: number, childCount: number): number;
export function classifyDropPosition(rect: DOMRect | null, clientY: number): 'before' | 'inside' | 'after';
export function readDataTransfer(event: DragEvent): { type: 'palette' | 'node' | null; payload: string | null };
export function renderCanvas(state: BuilderState, palette: Palette, target: HTMLElement): () => void;
export function renderTreeView(state: BuilderState, palette: Palette, target: HTMLElement): () => void;
export function renderInspector(state: BuilderState, palette: Palette, target: HTMLElement): () => void;
export function renderPalette(palette: Palette, target: HTMLElement, options?: { onSelect?(type: string): void }): () => void;
