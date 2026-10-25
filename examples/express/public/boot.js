/**
 * Appearance boot. Sets the theme before first paint: a mode the
 * visitor picked with the theme toggle (stored by specimens.js)
 * wins; otherwise the system appearance decides, as it does with no
 * toggle at all. Keeps the theme-color meta in step. Attributes
 * only: the token sheet owns every visual.
 */
(function () {
  var root = document.documentElement;
  var theme = document.querySelector('meta[name="theme-color"]');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function storedMode() {
    try {
      var mode = window.localStorage.getItem('bn-theme');
      return mode === 'light' || mode === 'dark' ? mode : null;
    } catch {
      return null;
    }
  }

  function apply() {
    var stored = storedMode();
    if (stored) {
      // The toggle's choice is locked in (applyTheme's stamp, plus
      // the lock so the media listener below leaves it alone).
      root.setAttribute('data-theme-lock', '');
      root.setAttribute('data-theme', stored);
      if (theme) theme.setAttribute('content', stored === 'dark' ? '#000000' : '#f2f2f7');
      return;
    }
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
