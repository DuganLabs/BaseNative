import type { Registry } from './index.js';

/* Type declarations for the loader subpath — the module shape of
   src/loader.js. */
export declare function loadRegistry(): Promise<Registry>;
export declare function renderComponent(
  registry: Registry,
  renderFn: (template: string, context: object) => string,
  name: string,
  props: object,
): { html: string; viewModel: unknown };
export declare function assembleStyles(registry: Registry, usedNames: string[]): Promise<string>;
