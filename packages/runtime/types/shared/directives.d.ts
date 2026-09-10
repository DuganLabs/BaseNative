/**
 * Types for `@basenative/runtime/shared/directives` — the registry `render()`/
 * `hydrate()` consult for plugin-contributed directives (e.g. `@feature` from
 * `@basenative/flags`, `@t` from `@basenative/i18n`). Also re-exported from the
 * package root (see ../index.d.ts).
 */

export type DirectiveHandler = (
  value: string,
  ctx: Record<string, unknown>,
  options?: Record<string, unknown>,
) => unknown;

export interface DirectiveDefinition {
  on: 'template' | 'element';
  server?: DirectiveHandler;
  client?: DirectiveHandler;
}

/** Registers a directive under `@<name>`. Throws if the name is already registered. */
export function registerDirective(
  name: string,
  config: { on?: 'template' | 'element'; server?: DirectiveHandler; client?: DirectiveHandler },
): void;

/** Removes a directive registration. */
export function unregisterDirective(name: string): void;

/** Returns the registration for `name`, or `undefined` if none exists. */
export function getDirective(name: string): DirectiveDefinition | undefined;

/** Returns the names of every currently registered directive. */
export function listDirectives(): string[];
