// Built with BaseNative — basenative.dev

export interface RoleChecker {
  hierarchy: string[];
  getRole(user: any): string;
  hasRole(user: any, role: string): boolean;
  isAdmin(user: any): boolean;
  isModerator(user: any): boolean;
  requireRole(role: string): (user: any) => boolean;
  rank(role: string): number;
}

export interface DefineRolesOptions {
  hierarchy?: string[];
  adminRole?: string;
  moderatorRole?: string;
  defaultRole?: string;
}

export function defineRoles(opts?: DefineRolesOptions): RoleChecker;
export function hasRole(user: any, role: string, hierarchy?: string[]): boolean;
export function requireRole(
  role: string,
  opts?: { hierarchy?: string[]; onDenied?: (role: string) => any }
): (user: any) => { user?: any; error?: any };

export function roleSeed(args: {
  env?: Record<string, string> | string;
  envKey?: string;
  user: any;
  seedMap?: Record<string, string>;
  identifier?: (u: any) => string;
  targetRole?: string;
  setRole: (userId: string, role: string, by: string) => Promise<void>;
}): Promise<any>;

export interface QueueTablesConfig {
  submissions: string;
  target: string;
  columns?: string[];
}
export interface QueueDecideResult {
  id: number | string;
  status: 'approved' | 'rejected';
  decidedBy: string;
  decidedAt: number;
}
export interface QueueStore {
  listPending(limit?: number): Promise<any[]>;
  submit(payload: Record<string, any>): Promise<{ id: any; status: string; submittedBy: string; createdAt: number }>;
  decide(id: number | string, status: 'approved' | 'rejected', decidedBy: string): Promise<QueueDecideResult | null>;
  get(id: number | string): Promise<any | null>;
}
export function defineQueue(opts: {
  db: any;
  tables: QueueTablesConfig;
  now?: () => number;
  onApprove?: (row: any, ctx: { db: any }) => Promise<void>;
}): QueueStore;

export const AUDIT_MIGRATION: string;
export function auditAction(env: any, entry: {
  user?: { id?: string; handle?: string } | null;
  action: string;
  target?: { type?: string; id?: string | number } | null;
  meta?: Record<string, any>;
  table?: string;
  now?: () => number;
}): Promise<void>;

export interface UsersPort {
  getById(id: string): Promise<any | null>;
  setRole(id: string, role: string, by: string): Promise<any>;
  search(q: string, limit?: number): Promise<any[]>;
  listByRoles(roles: string[], limit?: number): Promise<any[]>;
}
export function defineAdminHandlers(cfg: {
  queue: QueueStore;
  users?: UsersPort;
  roles?: RoleChecker;
  getCurrentUser: (request: Request, env: any) => Promise<any | null>;
  validateRoles?: string[];
}): {
  listPending: (ctx: { request: Request; env: any }) => Promise<Response>;
  decide: (ctx: { request: Request; env: any }) => Promise<Response>;
  users: (ctx: { request: Request; env: any }) => Promise<Response>;
  promote: (ctx: { request: Request; env: any }) => Promise<Response>;
};

export function renderAdminQueueList(opts: {
  items: Array<{ id: number | string; category: string; phrase: string; submittedBy: string }>;
  approveLabel?: string;
  rejectLabel?: string;
  emptyLabel?: string;
  actionHandler?: string;
}): string;

export function renderAdminUserList(opts: {
  users: Array<{ id: string; handle: string; role: string }>;
  results?: Array<{ id: string; handle: string; role: string }> | null;
  query?: string;
  currentHandle?: string;
  roles?: string[];
  labels?: { search?: string; currentSection?: string; resultsSection?: string; none?: string };
  actionHandler?: string;
  searchHandler?: string;
}): string;
