export interface FlagConfig {
  enabled?: boolean;
  percentage?: number;
  rules?: FlagRule[];
}

export interface FlagRule {
  userIds?: string[];
  roles?: string[];
  condition?: (context: FlagContext) => boolean;
  value?: boolean;
}

export interface FlagContext {
  userId?: string;
  sessionId?: string;
  role?: string;
  [key: string]: unknown;
}

export interface FlagProvider {
  getFlag(name: string): Promise<FlagConfig | null>;
  getAllFlags(): Promise<Record<string, FlagConfig>>;
  setFlag?(name: string, config: FlagConfig): Promise<void>;
  deleteFlag?(name: string): Promise<void>;
}

export interface FlagManager {
  isEnabled(flagName: string, context?: FlagContext): Promise<boolean>;
  getAll(context?: FlagContext): Promise<Record<string, boolean>>;
  setFlag(flagName: string, config: FlagConfig): Promise<void>;
}

export function createFlagManager(provider: FlagProvider, options?: { defaultValue?: boolean }): FlagManager;
export function flagMiddleware(flagManager: FlagManager): (ctx: unknown, next: () => Promise<void>) => Promise<void>;
export function createMemoryProvider(initialFlags?: Record<string, FlagConfig>): FlagProvider;
export function createRemoteProvider(options: { url: string; headers?: Record<string, string>; pollInterval?: number; timeout?: number }): FlagProvider & { refresh(): Promise<void>; startPolling(): void; stopPolling(): void };

/** The parts of a Cloudflare KV namespace binding that `createKVProvider` calls. */
export interface KVNamespaceLike {
  get(key: string, options: { type: 'json'; cacheTtl: number }): Promise<unknown>;
  list(options: { prefix: string }): Promise<{ keys: Array<{ name: string }> }>;
  put(key: string, value: string): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

export interface KVProviderOptions {
  /** The KV namespace binding holding the flags. Required. */
  kv: KVNamespaceLike;
  /** Key prefix. Defaults to `'flags:'`. */
  prefix?: string;
  /** Edge cache TTL in seconds. Defaults to 60. */
  cacheTtl?: number;
}

/** Cloudflare KV-backed provider. Flags are stored as JSON under `prefix + name`. */
export function createKVProvider(options: KVProviderOptions): FlagProvider &
  Required<Pick<FlagProvider, 'setFlag' | 'deleteFlag'>>;

/**
 * A synchronous flag snapshot suitable for `ctx.$flags` — see the `@feature`
 * template directive this package registers with @basenative/runtime.
 */
export interface FlagContextSnapshot {
  flags: Record<string, boolean>;
  isEnabled(name: string): boolean;
}

export function createFlagContext(flagManager: FlagManager, context?: FlagContext): Promise<FlagContextSnapshot>;
