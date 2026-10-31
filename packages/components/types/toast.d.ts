import type { ComponentDef, Registry } from './index.js';

/* Type declarations for the toast component subpath — the module
   shape of src/toast/index.js. */
export declare const name: string;
export declare const root: string;
export declare const create: ComponentDef['create'];
export declare function registerVariants(registry: Registry): void;
export declare const template: URL;
export declare const styles: URL;
export { createToaster, type ToastItem } from './index.js';
export declare const toast: ComponentDef;
export default toast;
