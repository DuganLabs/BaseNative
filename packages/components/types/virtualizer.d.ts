import type { ComponentDef, Registry } from './index.js';

/* Type declarations for the virtualizer component subpath — the module
   shape of src/virtualizer/index.js. */
export declare const name: string;
export declare const root: string;
export declare const create: ComponentDef['create'];
export declare function registerVariants(registry: Registry): void;
export declare const template: URL;
export declare const styles: URL;
export declare const virtualizer: ComponentDef;
export default virtualizer;
