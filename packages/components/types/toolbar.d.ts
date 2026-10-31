import type { ComponentDef, Registry } from './index.js';

/* Type declarations for the toolbar component subpath — the module
   shape of src/toolbar/index.js. */
export declare const name: string;
export declare const root: string;
export declare const create: ComponentDef['create'];
export declare function registerVariants(registry: Registry): void;
export declare const template: URL;
export declare const styles: URL;
export declare const toolbar: ComponentDef;
export default toolbar;
