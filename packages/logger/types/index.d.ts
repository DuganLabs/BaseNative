export interface LogEntry {
  level: number;
  time?: number;
  name?: string;
  msg: string;
  [key: string]: unknown;
}

export interface Transport {
  write(entry: LogEntry, pretty?: boolean): void;
}

export interface Logger {
  trace(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  fatal(msg: string, data?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): Logger;
  readonly level: string;
}

export interface LoggerOptions {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  name?: string;
  transport?: Transport;
  context?: Record<string, unknown>;
  timestamp?: boolean;
  pretty?: boolean;
}

export function createLogger(options?: LoggerOptions): Logger;
export function consoleTransport(): Transport;
export function streamTransport(stream: { write(data: string): void }): Transport;
export function multiTransport(transports: Transport[]): Transport;
export function requestLogger(logger: Logger, options?: { idHeader?: string }): (ctx: unknown, next: () => Promise<void>) => Promise<void>;

export const LEVELS: Record<string, number>;
export const LEVEL_NAMES: Record<number, string>;
