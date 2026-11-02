/**
 * The page filter: the search field in the page nav's header (page.js
 * renderPageNav) filters what the route's `pageSearch.items` selector
 * names. An item stays when its data-bn-search (or its text) holds every
 * word of the query. A section ([data-bn-nav]) left with no item hides,
 * and the scrollspy hides its link with it. The status line counts what
 * is left and offers a reset; Escape clears the field.
 */
(function () {
  var config = document.querySelector('script[data-bn-page-filter]');
  var input = document.getElementById('bn-page-q');
  if (!config || !input) return;
  var spec = JSON.parse(config.textContent);
  var items = Array.from(document.querySelectorAll(spec.items));
  var groups = Array.from(document.querySelectorAll('main [data-bn-nav]'));
  var status = config.closest('header').querySelector('p[role="status"]');
  var count = status && status.querySelector('[data-bn-page-filter-count]');
  var reset = status && status.querySelector('[data-bn-page-filter-reset]');
  var text = new Map();
  for (var item of items) {
    text.set(item, (item.getAttribute('data-bn-search') || item.textContent || '').toLowerCase());
  }

  function apply() {
    var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    for (var it of items) {
      var hay = text.get(it);
      var keep = words.every(function (w) {
        return hay.includes(w);
      });
      it.hidden = !keep;
      if (keep) shown++;
    }
    for (var g of groups) {
      var own = items.filter(function (i) {
        return g.contains(i);
      });
      if (!own.length) {
        /* A section with nothing to filter hides while a query is on. */
        g.hidden = words.length > 0;
        continue;
      }
      g.hidden = own.every(function (i) {
        return i.hidden;
      });
    }
    if (status) {
      status.hidden = words.length === 0;
      var noun = spec.noun || ['result', 'results'];
      if (count) count.textContent = shown === 0 ? 'No matches.' : shown + ' ' + (shown === 1 ? noun[0] : noun[1]);
    }
    document.documentElement.toggleAttribute('data-bn-no-results', words.length > 0 && shown === 0);
  }

  input.addEventListener('input', apply);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && input.value) {
      input.value = '';
      apply();
    }
  });
  if (reset) {
    reset.addEventListener('click', function () {
      input.value = '';
      apply();
      input.focus();
    });
  }
  if (input.value) apply();
})();
