/**
 * Remote feature flag provider — fetches flags from an HTTP endpoint.
 */
export function createRemoteProvider(options = {}) {
  const {
    url,
    headers = {},
    pollInterval = 60_000,
    timeout = 5000,
  } = options;

  if (!url) throw new Error('Remote flag provider requires a URL');

  let cache = {};
  let pollTimer = null;

  async function fetchFlags() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await globalThis.fetch(url, {
        headers: { 'Content-Type': 'application/json', ...headers },
        signal: controller.signal,
      });
      if (response.ok) {
        cache = await response.json();
      }
    } catch {
      // Keep using cached values on failure
    } finally {
      clearTimeout(timer);
    }
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(fetchFlags, pollInterval);
    if (pollTimer.unref) pollTimer.unref();
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  return {
    async getFlag(name) {
      return cache[name] ?? null;
    },

    async getAllFlags() {
      return { ...cache };
    },

    async refresh() {
      await fetchFlags();
    },

    startPolling,
    stopPolling,
  };
}
