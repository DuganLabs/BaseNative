export interface ParseOptions {
  sanitize?: boolean;
}

export interface Frontmatter {
  meta: Record<string, string>;
  content: string;
}

export function parse(source: string, options?: ParseOptions): string;
export function parseFrontmatter(source: string): Frontmatter;
