/**
 * Deterministic element ids for server and client renders.
 *
 * Every renderer that needs a generated id calls `nextId(prefix)`, which draws
 * from a module-level counter instead of `Math.random()`. Hydration matches
 * server-rendered markup to client state by id, so a page must satisfy one of:
 *
 *   1. pass an explicit `id` option to every component that is hydrated, or
 *   2. render the same components in the same order on server and client, and
 *      call `resetIds()` at the start of every server request so the counter
 *      restarts from zero for each response.
 *
 * Every renderer honours an explicit `id` option before falling back to nextId().
 */
let counter = 0;

/**
 * Return the next deterministic id, `bn-<prefix>-<n>`, from the module counter.
 *
 * @param {string} prefix  Component name, e.g. 'dialog' → 'bn-dialog-1'
 * @returns {string}
 */
export function nextId(prefix) {
  counter += 1;
  return `bn-${prefix}-${counter}`;
}

/**
 * Restart the id counter at zero. Call once per SSR request, before rendering,
 * so two renders of the same page produce byte-identical markup and a client
 * hydrating in the same render order derives the same ids.
 */
export function resetIds() {
  counter = 0;
}
