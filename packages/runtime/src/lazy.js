/**
 * Lazy hydration — defer hydration until element is visible or triggered.
 * Zero external dependencies; ESM-only.
 */

/**
 * createLazyHydrator(options) — Creates a lazy hydration controller.
 *
 * @param {object} options
 * @param {string} [options.rootMargin='0px'] IntersectionObserver rootMargin
 * @param {number} [options.threshold=0]       IntersectionObserver threshold
 * @returns {{ observe, disconnect, hydrateNow, getPending }}
 */
export function createLazyHydrator(options = {}) {
  const { rootMargin = '0px', threshold = 0 } = options;
  const pending = new Map(); // element -> hydrateFn
  const hydrated = new WeakSet();
  let observer = null;

  function runHydrate(element) {
    if (hydrated.has(element)) return;
    const hydrateFn = pending.get(element);
    if (!hydrateFn) return;
    pending.delete(element);
    hydrated.add(element);
    observer?.unobserve(element);
    hydrateFn();
  }

  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            runHydrate(entry.target);
          }
        }
      },
      { rootMargin, threshold },
    );
  }

  return {
    /**
     * Watch an element and call hydrateFn when it becomes visible.
     * Falls back to immediate hydration when IntersectionObserver is unavailable.
     */
    observe(element, hydrateFn) {
      if (hydrated.has(element)) return;
      pending.set(element, hydrateFn);
      if (observer) {
        observer.observe(element);
      } else {
        // Fallback: hydrate immediately
        runHydrate(element);
      }
    },

    /** Stop observing all elements and clear pending queue. */
    disconnect() {
      observer?.disconnect();
      pending.clear();
    },

    /** Force immediate hydration of a tracked element. */
    hydrateNow(element) {
      runHydrate(element);
    },

    /** Get count of elements still waiting for hydration. */
    getPending() {
      return pending.size;
    },
  };
}

/**
 * Convenience wrapper — hydrate a single element when it becomes visible.
 *
 * @param {Element}   element
 * @param {Function}  hydrateFn
 * @param {object}    [options]  Forwarded to createLazyHydrator
 */
export function lazyHydrate(element, hydrateFn, options = {}) {
  const hydrator = createLazyHydrator(options);
  hydrator.observe(element, hydrateFn);
  return hydrator;
}

/**
 * Hydrate when the browser is idle.
 * Uses requestIdleCallback where available, falls back to setTimeout.
 *
 * @param {Function} hydrateFn
 * @returns {Function} cancel — call to abort if not yet fired
 */
export function hydrateOnIdle(hydrateFn) {
  let id;
  if (typeof requestIdleCallback !== 'undefined') {
    id = requestIdleCallback(() => hydrateFn());
    return () => cancelIdleCallback(id);
  }
  id = setTimeout(() => hydrateFn(), 0);
  return () => clearTimeout(id);
}

/**
 * Hydrate on the first user interaction with the element.
 *
 * @param {Element}   element
 * @param {Function}  hydrateFn
 * @param {string[]}  [events=['click','focus','mouseenter']]
 * @returns {Function} cleanup — removes all listeners
 */
export function hydrateOnInteraction(element, hydrateFn, events) {
  const eventList = events ?? ['click', 'focus', 'mouseenter'];
  let hydrated = false;

  function handler() {
    if (hydrated) return;
    hydrated = true;
    cleanup();
    hydrateFn();
  }

  function cleanup() {
    for (const evt of eventList) {
      element.removeEventListener(evt, handler);
    }
  }

  for (const evt of eventList) {
    element.addEventListener(evt, handler, { once: true });
  }

  return cleanup;
}

/**
 * Hydrate when a CSS media query matches.
 *
 * @param {Function} hydrateFn
 * @param {string}   query  e.g. '(min-width: 768px)'
 * @returns {Function} cleanup — removes the listener
 */
export function hydrateOnMedia(hydrateFn, query) {
  const mql = matchMedia(query);
  let hydrated = false;

  function check() {
    if (hydrated) return;
    if (mql.matches) {
      hydrated = true;
      cleanup();
      hydrateFn();
    }
  }

  function cleanup() {
    mql.removeEventListener('change', check);
  }

  // Already matches — hydrate immediately
  if (mql.matches) {
    hydrated = true;
    hydrateFn();
    return cleanup;
  }

  mql.addEventListener('change', check);
  return cleanup;
}
