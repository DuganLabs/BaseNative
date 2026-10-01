// Built with BaseNative — basenative.dev

export { d1WebAuthnStores } from './d1-stores.js';
export { seedRoles, parseHandleList } from './seed-role.js';

export type { SeedRolesArgs } from './seed-role.js';

export interface RpConfig {
  rpName?: string;
  rpID: string;
  origin: string;
}

export interface UserRecord {
  id: string;
  handle: string;
  role?: string;
}

export interface CredentialRecord {
  id: string;
  userId?: string;
  publicKey: string;
  counter: number;
  transports?: string[];
}

export interface ChallengeRecord {
  challenge: string;
  userId: string | null;
  purpose: 'register' | 'authenticate';
  expiresAt: number;
}

export interface UsersStore {
  getByHandle(handle: string): Promise<UserRecord | null>;
  getById(id: string): Promise<UserRecord | null>;
  create(input: { id: string; handle: string }): Promise<UserRecord>;
  setRole?(id: string, role: string, changedBy?: string | null): Promise<void>;
}

export interface CredentialsStore {
  listByUser(userId: string): Promise<CredentialRecord[]>;
  getById(credId: string): Promise<(CredentialRecord & { userId: string }) | null>;
  create(input: {
    id: string;
    userId: string;
    publicKey: string;
    counter?: number;
    transports?: string[];
  }): Promise<void>;
  updateCounter(id: string, counter: number): Promise<void>;
}

export interface ChallengesStore {
  create(input: {
    challenge: string;
    userId: string | null;
    purpose: 'register' | 'authenticate';
    ttlSeconds?: number;
  }): Promise<void>;
  consume(challenge: string, purpose: string): Promise<ChallengeRecord | null>;
}

export interface UserSessionsStore {
  create(input: { id: string; userId: string; ttlSeconds: number }): Promise<void>;
  getUser(token: string): Promise<UserRecord | null>;
  destroy(token: string): Promise<void>;
}

export interface WebAuthnStores {
  users: UsersStore;
  credentials: CredentialsStore;
  challenges: ChallengesStore;
  userSessions: UserSessionsStore;
}

export interface WebAuthnAdapterOptions {
  rp: RpConfig;
  stores: WebAuthnStores;
  ttl?: { sessionSeconds?: number; challengeSeconds?: number };
  cookieName?: string;
  secureCookie?: boolean;
  /** Drives both option generation and verification. Default `'preferred'`. */
  userVerification?: 'preferred' | 'required' | 'discouraged';
}

export type AdapterResult<T> = T | { error: string; status: number };

export interface WebAuthnAdapter {
  type: 'webauthn';
  cookieName: string;
  getRegistrationOptions(handle: string): Promise<AdapterResult<{ options: unknown }>>;
  verifyRegistration(
    attestation: unknown,
  ): Promise<AdapterResult<{ ok: true; userId: string; token: string }>>;
  getAuthenticationOptions(
    handle?: string,
  ): Promise<AdapterResult<{ options: unknown }>>;
  verifyAuthentication(
    assertion: unknown,
  ): Promise<AdapterResult<{ ok: true; userId: string; user: UserRecord | null; token: string }>>;
  createSession(userId: string): Promise<string>;
  destroySession(token: string): Promise<void>;
  currentUser(request: Request): Promise<UserRecord | null>;
  cookie: { name: string; set(value: string): string; clear(): string };
}

export function webauthnAdapter(opts: WebAuthnAdapterOptions): WebAuthnAdapter;

/** Lowercases and trims a handle; null and undefined become the empty string. */
export function normHandle(h: unknown): string;
/** True for 2-24 characters of `a-z`, `0-9`, `_` and `-`. */
export function validHandle(h: string): boolean;
/** Decodes a base64url string to bytes. */
export function b64uToBytes(s: string): Uint8Array;
/** Encodes bytes as an unpadded base64url string. */
export function bytesToB64u(bytes: Iterable<number>): string;
/** Packs a UUID (with dashes) into 16 raw bytes for the WebAuthn userID. */
export function userIdBytes(uuid: string): Uint8Array;
/** Reads one cookie from a request; null when absent. */
export function getCookie(request: Request, name: string): string | null;
/** Builds a `Set-Cookie` value: `Path=/; HttpOnly; SameSite=Lax`, plus `Secure` unless `secure` is false. */
export function setCookieHeader(
  name: string,
  value: string,
  opts?: { secure?: boolean; maxAgeSeconds?: number },
): string;
/** Builds a `Set-Cookie` value that clears the cookie. */
export function clearCookieHeader(name: string): string;
