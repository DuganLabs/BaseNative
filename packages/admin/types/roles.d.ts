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
