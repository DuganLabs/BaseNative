// Built with BaseNative — basenative.dev

import type { WebAuthnAdapter, UserRecord } from './server.js';

export type CFContext = { request: Request; env: Record<string, unknown> };
export type CFHandler = (ctx: CFContext) => Promise<Response>;

export type AdapterFactory = (env: Record<string, unknown>) => WebAuthnAdapter;
export interface HandlerHooks {
  onLogin?: (args: {
    env: Record<string, unknown>;
    userId: string;
    user?: UserRecord | null;
    adapter: WebAuthnAdapter;
  }) => unknown | Promise<unknown>;
}

export function registerOptionsHandler(getAdapter: AdapterFactory): CFHandler;
export function registerVerifyHandler(getAdapter: AdapterFactory, hooks?: HandlerHooks): CFHandler;
export function loginOptionsHandler(getAdapter: AdapterFactory): CFHandler;
export function loginVerifyHandler(getAdapter: AdapterFactory, hooks?: HandlerHooks): CFHandler;
export function meHandler(
  getAdapter: AdapterFactory,
  options?: { shape?: (u: UserRecord) => unknown },
): CFHandler;
export function logoutHandler(getAdapter: AdapterFactory): CFHandler;
