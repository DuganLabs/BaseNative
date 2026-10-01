/** 1-based position in the author's original template text. */
export interface Span {
  line: number;
  col: number;
}

export interface ScannedAttribute {
  /** Attribute name as written, including foreign syntax such as `v-if`, `[prop]` or `@click`. */
  name: string;
  /** Attribute value, or `null` when the attribute has no `=`. */
  value: string | null;
  /** 0-based absolute offset of the attribute name in the source. */
  offset: number;
}

export interface ScannedTag {
  /** Lower-cased tag name. */
  tagName: string;
  /** True for a close tag (`</div>`); close tags carry no attributes. */
  closing: boolean;
  attrs: ScannedAttribute[];
  /** 0-based offset of the opening `<`. */
  offset: number;
  /** The tag's source text, from `<` through `>`. */
  raw: string;
}

export interface ScannedInterpolation {
  /** The text between `{{` and `}}`. */
  expression: string;
  /** 0-based offset of the interpolation in the source. */
  offset: number;
}

/** Convert a 0-based offset into a 1-based line and column. */
export function spanAt(source: string, offset: number): Span;

/** Every open and close tag in `source`, with attributes and offsets. Comments are skipped. */
export function scanTags(source: string): ScannedTag[];

/** Every `{{ ... }}` interpolation in `source`. */
export function scanInterpolations(source: string): ScannedInterpolation[];
