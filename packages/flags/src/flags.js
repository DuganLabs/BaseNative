/**
 * Feature flag manager.
 */
export function createFlagManager(provider, options = {}) {
  const { defaultValue = false } = options;

  return {
    /**
     * Check if a flag is enabled.
     */
    async isEnabled(flagName, context = {}) {
      const flag = await provider.getFlag(flagName);
      if (!flag) return defaultValue;

      // Simple boolean flag
      if (typeof flag.enabled === 'boolean' && !flag.rules) {
        return flag.enabled;
      }

      // Percentage rollout
      if (flag.percentage !== undefined) {
        const hash = simpleHash(context.userId ?? context.sessionId ?? 'anonymous');
        return hash % 100 < flag.percentage;
      }

      // Rule-based targeting
      if (flag.rules) {
        for (const rule of flag.rules) {
          if (matchRule(rule, context)) return rule.value ?? true;
        }
      }

      return flag.enabled ?? defaultValue;
    },

    /**
     * Get all flags for a context (useful for client-side hydration).
     */
    async getAll(context = {}) {
      const allFlags = await provider.getAllFlags();
      const result = {};
      for (const name of Object.keys(allFlags)) {
        result[name] = await this.isEnabled(name, context);
      }
      return result;
    },

    /**
     * Set a flag value (if provider supports it).
     */
    async setFlag(flagName, config) {
      if (provider.setFlag) {
        await provider.setFlag(flagName, config);
      }
    },
  };
}

/**
 * Middleware that attaches feature flags to context.
 */
export function flagMiddleware(flagManager) {
  return async (ctx, next) => {
    ctx.state.flags = flagManager;
    ctx.state.isEnabled = async (name) => {
      const context = {
        userId: ctx.state.user?.id,
        sessionId: ctx.state.session?.id,
        role: ctx.state.user?.role,
        ...ctx.state.flagContext,
      };
      return flagManager.isEnabled(name, context);
    };
    await next();
  };
}

function matchRule(rule, context) {
  if (rule.userIds && rule.userIds.includes(context.userId)) return true;
  if (rule.roles && rule.roles.includes(context.role)) return true;
  if (rule.condition && typeof rule.condition === 'function') return rule.condition(context);
  return false;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
