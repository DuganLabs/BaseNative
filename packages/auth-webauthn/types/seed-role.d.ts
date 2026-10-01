// Built with BaseNative — basenative.dev

import type { WebAuthnStores, UserRecord } from './server.js';

export interface SeedRolesArgs {
  stores: WebAuthnStores;
  user: UserRecord | null | undefined;
  seedMap: Record<string, string>;
  changedBy?: string;
}
export function seedRoles(args: SeedRolesArgs): Promise<UserRecord | null | undefined>;
export function parseHandleList(csv: string | undefined, role: string): Record<string, string>;
