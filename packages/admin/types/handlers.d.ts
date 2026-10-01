// Built with BaseNative — basenative.dev

import type { QueueStore } from './queue.js';
import type { RoleChecker } from './roles.js';

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
