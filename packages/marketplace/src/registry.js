/**
 * createRegistry(options) - Creates a marketplace registry client
 * @param {object} options
 * @param {string} options.url - Registry base URL
 * @param {string} [options.token] - Auth token
 * @returns {object} Registry client
 */
export function createRegistry(options = {}) {
  const { url = 'https://registry.basenative.dev', token } = options;

  function headers() {
    const h = { 'Content-Type': 'application/json' };
    if (token) {
      h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  }

  function buildUrl(path, params = {}) {
    const u = new URL(path, url);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        u.searchParams.set(key, String(value));
      }
    }
    return u.toString();
  }

  async function request(path, opts = {}) {
    const res = await globalThis.fetch(
      typeof path === 'string' && path.startsWith('http') ? path : buildUrl(path),
      { headers: headers(), ...opts }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`Registry request failed: ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return res.json();
  }

  /**
   * Search packages by name/tag.
   * @param {string} query - Search query
   * @param {object} [searchOptions]
   * @param {number} [searchOptions.offset=0]
   * @param {number} [searchOptions.limit=20]
   * @param {string} [searchOptions.tag]
   * @param {string} [searchOptions.category]
   * @param {string} [searchOptions.sort] - e.g. "downloads", "name", "updated"
   * @returns {Promise<{packages: object[], total: number}>}
   */
  async function search(query, searchOptions = {}) {
    const { offset = 0, limit = 20, tag, category, sort } = searchOptions;
    const endpoint = buildUrl('/api/packages/search', {
      q: query,
      offset,
      limit,
      tag,
      category,
      sort,
    });
    return request(endpoint);
  }

  /**
   * Get package details.
   * @param {string} name - Package name
   * @returns {Promise<object>} Package details
   */
  async function getPackage(name) {
    return request(`/api/packages/${encodeURIComponent(name)}`);
  }

  /**
   * List available versions for a package sorted by semver descending.
   * @param {string} name - Package name
   * @returns {Promise<object[]>} Sorted versions
   */
  async function getVersions(name) {
    const data = await request(`/api/packages/${encodeURIComponent(name)}/versions`);
    const versions = Array.isArray(data) ? data : data.versions || [];
    return versions.sort((a, b) => compareSemver(b.version || b, a.version || a));
  }

  /**
   * Publish a package to the registry.
   * @param {object} packageData - Package data to publish
   * @returns {Promise<object>} Published package info
   */
  async function publish(packageData) {
    return request('/api/packages', {
      method: 'POST',
      body: JSON.stringify(packageData),
    });
  }

  /**
   * Unpublish a version from the registry.
   * @param {string} name - Package name
   * @param {string} version - Version to remove
   * @returns {Promise<object>}
   */
  async function unpublish(name, version) {
    return request(
      `/api/packages/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}`,
      { method: 'DELETE' }
    );
  }

  return { search, getPackage, getVersions, publish, unpublish };
}

/**
 * Compare two semver strings. Returns negative if a < b, positive if a > b, 0 if equal.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareSemver(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}
