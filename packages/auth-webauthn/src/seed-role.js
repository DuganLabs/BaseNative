// Built with BaseNative — basenative.dev
/**
 * Generic role-seed-on-login helper.
 *
 * If a freshly-authenticated user's handle appears in `seedMap`, and their
 * stored DB role is below the seeded role, this upgrades them. Useful for
 * bootstrapping admin users on a new deployment without a manual SQL step.
 *
 * Lifted from t4bs/functions/_shared/util.js#seedAdminRole and generalized
 * to any role mapping. The role hierarchy is implicit: any non-empty
 * mapped role replaces 'user'; matching roles are no-ops.
 *
 * @example
 *   await seedRoles({
 *     stores,
 *     user,
 *     seedMap: { 'warren': 'admin', 'mod-bob': 'moderator' },
 *     changedBy: 'seed:env',
 *   });
 */
export async function seedRoles({ stores, user, seedMap, changedBy = 'seed' }) {
  if (!user?.handle || !seedMap) return user;
  const desired = seedMap[String(user.handle).toLowerCase()];
  if (!desired) return user;
  if (user.role === desired) return user;
  // Don't downgrade a user whose role is already 'admin' to e.g. 'moderator'.
  if (user.role === 'admin' && desired !== 'admin') return user;

  await stores.users.setRole(user.id, desired, changedBy);
  return { ...user, role: desired };
}

/**
 * Convenience: parse a comma-separated env var list ("alice,bob,charlie")
 * into a `seedMap` for a single role.
 *
 * @example
 *   seedRoles({ stores, user, seedMap: parseHandleList(env.ADMIN_HANDLES, 'admin') });
 */
export function parseHandleList(csv, role) {
  const out = {};
  for (const h of String(csv ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)) {
    out[h] = role;
  }
  return out;
}
