/**
 * In-memory feature flag provider.
 */
export function createMemoryProvider(initialFlags = {}) {
  const flags = new Map(Object.entries(initialFlags));

  return {
    async getFlag(name) {
      return flags.get(name) ?? null;
    },

    async getAllFlags() {
      return Object.fromEntries(flags);
    },

    async setFlag(name, config) {
      flags.set(name, config);
    },

    async deleteFlag(name) {
      flags.delete(name);
    },
  };
}
