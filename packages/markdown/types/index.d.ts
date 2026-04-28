/**
 * AST node types for @basenative/markdown
 */

export type ASTNode =
  | HeadingNode
  | ParagraphNode
  | BoldNode
  | BoldItalicNode
  | ItalicNode
  | StrikethroughNode
  | CodeNode
  | LinkNode
  | ImageNode
  | ListNode
  | ListItemNode
  | CodeBlockNode
  | BlockquoteNode
  | HorizontalRuleNode
  | LineBreakNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | TextNode;

export type CellAlignment = 'left' | 'center' | 'right' | null;

export interface HeadingNode {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ASTNode[];
}

export interface ParagraphNode {
  type: 'paragraph';
  children: ASTNode[];
}

export interface BoldNode {
  type: 'bold';
  children: ASTNode[];
}

export interface BoldItalicNode {
  type: 'bold-italic';
  children: ASTNode[];
}

export interface ItalicNode {
  type: 'italic';
  children: ASTNode[];
}

export interface StrikethroughNode {
  type: 'strikethrough';
  children: ASTNode[];
}

export interface CodeNode {
  type: 'code';
  value: string;
}

export interface LinkNode {
  type: 'link';
  href: string;
  title?: string;
  autolink?: boolean;
  children: ASTNode[];
}

export interface ImageNode {
  type: 'image';
  src: string;
  alt: string;
  title?: string;
}

export interface ListNode {
  type: 'list';
  ordered: boolean;
  children: ListItemNode[];
}

export interface ListItemNode {
  type: 'list-item';
  /** Set when the item is a GFM task list item. */
  checked?: boolean;
  children: ASTNode[];
}

export interface CodeBlockNode {
  type: 'code-block';
  language: string;
  value: string;
}

export interface BlockquoteNode {
  type: 'blockquote';
  children: ASTNode[];
}

export interface HorizontalRuleNode {
  type: 'horizontal-rule';
}

export interface LineBreakNode {
  type: 'line-break';
}

export interface TableNode {
  type: 'table';
  children: TableRowNode[];
}

export interface TableRowNode {
  type: 'table-row';
  header: boolean;
  children: TableCellNode[];
}

export interface TableCellNode {
  type: 'table-cell';
  header: boolean;
  align: CellAlignment;
  children: ASTNode[];
}

export interface TextNode {
  type: 'text';
  value: string;
}

export interface Frontmatter {
  meta: Record<string, string>;
  content: string;
}

/** Parse markdown into an HTML string. */
export function parse(markdown: string): string;

/** Parse markdown into the AST. */
export function parseAST(markdown: string): ASTNode[];

/** Render an AST to an HTML string. */
export function render(ast: ASTNode[]): string;

/** Extract YAML-style frontmatter from a markdown source. */
export function parseFrontmatter(source: string): Frontmatter;
