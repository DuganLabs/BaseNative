// Built with BaseNative — basenative.dev

import type {
  WebAuthnStores,
  UsersStore,
  CredentialsStore,
  ChallengesStore,
  UserSessionsStore,
} from './server.js';

/** The D1 schema as SQL text. */
export const migration: string;

/** Builds the four-store object from a Cloudflare D1 binding. Throws if `DB` is not a D1 binding. */
export function d1WebAuthnStores(DB: unknown): WebAuthnStores;
export function d1Users(DB: unknown): UsersStore;
export function d1Credentials(DB: unknown): CredentialsStore;
export function d1Challenges(DB: unknown): ChallengesStore;
export function d1UserSessions(DB: unknown): UserSessionsStore;
