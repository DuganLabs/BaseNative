// Built with BaseNative — basenative.dev

import type { LandingMeta } from './og-redirect.js';

export const DEFAULT_ALPHABET: string;
export const DEFAULT_ID_LENGTH: number;
export function shortId(len?: number, alphabet?: string): string;

export interface ShareCardStore {
  create(input: Record<string, any>): Promise<{ id: string }>;
  get(id: string): Promise<any | null>;
}
export function defineShareCards(cfg: {
  db: any;
  table?: string;
  idLength?: number;
  alphabet?: string;
  columns?: string[];
  payloadColumn?: string;
}): ShareCardStore;

export function mintHandler(opts: {
  store: ShareCardStore;
  origin?: ((env: any) => string) | string;
  path?: string;
  validate?: (body: any) => true | string;
  onCreated?: (id: string, body: any, ctx: any) => void | Promise<void>;
}): (ctx: { request: Request; env: any }) => Promise<Response>;

export function landingHandler(opts: {
  store: ShareCardStore;
  origin?: ((env: any) => string) | string;
  ogImage: ((card: any, ctx: { origin: string; id: string }) => string) | string;
  buildMeta: (card: any, ctx: { origin: string; id: string; ogImage: string }) => LandingMeta;
  redirectTo?: string;
  cacheControl?: string;
  idPattern?: RegExp;
}): (ctx: { request: Request; env: any; params: { id: string } }) => Promise<Response>;
