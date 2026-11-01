import type { ComponentDef, Registry } from './index.js';

/* Type declarations for the field component subpath — the module
   shape of src/field/index.js. */
export declare const name: string;
export declare const root: string;
export declare const create: ComponentDef['create'];
export declare function registerVariants(registry: Registry): void;
export declare const template: URL;
export declare const styles: URL;
export declare const field: ComponentDef;
/** Bind the field's live validation report under a root (the document by default). Idempotent per root. */
export declare function bindFieldValidation(root?: Document | Element): void;
/** Report one control's validity on its field; returns whether it is valid. */
export declare function reportField(control: HTMLInputElement): boolean;
export default field;
