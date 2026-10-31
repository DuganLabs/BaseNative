/**
 * Align the app-bar More menu to its trigger.
 *
 * Native popovers are centered by the user-agent sheet. WebKit's
 * centering is much wider than Chromium's, so the menu floats
 * detached from the More tab. After the popover opens, measure the
 * trigger and pin the menu above it, inline-end aligned, through one
 * stylesheet rule rather than an inline style. popover="auto" still
 * closes on outside tap and Escape.
 *
 * The two engines need different cascades: WebKit honors plain
 * offsets only after position-area is unset, and ignores them when
 * they are !important. Chromium keeps the anchor position unless the
 * offsets are !important.
 */
(function () {
  var sheet = null;

  function align(menu) {
    var anchorId = menu.getAttribute('anchor');
    var button = anchorId && document.getElementById(anchorId);
    if (!button) return;
    var box = button.getBoundingClientRect();
    var width = menu.offsetWidth || menu.getBoundingClientRect().width;
    var height = menu.offsetHeight || menu.getBoundingClientRect().height;
    var gap = 8;
    var left = Math.min(Math.max(8, box.right - width), window.innerWidth - width - 8);
    var top = Math.max(8, box.top - height - gap);
    if (!sheet) {
      sheet = document.createElement('style');
      sheet.setAttribute('data-bn-more-menu', '');
      document.head.append(sheet);
    }
    var id = menu.id ? '#' + CSS.escape(menu.id) : 'nav[variant="app-bar"] > menu';
    var ua = navigator.userAgent;
    var webkit = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
    if (webkit) {
      sheet.textContent =
        id +
        '{position:fixed;margin:0;inset:auto;position-area:unset;position-anchor:none;left:' +
        Math.round(left) +
        'px;top:' +
        Math.round(top) +
        'px;right:auto;bottom:auto;}';
    } else {
      sheet.textContent =
        id +
        '{position:fixed !important;margin:0 !important;inset:auto !important;left:' +
        Math.round(left) +
        'px !important;top:' +
        Math.round(top) +
        'px !important;right:auto !important;bottom:auto !important;}';
    }
  }

  document.addEventListener(
    'toggle',
    function (event) {
      var menu = event.target;
      if (!menu || menu.tagName !== 'MENU') return;
      if (event.newState !== 'open') return;
      align(menu);
    },
    true,
  );

  window.addEventListener('resize', function () {
    var open = document.querySelector('nav[variant="app-bar"] > menu:popover-open');
    if (open) align(open);
  });
})();
