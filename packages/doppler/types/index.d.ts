// Built with BaseNative — basenative.dev

export interface DopplerRunOptions {
  project?: string;
  config?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  inherit?: boolean;
  preserveEnv?: boolean;
}

export function dopplerRun(
  args: string[],
  opts?: DopplerRunOptions,
): Promise<{ code: number; signal: NodeJS.Signals | null }>;

export interface RequireSecretsOptions {
  source?: 'env' | 'doppler';
  project?: string;
  config?: string;
}

export function requireSecrets(
  names: string[],
  opts?: RequireSecretsOptions,
): Promise<Record<string, string>>;

export class MissingSecretsError extends Error {
  readonly name: 'MissingSecretsError';
  readonly missing: string[];
  readonly code: 'E_MISSING_SECRETS';
  constructor(missing: string[]);
}

export interface InjectIntoWranglerArgs {
  env?: Record<string, string | undefined>;
  names: string[];
  secretNames?: string[];
}

export function injectIntoWrangler(args: InjectIntoWranglerArgs): {
  vars: Record<string, string>;
  secrets: Record<string, string>;
};

// ─── ./required ──────────────────────────────────────────────────

export interface RequiredSecret {
  name: string;
  description?: string;
  required?: boolean;
}

export interface RequiredSchema {
  secrets: RequiredSecret[];
  configs: string[];
}

export function loadRequired(filePath: string): RequiredSchema;
export function validateRequired(input: unknown): RequiredSchema;
export function findMissing(
  schema: RequiredSchema,
  env: Record<string, string | undefined>,
): string[];

export class ValidationError extends Error {
  readonly name: 'ValidationError';
  readonly errors: string[];
  readonly code: 'E_INVALID_REQUIRED';
  constructor(errors: string[]);
}
