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
