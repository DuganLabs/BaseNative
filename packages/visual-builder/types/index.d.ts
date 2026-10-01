export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CanvasNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children: string[];
  position: Position;
  size: Size;
  parentId: string | null;
}

export interface TreeNode extends Omit<CanvasNode, 'children'> {
  children: TreeNode[];
}

export interface CanvasOptions {
  width?: number;
  height?: number;
  gridSize?: number;
}

export interface Canvas {
  readonly width: number;
  readonly height: number;
  readonly gridSize: number;
  addNode(node: Partial<CanvasNode> & { type: string }): CanvasNode;
  removeNode(id: string): boolean;
  moveNode(id: string, position: Position): boolean;
  resizeNode(id: string, size: Size): boolean;
  getNode(id: string): CanvasNode | null;
  getNodes(): CanvasNode[];
  getTree(): TreeNode[];
  clear(): void;
  subscribe(callback: (event: string, data?: unknown) => void): () => void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}

export interface ComponentDefinition {
  type: string;
  label: string;
  category: string;
  defaultProps: Record<string, unknown>;
  icon: string | null;
}

export interface ComponentPalette {
  register(component: Partial<ComponentDefinition> & { type: string }): ComponentDefinition;
  getAll(): ComponentDefinition[];
  getByCategory(category: string): ComponentDefinition[];
  search(query: string): ComponentDefinition[];
  getComponent(type: string): ComponentDefinition | null;
}

export function createCanvas(options?: CanvasOptions): Canvas;
export function renderCanvas(canvas: Canvas, componentMap: Record<string, (props: Record<string, unknown>) => string>): string;
export function renderNode(node: TreeNode, componentMap: Record<string, (props: Record<string, unknown>) => string>): string;
export function serialize(canvas: Canvas): string;
export function deserialize(json: string): Canvas;
export function exportToHTML(canvas: Canvas, componentMap: Record<string, (props: Record<string, unknown>) => string>): string;
export function importFromHTML(html: string): Canvas;
export function createComponentPalette(): ComponentPalette;

/**
 * The `<bn-canvas>` custom element. Importing this package registers it
 * (`customElements.define('bn-canvas', ...)`), which is why `sideEffects`
 * lists the entry module.
 *
 * Attributes: `width`, `height`, `grid-size`, `mode`. Events (bubbling
 * `CustomEvent`s): `bn-canvas-add`, `bn-canvas-remove`, `bn-canvas-move`,
 * `bn-canvas-select`, `bn-canvas-change`.
 */
export class BnCanvas extends HTMLElement {
  /** Register component types for rendering. */
  registerComponents(componentMap: Record<string, (props: Record<string, unknown>) => string>): void;
  /** The underlying canvas state; `null` until the element is connected. */
  readonly canvas: Canvas | null;
  /** The currently selected node id; `null` when nothing is selected. */
  readonly selectedId: string | null;
}
