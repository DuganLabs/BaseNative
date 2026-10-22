/**
 * Viewport chrome. Sets platform, device, and control size from the
 * width, and the theme from the system appearance, before first paint.
 * Attributes only: the sheet owns every visual.
 */
(function () {
  var root = document.documentElement;
  var theme = document.querySelector('meta[name="theme-color"]');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function apply() {
    var width = window.innerWidth;
    var dark = darkQuery.matches;
    root.setAttribute('data-bn-platform', width >= 1100 ? 'macos' : 'ios');
    root.setAttribute('data-bn-device', width >= 1100 ? 'mac' : width >= 768 ? 'ipad' : 'iphone');
    root.setAttribute('data-bn-control', width >= 1100 ? 'medium' : 'large');
    if (!root.hasAttribute('data-theme-lock')) {
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
    }
    if (theme) theme.setAttribute('content', dark ? '#000000' : '#f2f2f7');
  }

  apply();
  window.addEventListener('resize', apply);
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', apply);
  else if (darkQuery.addListener) darkQuery.addListener(apply);
})();
