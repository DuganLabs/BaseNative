/**
 * Renders an HTML template string with the given context.
 * Processes @if, @for, @switch directives and {{ }} interpolation.
 */
export function render(
  html: string,
  ctx?: Record<string, unknown>,
  options?: RenderOptions,
): string;

export interface DeferredSection {
  /** The `data-bn-defer` id of the placeholder this section fills. */
  id: string;
  /** The rendered HTML of the section. */
  html: string;
  /** A `<script>` that swaps `html` into the placeholder and fires `bn:defer`. */
  script: string;
}

/**
 * Renders the `@defer` sections collected while `render()` ran. Pass the same
 * `options` object that was given to `render()`; with no deferred sections the
 * result is empty.
 */
export function resolveDeferred(options: RenderOptions): DeferredSection[];

export interface RenderOptions {
  /** When true, emits hydration marker comments in the output. */
  hydratable?: boolean;
  /** Callback for diagnostic events during rendering. */
  onDiagnostic?: (diagnostic: RenderDiagnostic) => void;
  /**
   * CSS to inline as `<style data-bn-critical>` inside `<head>`, before any
   * `<link rel="stylesheet">`. Use for size/layout rules that must apply
   * before external stylesheets arrive (prevents FOUC). Pass a string or
   * an array of strings (joined with newlines; falsy entries are dropped).
   */
  criticalCss?: string | Array<string | null | undefined | false>;
}

export interface RenderDiagnostic {
  level: 'error' | 'warn' | 'info';
  domain: string;
  code: string;
  message: string;
  expression?: string;
  [key: string]: unknown;
}
