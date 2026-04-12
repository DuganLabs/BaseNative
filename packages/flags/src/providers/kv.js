/**
 * Cloudflare KV-backed feature flag provider with edge caching.
 *
 * @param {object} options
 * @param {object} options.kv - Cloudflare KV namespace binding (env.FLAGS or similar)
 * @param {string} [options.prefix='flags:'] - Key prefix in KV
 * @param {number} [options.cacheTtl=60] - Edge cache TTL in seconds
 * @returns {import('../../types/index.d.ts').FlagProvider}
 */
export function createKVProvider(options) {
  const { kv, prefix = 'flags:', cacheTtl = 60 } = options;

  if (!kv) throw new Error('@basenative/flags: KV binding is required for createKVProvider');

  async function getFlag(name) {
    const value = await kv.get(`${prefix}${name}`, { type: 'json', cacheTtl });
    return value || null;
  }

  async function getAllFlags() {
    const list = await kv.list({ prefix });
    const flags = {};
    const promises = list.keys.map(async (key) => {
      const name = key.name.replace(prefix, '');
      const value = await kv.get(key.name, { type: 'json', cacheTtl });
      if (value) flags[name] = value;
    });
    await Promise.all(promises);
    return flags;
  }

  async function setFlag(name, flag) {
    await kv.put(`${prefix}${name}`, JSON.stringify(flag));
  }

  async function deleteFlag(name) {
    await kv.delete(`${prefix}${name}`);
  }

  return { getFlag, getAllFlags, setFlag, deleteFlag };
}
