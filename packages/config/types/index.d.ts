export interface ValidatorResult {
  value?: unknown;
  error?: string;
}

export type Validator = (value: unknown) => ValidatorResult;

export interface ConfigValidationError {
  key: string;
  message: string;
}

export interface DefineConfigOptions {
  schema: Record<string, Validator> | ((values: Record<string, string>) => unknown);
  env?: Record<string, string | undefined>;
  prefix?: string;
}

export interface LoadEnvOptions {
  cwd?: string;
}

export function loadEnv(options?: LoadEnvOptions): Record<string, string>;
export function parseEnvFile(content: string): Record<string, string>;

export function defineConfig<T = Record<string, unknown>>(options: DefineConfigOptions): T;

export function string(options?: { minLength?: number; maxLength?: number }): Validator;
export function number(options?: { min?: number; max?: number }): Validator;
export function boolean(): Validator;
export function oneOf(allowed: string[]): Validator;
export function optional(validator: Validator, defaultValue?: unknown): Validator;
export function validateConfig(values: Record<string, unknown>, schema: Record<string, Validator>): Record<string, unknown>;
export function zodAdapter(zodSchema: { safeParse(data: unknown): { success: boolean; data?: unknown; error?: { issues: Array<{ path: string[]; code: string; message: string }> } } }): (values: Record<string, string>) => unknown;
