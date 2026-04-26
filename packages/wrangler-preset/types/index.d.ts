// Built with BaseNative — basenative.dev

export interface WranglerDefaults {
  readonly compatibility_date: string;
  readonly compatibility_flags: readonly string[];
  readonly pages_build_output_dir: string;
  readonly workers_dev: boolean;
  readonly send_metrics: boolean;
}

export const defaults: WranglerDefaults;

export interface D1Fragment {
  d1_databases: Array<{ binding: string; database_name: string; database_id: string }>;
}
export interface KvFragment {
  kv_namespaces: Array<{ binding: string; id: string }>;
}
export interface R2Fragment {
  r2_buckets: Array<{ binding: string; bucket_name: string }>;
}
export interface DoFragment {
  durable_objects: {
    bindings: Array<{ name: string; class_name: string; script_name?: string }>;
  };
}

export interface BindingsApi {
  d1(name: string, dbName: string, dbId: string): D1Fragment;
  kv(name: string, id: string): KvFragment;
  r2(name: string, bucket: string): R2Fragment;
  do(name: string, className: string, scriptName?: string): DoFragment;
}

export const bindings: BindingsApi;

export type WranglerConfig = Record<string, unknown>;

export function mergeWrangler(
  base: WranglerConfig | null | undefined,
  ...frags: Array<WranglerConfig | null | undefined>
): WranglerConfig;

export function toToml(config: WranglerConfig): string;
