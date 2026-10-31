/**
 * Contents scrollspy. Marks the in-page sidebar link or filter chip
 * for the section in view. The docs subnav and the component chips
 * are both the sidebar component (variants subnav and chips).
 */
(function () {
  if (typeof IntersectionObserver === 'undefined') return;

  var controlsByTarget = new Map();
  var navs = document.querySelectorAll('aside[variant="subnav"]');
  for (var nav of navs) {
    for (var link of nav.querySelectorAll('a[href^="#"]')) {
      var id = link.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (target) controlsByTarget.set(target, link);
    }
  }

  var filterBar = document.querySelector('aside[variant="chips"]');
  if (filterBar) {
    for (var button of filterBar.querySelectorAll('button')) {
      var cat = button.value;
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
