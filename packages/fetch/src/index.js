import { signal, computed, effect } from '@basenative/runtime';

/**
 * Create a signal-based async resource.
 * Automatically fetches data and exposes reactive state.
 *
 * @param {Function} fetcher - Async function that returns data
 * @param {object} [options]
 * @returns {object} Resource with data, loading, error signals
 */
export function createResource(fetcher, options = {}) {
  const { initialData, immediate = true, key } = options;

  const data = signal(initialData ?? null);
  const loading = signal(false);
  const error = signal(null);
  const status = computed(() => {
    if (loading()) return 'loading';
    if (error()) return 'error';
    if (data() !== null) return 'success';
    return 'idle';
  });

  let abortController = null;

  async function fetch(params) {
    abortController?.abort();
    abortController = new AbortController();

    loading.set(true);
    error.set(null);

    try {
      const result = await fetcher(params, { signal: abortController.signal });
      data.set(result);
      loading.set(false);
      return result;
    } catch (err) {
      if (err.name !== 'AbortError') {
        error.set(err);
        loading.set(false);
      }
      return null;
    }
  }

  async function refetch(params) {
    return fetch(params);
  }

  function mutate(value) {
    data.set(typeof value === 'function' ? value(data.peek()) : value);
  }

  if (immediate) {
    fetch();
  }

  return { data, loading, error, status, fetch, refetch, mutate };
}

/**
 * Create a signal-based mutation (for POST/PUT/DELETE operations).
 *
 * @param {Function} mutationFn - Async function that performs the mutation
 * @param {object} [options]
 */
export function createMutation(mutationFn, options = {}) {
  const { onSuccess, onError } = options;

  const data = signal(null);
  const loading = signal(false);
  const error = signal(null);
  const status = computed(() => {
    if (loading()) return 'loading';
    if (error()) return 'error';
    if (data() !== null) return 'success';
    return 'idle';
  });

  async function mutate(params) {
    loading.set(true);
    error.set(null);

    try {
      const result = await mutationFn(params);
      data.set(result);
      loading.set(false);
      onSuccess?.(result, params);
      return result;
    } catch (err) {
      error.set(err);
      loading.set(false);
      onError?.(err, params);
      return null;
    }
  }

  function reset() {
    data.set(null);
    loading.set(false);
    error.set(null);
  }

  return { data, loading, error, status, mutate, reset };
}

/**
 * Request cache for deduplication.
 */
export function createCache(options = {}) {
  const { maxAge = 5 * 60 * 1000, maxSize = 100 } = options;
  const cache = new Map();

  function get(key) {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  function set(key, data) {
    if (cache.size >= maxSize) {
      const first = cache.keys().next().value;
      cache.delete(first);
    }
    cache.set(key, { data, expiresAt: Date.now() + maxAge });
  }

  function invalidate(key) {
    if (key) cache.delete(key);
    else cache.clear();
  }

  function has(key) {
    return get(key) !== undefined;
  }

  return { get, set, invalidate, has, get size() { return cache.size; } };
}

/**
 * JSON fetch helper with error handling.
 */
export async function fetchJson(url, options = {}) {
  const response = await globalThis.fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    error.status = response.status;
    error.response = response;
    throw error;
  }

  return response.json();
}
