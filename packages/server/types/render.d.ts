/**
 * Renders an HTML template string with the given context.
 * Processes @if, @for, @switch directives and {{ }} interpolation.
 */
export function render(
  html: string,
  ctx?: Record<string, unknown>,
  options?: RenderOptions,
): string;

export interface RenderOptions {
  /** When true, emits hydration marker comments in the output. */
  hydratable?: boolean;
  /** Callback for diagnostic events during rendering. */
  onDiagnostic?: (diagnostic: RenderDiagnostic) => void;
}

export interface RenderDiagnostic {
  level: 'error' | 'warn' | 'info';
  domain: string;
  code: string;
  message: string;
  expression?: string;
  [key: string]: unknown;
}
