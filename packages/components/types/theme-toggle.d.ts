import type { ComponentDef, Registry } from './index.js';

/* Type declarations for the theme-toggle component subpath — the module
   shape of src/theme-toggle/index.js. */
export declare const name: string;
export declare const root: string;
export declare const create: ComponentDef['create'];
export declare function registerVariants(registry: Registry): void;
export declare const template: URL;
export declare const styles: URL;
export declare const THEME_MODES: readonly string[];
export declare function applyTheme(mode: string, el: unknown): void;
export declare const themeToggle: ComponentDef;
export default themeToggle;
