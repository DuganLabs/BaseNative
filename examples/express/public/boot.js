/**
 * Appearance boot. Sets the theme from the system appearance before
 * first paint, and keeps the theme-color meta in step. Attributes
 * only: the token sheet owns every visual.
 */
(function () {
  var root = document.documentElement;
  var theme = document.querySelector('meta[name="theme-color"]');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function apply() {
    var dark = darkQuery.matches;
    if (!root.hasAttribute('data-theme-lock')) {
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
    }
    if (theme) theme.setAttribute('content', dark ? '#000000' : '#f2f2f7');
  }

  apply();
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', apply);
  else if (darkQuery.addListener) darkQuery.addListener(apply);
})();
