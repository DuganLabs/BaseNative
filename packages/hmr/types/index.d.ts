import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { UpdateKind } from './protocol.js';

export * from './protocol.js';

export type Env = Record<string, string | undefined>;

export function isDevEnvironment(env?: Env): boolean;
export function assertDevOnly(api: string, env?: Env): void;

/* ------------------------------------------------------------- watching */

export const DEFAULT_IGNORED_DIRS: string[];
export function isIgnored(path: string, ignoredDirs?: string[]): boolean;

export interface WatcherOptions {
  roots: string[];
  onChange: (files: string[]) => void;
  cwd?: string;
  debounceMs?: number;
  ignoredDirs?: string[];
  onWarn?: (message: string, error: Error) => void;
  env?: Env;
}

export interface Watcher {
  readonly roots: string[];
  readonly watching: boolean;
  close(): void;
}

export function createWatcher(options: WatcherOptions): Watcher;

/* --------------------------------------------------------------- server */

export interface HmrServerOptions {
  roots?: string[];
  cwd?: string;
  debounceMs?: number;
  ignoredDirs?: string[];
  watch?: boolean;
  log?: (message: string) => void;
  env?: Env;
}

export interface HmrStatus {
  enabled: boolean;
  generation: string;
  startedAt: number;
  clients: number;
  updates: number;
  lastUpdate: { at: number; kind: UpdateKind; files: string[]; reason: string | null } | null;
  watching: boolean;
  roots: string[];
}

export interface HmrServer {
  handle(req: IncomingMessage, res: ServerResponse): boolean;
  notify(detail?: { files?: string[]; kind?: UpdateKind; reason?: string }): void;
  status(): HmrStatus;
  close(): void;
  readonly clients: number;
  readonly generation: string;
  readonly enabled: boolean;
}

export function createHmrServer(options?: HmrServerOptions): HmrServer;

/* ----------------------------------------------------------- middleware */

export interface MiddlewareOptions extends HmrServerOptions {
  src?: string;
  hmr?: HmrServer;
}

export type NodeMiddleware = ((
  req: IncomingMessage,
  res: ServerResponse,
  next?: () => void
) => void) & { hmr: HmrServer; close(): void };

export function hmrMiddleware(options?: MiddlewareOptions): NodeMiddleware;

export function toPipelineMiddleware(
  options?: MiddlewareOptions
): (ctx: unknown, next: () => Promise<void> | void) => Promise<void>;

export function interceptHtml(
  res: ServerResponse,
  transform: (html: string) => string,
  options?: { maxBytes?: number }
): ServerResponse;

/* ---------------------------------------------------------------- proxy */

export interface ProxyOptions extends HmrServerOptions {
  targetPort: number;
  targetHost?: string;
  port: number;
  host?: string;
  settleMs?: number;
}

export interface HmrProxy {
  server: Server;
  hmr: HmrServer;
  watcher: Watcher;
  listen(): Promise<{ port: number; host: string }>;
  close(): Promise<void>;
}

export function createHmrProxy(options: ProxyOptions): HmrProxy;
export function isPortOpen(port: number, host?: string, timeoutMs?: number): Promise<boolean>;
export function waitForUpstream(
  port: number,
  host?: string,
  options?: { timeoutMs?: number; intervalMs?: number }
): Promise<boolean>;
export function findFreePort(preferred: number, host?: string, attempts?: number): Promise<number>;

/* ------------------------------------------------------------ injection */

export function clientTag(src?: string): string;
export function isFullDocument(html: unknown): boolean;
export function injectClientScript(html: string, options?: { src?: string }): string;
