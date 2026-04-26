// Built with BaseNative — basenative.dev

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

export function d1WebAuthnStores(DB: unknown): WebAuthnStores;
export const migration: string;

export interface SeedRolesArgs {
  stores: WebAuthnStores;
  user: UserRecord | null | undefined;
  seedMap: Record<string, string>;
  changedBy?: string;
}
export function seedRoles(args: SeedRolesArgs): Promise<UserRecord | null | undefined>;
export function parseHandleList(csv: string | undefined, role: string): Record<string, string>;

/* Handlers */
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

/* Client */
export interface ClientPaths {
  registerOptions?: string;
  registerVerify?: string;
  loginOptions?: string;
  loginVerify?: string;
  me?: string;
  logout?: string;
}
export interface ClientOpts {
  paths?: ClientPaths;
  fetchInit?: RequestInit;
}
export function isPasskeySupported(): boolean;
export function isPlatformPasskeySupported(): Promise<boolean>;
export function registerPasskey(handle: string, opts?: ClientOpts): Promise<unknown>;
export function loginPasskey(handle: string, opts?: ClientOpts): Promise<unknown>;
export function me(opts?: ClientOpts): Promise<unknown>;
export function logout(opts?: ClientOpts): Promise<unknown>;
