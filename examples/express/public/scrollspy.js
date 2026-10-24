/**
 * Table-of-contents scrollspy. Every in-page contents nav on the site
 * (the /docs contents list, the /components category TOC) links to
 * sections by fragment; this watches those sections and keeps
 * aria-current="true" on the link for the section in view, styled by
 * the same current treatment as the app nav (PR #302). One generic
 * pass over both navs — the /showcase TOC wires its own because its
 * links are filter-aware.
 *
 * Attributes only: the sheet owns every visual. No-ops on pages
 * without a contents nav, and where IntersectionObserver is missing
 * the links stay plain anchors.
 */
(function () {
  var navs = document.querySelectorAll('[data-bn-docs-toc], [data-bn-component-toc]');
  if (!navs.length || typeof IntersectionObserver === 'undefined') return;

  var linksById = new Map();
  for (var nav of navs) {
    for (var link of nav.querySelectorAll('a[href^="#"]')) {
      var id = link.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (target) linksById.set(target, link);
    }
  }
  if (!linksById.size) return;

  function setCurrent(link) {
    for (var other of linksById.values()) {
      if (other === link) other.setAttribute('aria-current', 'true');
      else other.removeAttribute('aria-current');
    }
  }

  var observer = new IntersectionObserver(
    function (entries) {
      for (var entry of entries) {
        if (entry.isIntersecting) setCurrent(linksById.get(entry.target));
      }
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  for (var target of linksById.keys()) observer.observe(target);
})();
