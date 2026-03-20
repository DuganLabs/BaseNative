import type { Signal } from '@basenative/runtime';

export interface ValidationError {
  code: string;
  message: string;
  params?: Record<string, unknown>;
}

export type Validator = (value: unknown) => ValidationError | null;

export interface Field {
  value: Signal<unknown>;
  touched: Signal<boolean>;
  dirty: Signal<boolean>;
  errors: Signal<ValidationError[]>;
  valid: Signal<boolean>;
  invalid: Signal<boolean>;
  firstError: Signal<ValidationError | null>;
  setValue(next: unknown | ((prev: unknown) => unknown)): void;
  touch(): void;
  reset(resetValue?: unknown): void;
  setServerErrors(errors: ValidationError | ValidationError[]): void;
}

export interface Form {
  fields: Record<string, Field>;
  values: Signal<Record<string, unknown>>;
  errors: Signal<Record<string, ValidationError[]>>;
  valid: Signal<boolean>;
  invalid: Signal<boolean>;
  dirty: Signal<boolean>;
  touched: Signal<boolean>;
  touchAll(): void;
  reset(): void;
  getValues(): Record<string, unknown>;
  submit(): Promise<{ ok: boolean; data?: unknown; errors?: Record<string, ValidationError[]>; error?: Error }>;
  setServerErrors(errorMap: Record<string, ValidationError | ValidationError[]>): void;
}

export function createField(
  initial: unknown,
  options?: { validators?: Validator[]; transform?: (value: unknown) => unknown },
): Field;

export function createForm(
  fields: Record<string, Field>,
  options?: { onSubmit?: (values: Record<string, unknown>) => unknown; schema?: (values: Record<string, unknown>) => Record<string, ValidationError[]> },
): Form;

export function zodAdapter(schema: { safeParse(data: unknown): { success: boolean; error?: { issues: Array<{ path: string[]; code: string; message: string }> } } }): (values: Record<string, unknown>) => Record<string, ValidationError[]>;

export function required(message?: string): Validator;
export function minLength(min: number, message?: string): Validator;
export function maxLength(max: number, message?: string): Validator;
export function pattern(regex: RegExp | string, message?: string): Validator;
export function email(message?: string): Validator;
export function min(minimum: number, message?: string): Validator;
export function max(maximum: number, message?: string): Validator;
export function custom(fn: Validator): Validator;
