/**
 * The page nav's scrollspy. One page nav per page (page.js
 * renderPageNav): a sticky row of in-page links. This marks the link for
 * the section in view, keeps that link scrolled into view inside the row
 * (the row scrolls sideways, the page never moves), hides the link of a
 * section that is hidden (the builder's code panel before export, a
 * section the page filter emptied), and publishes the bar's height as
 * --size-page-nav-block so an anchor jump lands below the bar.
 */
(function () {
  var nav = document.querySelector('aside[variant="subnav"]');
  if (!nav) return;
  var row = nav.querySelector('ul');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  var linkByTarget = new Map();
  for (var link of nav.querySelectorAll('a[href^="#"]')) {
    var id = decodeURIComponent(link.getAttribute('href').slice(1));
    var target = id && document.getElementById(id);
    if (target) linkByTarget.set(target, link);
  }

  /* Scroll the row, never the page: scrollIntoView would also scroll
     the document to the sticky bar's static position. */
  function reveal(link) {
    if (!row || !link) return;
    var r = row.getBoundingClientRect();
    var l = link.getBoundingClientRect();
    var delta = l.left + l.width / 2 - (r.left + r.width / 2);
    if (Math.abs(delta) < 1) return;
    row.scrollTo({
      left: row.scrollLeft + delta,
      behavior: reduce && reduce.matches ? 'auto' : 'smooth',
    });
  }

  var current = null;
  function setCurrent(link) {
    if (!link || link === current) return;
    current = link;
    for (var other of linkByTarget.values()) {
      if (other === link) other.setAttribute('aria-current', 'true');
      else other.removeAttribute('aria-current');
    }
    reveal(link);
  }

  function syncHidden() {
    for (var [section, a] of linkByTarget) {
      var li = a.closest('li');
      if (li) li.hidden = section.hidden || !!section.closest('[hidden]');
    }
  }
  syncHidden();
  if (typeof MutationObserver !== 'undefined') {
    var mo = new MutationObserver(syncHidden);
    for (var s of linkByTarget.keys()) mo.observe(s, { attributes: true, attributeFilter: ['hidden'] });
  }

  for (var [, a2] of linkByTarget) {
    a2.addEventListener('click', function (event) {
      setCurrent(event.currentTarget);
    });
  }

  if (typeof IntersectionObserver === 'undefined' || !linkByTarget.size) return;
  var observer = new IntersectionObserver(
    function (entries) {
      for (var entry of entries) {
        if (entry.isIntersecting) setCurrent(linkByTarget.get(entry.target));
      }
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  for (var observed of linkByTarget.keys()) observer.observe(observed);
})();
