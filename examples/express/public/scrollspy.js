/**
 * The page nav's scrollspy. One page nav per page (page.js
 * renderPageNav): a sticky row of in-page links. This marks the link for
 * the section in view, keeps that link scrolled into view inside the row
 * (the row scrolls sideways, the page never moves), hides the link of a
 * section that is hidden (the builder's code panel before export, a
 * section the page filter emptied). The section in view is the last one
 * whose top has crossed the viewport's centre line, so a short section is
 * marked as surely as a long one; at the end of the page the last section
 * is marked even when its top can't reach the line.
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
    for (var s of linkByTarget.keys())
      mo.observe(s, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* A clicked link holds the mark until its jump settles; a short target
     would otherwise hand it to the next section the moment it lands. */
  var held = 0;
  function release() {
    held = 0;
    pick();
  }
  for (var [, a2] of linkByTarget) {
    a2.addEventListener('click', function (event) {
      setCurrent(event.currentTarget);
      clearTimeout(held);
      held = setTimeout(release, 1000);
    });
  }

  function pick() {
    if (held || !linkByTarget.size) return;
    var line = window.innerHeight / 2;
    var doc = document.documentElement;
    var atEnd = window.scrollY + window.innerHeight >= doc.scrollHeight - 2;
    var best = null;
    var bestTop = -Infinity;
    var first = null;
    var firstTop = Infinity;
    for (var [section, a] of linkByTarget) {
      var li = a.closest('li');
      if (li && li.hidden) continue;
      var top = section.getBoundingClientRect().top;
      if (top < firstTop) {
        firstTop = top;
        first = a;
      }
      if ((top <= line || (atEnd && top < window.innerHeight)) && top > bestTop) {
        bestTop = top;
        best = a;
      }
    }
    setCurrent(best || first);
  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      pick();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  pick();
})();
