/**
 * Contents scrollspy. The /docs contents list links to its sections by
 * fragment; this watches those sections and keeps aria-current="true"
 * on the link for the section in view, styled by the same current
 * treatment as the app nav (PR #302).
 *
 * /components: the category TOC strip is retired — the nav that
 * survives is the sticky filter bar — so there the mark lands on the
 * filter button for the category section in view. The buttons are
 * registered after the link pass, so a button wins over a strip link
 * for the same section while both navs exist.
 *
 * Attributes only: the sheet owns every visual. No-ops on pages
 * without a contents nav, and where IntersectionObserver is missing
 * the links stay plain anchors.
 */
(function () {
  if (typeof IntersectionObserver === 'undefined') return;

  var controlsByTarget = new Map();
  var navs = document.querySelectorAll('[data-bn-docs-toc], [data-bn-component-toc]');
  for (var nav of navs) {
    for (var link of nav.querySelectorAll('a[href^="#"]')) {
      var id = link.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (target) controlsByTarget.set(target, link);
    }
  }

  var filterBar = document.querySelector('[data-bn-component-filters]');
  if (filterBar) {
    for (var button of filterBar.querySelectorAll('[data-bn-component-filter]')) {
      var cat = button.getAttribute('data-bn-component-filter');
      if (!cat || cat === 'all') continue;
      var section = document.getElementById('cat-' + cat);
      if (section) controlsByTarget.set(section, button);
    }
  }
  if (!controlsByTarget.size) return;

  function setCurrent(control) {
    for (var other of controlsByTarget.values()) {
      if (other === control) other.setAttribute('aria-current', 'true');
      else other.removeAttribute('aria-current');
    }
  }

  var observer = new IntersectionObserver(
    function (entries) {
      for (var entry of entries) {
        if (entry.isIntersecting) setCurrent(controlsByTarget.get(entry.target));
      }
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  for (var observed of controlsByTarget.keys()) observer.observe(observed);
})();
