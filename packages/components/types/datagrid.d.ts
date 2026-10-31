import type { ComponentDef, Registry } from './index.js';

/* Type declarations for the datagrid component subpath — the module
   shape of src/datagrid/index.js. */
export declare const name: string;
export declare const root: string;
export declare const create: ComponentDef['create'];
export declare function registerVariants(registry: Registry): void;
export declare const template: URL;
export declare const styles: URL;
export declare const datagrid: ComponentDef;
export default datagrid;
