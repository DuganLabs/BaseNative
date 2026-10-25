/**
 * /compare — activates the counter tab strip rendered by the catalog's
 * tabs composite.
 *
 * The markup and its ARIA wiring come from @basenative/components; this only
 * supplies the WAI-ARIA APG keyboard behaviour on the client. Without it
 * the first panel still renders server-side, so the page is readable
 * with JavaScript off.
 */
const ready = (fn) =>
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();

ready(() => {
  for (const widget of document.querySelectorAll('section[variant="tabs"]')) {
    const tabs = [...widget.querySelectorAll('[role="tab"]')];
    const panels = [...widget.querySelectorAll('[role="tabpanel"]')];
    if (!tabs.length) continue;

    const activate = (tab) => {
      for (const other of tabs) {
        const selected = other === tab;
        other.setAttribute('aria-selected', String(selected));
        other.tabIndex = selected ? 0 : -1;
      }
      for (const panel of panels) {
        panel.hidden = panel.getAttribute('aria-labelledby') !== tab.id;
      }
    };

    const move = (from, delta) => {
      const next = tabs[(tabs.indexOf(from) + delta + tabs.length) % tabs.length];
      next.focus();
      activate(next);
    };

    for (const tab of tabs) {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (event) => {
        const keys = {
          ArrowRight: () => move(tab, 1),
          ArrowLeft: () => move(tab, -1),
          Home: () => {
            tabs[0].focus();
            activate(tabs[0]);
          },
          End: () => {
            tabs.at(-1).focus();
            activate(tabs.at(-1));
          },
        };
        const handler = keys[event.key];
        if (!handler) return;
        event.preventDefault();
        handler();
      });
    }
  }
});
