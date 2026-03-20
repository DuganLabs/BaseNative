/**
 * Enhances anchor elements within a root to use client-side navigation.
 * Intercepts clicks on internal links and calls router.navigate() instead.
 *
 * @param {Element} root - The root element to intercept link clicks within
 * @param {object} router - Router instance from createRouter()
 * @param {object} [options]
 * @param {string} [options.selector] - CSS selector for links to intercept (default: 'a[href]')
 */
export function interceptLinks(root, router, options = {}) {
  const selector = options.selector || 'a[href]';

  function handler(event) {
    const anchor = event.target.closest(selector);
    if (!anchor) return;

    // Skip external links, new tabs, modified clicks
    if (anchor.target === '_blank') return;
    if (anchor.hasAttribute('download')) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:')) return;

    event.preventDefault();
    router.navigate(href);
  }

  root.addEventListener('click', handler);

  return () => root.removeEventListener('click', handler);
}
