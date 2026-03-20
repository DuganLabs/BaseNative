import type { MiddlewareContext, MiddlewareFn } from '@basenative/middleware';

export interface Session {
  id: string;
  data: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
}

export interface SessionStore {
  get(id: string): Promise<Session | null>;
  set(id: string, session: Session): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface SessionManagerOptions {
  store?: SessionStore;
  cookieName?: string;
  maxAge?: number;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  httpOnly?: boolean;
}

export interface SessionManager {
  cookieName: string;
  create(data?: Record<string, unknown>): Promise<Session>;
  get(id: string | null | undefined): Promise<Session | null>;
  update(id: string, data: Record<string, unknown>): Promise<Session | null>;
  destroy(id: string): Promise<void>;
  touch(id: string): Promise<Session | null>;
  cookieOptions(): Record<string, unknown>;
}

export function createSessionManager(options?: SessionManagerOptions): SessionManager;
export function createMemoryStore(): SessionStore;
export function createDbStore(adapter: unknown, options?: { tableName?: string }): SessionStore;

export function hashPassword(password: string, options?: { saltLength?: number; keyLength?: number }): Promise<string>;
export function verifyPassword(password: string, stored: string): Promise<boolean>;

export interface RoleDefinition {
  permissions: string[];
  inherits?: string[];
}

export interface RBAC {
  can(roleName: string, permission: string): boolean;
  canAll(roleName: string, permissions: string[]): boolean;
  canAny(roleName: string, permissions: string[]): boolean;
  getPermissions(roleName: string): string[];
  getRoles(): string[];
  hasRole(roleName: string): boolean;
}

export interface Guard {
  require(permission: string): MiddlewareFn;
  requireAny(...permissions: string[]): MiddlewareFn;
  requireRole(...roleNames: string[]): MiddlewareFn;
}

export function defineRoles(definition: Record<string, RoleDefinition>): RBAC;
export function createGuard(rbac: RBAC, options?: { getRoleFromContext?: (ctx: MiddlewareContext) => string | null; onDenied?: (ctx: MiddlewareContext) => void }): Guard;

export function sessionMiddleware(sessionManager: SessionManager): MiddlewareFn;
export function requireAuth(options?: { redirectTo?: string; message?: string }): MiddlewareFn;
export function login(sessionManager: SessionManager, ctx: MiddlewareContext, user: Record<string, unknown>): Promise<Session>;
export function logout(sessionManager: SessionManager, ctx: MiddlewareContext): Promise<void>;

export interface AuthResult {
  success: boolean;
  user?: Record<string, unknown>;
  error?: string;
  tokens?: Record<string, unknown>;
}

export interface CredentialsProvider {
  type: 'credentials';
  authenticate(identifier: string, password: string): Promise<AuthResult>;
  register(userData: Record<string, unknown>, password: string): Promise<Record<string, unknown>>;
}

export interface OAuthProvider {
  type: 'oauth';
  getAuthUrl(state?: string): { url: string; state: string };
  handleCallback(code: string): Promise<AuthResult>;
}

export function credentialsProvider(options: { findUser: (identifier: string) => unknown; getPasswordHash?: (user: unknown) => string }): CredentialsProvider;
export function oauthProvider(config: { clientId: string; clientSecret: string; authorizeUrl: string; tokenUrl: string; userInfoUrl: string; redirectUri: string; scopes?: string[] }): OAuthProvider;

export const providers: {
  github(options: { clientId: string; clientSecret: string; redirectUri: string }): OAuthProvider;
  google(options: { clientId: string; clientSecret: string; redirectUri: string }): OAuthProvider;
  microsoft(options: { clientId: string; clientSecret: string; redirectUri: string; tenant?: string }): OAuthProvider;
};
