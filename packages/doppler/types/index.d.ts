// Built with BaseNative — basenative.dev

export interface DopplerRunOptions {
  project?: string;
  config?: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
  inherit?: boolean;
  preserveEnv?: boolean;
}

export function dopplerRun(
  args: string[],
  opts?: DopplerRunOptions,
): Promise<{ code: number; signal: string | null }>;

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
