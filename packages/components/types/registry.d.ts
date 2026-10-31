import type { Registry } from './index.js';

/* Type declarations for the registry subpath — the module shape of
   src/registry.js. */
export type { Registry } from './index.js';
export declare function createRegistry(): Registry;
export declare const registry: Registry;
export declare function validateTemplate(html: string): void;
export declare function validateCss(css: string): void;
