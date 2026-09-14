import {
  signal,
  effect,
  initTabs,
  initDrawer,
  initDropdownMenu,
  initCommandPalette,
  initVirtualList,
} from '/basenative.js';

const ready = (fn) =>
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();

// Tabs, drawers, dropdown menus, the command palette and the virtual list run
// the package's own initialisers; the functions below only find the rendered
// roots and wire the demo's triggers and toasts to them.
ready(() => {
  wireTabs();
  wireDialogs();
  wireDrawer();
  wireTooltips();
  wireAlerts();
  const toaster = wireToasts();
  wireDropdowns(toaster);
  wireCommandPalette(toaster);
  wireToastButtons(toaster);
  wireVirtualList();
  wirePagination();
  wireCounter();
  wireClock();
  wireLiveCounter();
  wireLiveValidate();
  wireLiveProgress();
  wireThemePicker();
  wireSourceCopy();
  wireShowcaseFilter();
  wireShowcaseToc();
});

function wireTabs() {
  for (const tabs of document.querySelectorAll('[data-bn="tabs"]')) initTabs(tabs);
}

function wireDialogs() {
  for (const trigger of document.querySelectorAll('[data-bn-action="open-dialog"]')) {
    const target = document.getElementById(trigger.getAttribute('data-bn-target'));
    if (!target) continue;
    trigger.addEventListener('click', () => target.showModal());
  }
  for (const closer of document.querySelectorAll('[data-bn="dialog-close"]')) {
    closer.addEventListener('click', () => closer.closest('[data-bn="dialog"]')?.close());
  }
  for (const dialog of document.querySelectorAll('[data-bn="dialog"]')) {
    for (const btn of dialog.querySelectorAll('[data-bn="dialog-footer"] [data-bn="button"]')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        dialog.close();
      });
    }
  }
}

function wireDrawer() {
  for (const trigger of document.querySelectorAll('[data-bn-action="open-drawer"]')) {
    const drawer = document.getElementById(trigger.getAttribute('data-bn-target'));
    if (!drawer) continue;
    const panel = initDrawer(drawer);
    trigger.addEventListener('click', () => panel.open());
  }
}

function wireDropdowns(toaster) {
  for (const dropdown of document.querySelectorAll('[data-bn="dropdown"]')) {
    initDropdownMenu(dropdown, {
      onSelect: (action, item) => {
        toaster?.push(item.textContent.trim(), action === 'delete' ? 'error' : 'info');
      },
    });
  }
}

function wireTooltips() {
  for (const trigger of document.querySelectorAll('[data-bn="tooltip-trigger"]')) {
    const id = trigger.getAttribute('popovertarget');
    if (!id) continue;
    const tip = document.getElementById(id);
    if (!tip) continue;

    const supportsPopover = tip.hasAttribute('popover') && typeof tip.showPopover === 'function';

    if (!trigger.hasAttribute('tabindex')) trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('aria-describedby', id);

    const positionTip = () => {
      const rect = trigger.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      const pos = tip.dataset.position || 'top';
      let top = 0,
        left = 0;
      if (pos === 'top') {
        top = rect.top - tipRect.height - 8;
        left = rect.left + rect.width / 2 - tipRect.width / 2;
      } else if (pos === 'bottom') {
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2 - tipRect.width / 2;
      } else if (pos === 'left') {
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        left = rect.left - tipRect.width - 8;
      } else if (pos === 'right') {
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        left = rect.right + 8;
      }
      const margin = 8;
      const maxLeft = window.innerWidth - tipRect.width - margin;
      tip.style.top = `${Math.max(margin, top + window.scrollY)}px`;
      tip.style.left = `${Math.min(maxLeft, Math.max(margin, left + window.scrollX))}px`;
    };

    const show = () => {
      if (supportsPopover) {
        if (!tip.matches(':popover-open')) tip.showPopover();
      } else {
        tip.setAttribute('data-open', '');
      }
      requestAnimationFrame(positionTip);
    };
    const hide = () => {
      if (supportsPopover) {
        if (tip.matches(':popover-open')) tip.hidePopover();
      } else {
        tip.removeAttribute('data-open');
      }
    };

    trigger.addEventListener('mouseenter', show);
    trigger.addEventListener('mouseleave', hide);
    trigger.addEventListener('focus', show);
    trigger.addEventListener('blur', hide);
  }
}

function wireCommandPalette(toaster) {
  const palettes = new Map();
  for (const dialog of document.querySelectorAll('[data-bn="command-palette"]')) {
    const palette = initCommandPalette(dialog, {
      hotkey: 'Mod+K',
      onSelect: (action, item) => {
        const label = item.querySelector('[data-bn="command-label"]')?.textContent ?? action;
        toaster?.push(`Ran command: ${label}`, action === 'delete' ? 'error' : 'success');
      },
    });
    palettes.set(dialog.id, palette);
  }
  for (const trigger of document.querySelectorAll('[data-bn-action="open-command-palette"]')) {
    const palette = palettes.get(trigger.getAttribute('data-bn-target'));
    if (palette) trigger.addEventListener('click', () => palette.open());
  }
}

function wireAlerts() {
  for (const btn of document.querySelectorAll('[data-bn="alert-dismiss"]')) {
    btn.addEventListener('click', () => btn.closest('[data-bn="alert"]')?.remove());
  }
}

function wireToasts() {
  const container = document.querySelector('[data-bn="toast-container"]');
  if (!container) return null;

  const toasts = signal([]);

  effect(() => {
    const list = toasts();
    container.innerHTML = '';
    for (const t of list) {
      const el = document.createElement('output');
      el.setAttribute('data-bn', 'toast');
      el.setAttribute('data-variant', t.variant);
      el.setAttribute('role', 'status');
      el.textContent = t.message;
      container.append(el);
    }
  });

  const push = (message, variant = 'info', duration = 3200) => {
    const id = Date.now() + Math.random();
    toasts.set((prev) => [...prev, { id, message, variant }]);
    if (duration > 0) {
      setTimeout(() => {
        toasts.set((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  };

  return { push, toasts };
}

function wireToastButtons(toaster) {
  if (!toaster) return;
  for (const btn of document.querySelectorAll('[data-bn-action="toast"]')) {
    btn.addEventListener('click', () => {
      toaster.push(btn.dataset.bnMessage || 'Toast', btn.dataset.bnVariant || 'info');
    });
  }
}

function wireCounter() {
  const root = document.querySelector('[data-bn-counter-readout]');
  if (!root) return;

  const count = signal(0);
  const valueEl = root.querySelector('[data-bn-counter-value]');
  const doubledEl = root.querySelector('[data-bn-counter-doubled]');
  const parityEl = root.querySelector('[data-bn-counter-parity]');

  effect(() => {
    const n = count();
    if (valueEl) valueEl.textContent = String(n);
    if (doubledEl) doubledEl.textContent = String(n * 2);
    if (parityEl) {
      const p = n % 2 === 0 ? 'even' : 'odd';
      parityEl.textContent = p;
      parityEl.dataset.parity = p;
    }
  });

  document
    .querySelector('[data-bn-action="cc-inc"]')
    ?.addEventListener('click', () => count.set((c) => c + 1));
  document
    .querySelector('[data-bn-action="cc-dec"]')
    ?.addEventListener('click', () => count.set((c) => c - 1));
}

function wireClock() {
  const el = document.querySelector('[data-bn-clock]');
  if (!el) return;
  const time = signal(new Date());
  effect(() => {
    el.textContent = time().toLocaleTimeString();
  });
  setInterval(() => time.set(new Date()), 1000);
}

function wireLiveCounter() {
  const out = document.querySelector('[data-bn-live-counter]');
  if (!out) return;
  const count = signal(0);
  effect(() => {
    out.textContent = String(count());
  });
  document
    .querySelector('[data-bn-action="counter-inc"]')
    ?.addEventListener('click', () => count.set((c) => c + 1));
  document
    .querySelector('[data-bn-action="counter-dec"]')
    ?.addEventListener('click', () => count.set((c) => c - 1));
  document
    .querySelector('[data-bn-action="counter-reset"]')
    ?.addEventListener('click', () => count.set(0));
}

function wireLiveValidate() {
  const feedback = document.querySelector('[data-bn-live-validate-feedback]');
  if (!feedback) return;
  const input = document.querySelector('input[name="live-username"]');
  if (!input) return;
  input.setAttribute('minlength', '3');
  input.setAttribute('maxlength', '20');
  const min = 3;
  const max = 20;
  const value = signal(input.value);
  effect(() => {
    const v = value();
    if (v.length === 0) {
      feedback.textContent = '';
      input.removeAttribute('aria-invalid');
      feedback.removeAttribute('data-bn-state');
      return;
    }
    if (v.length < min) {
      feedback.textContent = `Need at least ${min} characters (have ${v.length}).`;
      input.setAttribute('aria-invalid', 'true');
      feedback.setAttribute('data-bn-state', 'error');
    } else if (v.length > max) {
      feedback.textContent = `Too long — max ${max}.`;
      input.setAttribute('aria-invalid', 'true');
      feedback.setAttribute('data-bn-state', 'error');
    } else {
      feedback.textContent = `Looks good (${v.length}/${max}).`;
      input.setAttribute('aria-invalid', 'false');
      feedback.setAttribute('data-bn-state', 'ok');
    }
  });
  input.addEventListener('input', () => value.set(input.value));
}

function wireLiveProgress() {
  const toggle = document.querySelector('[data-bn-action="progress-toggle"]');
  const bar = toggle
    ?.closest('[data-bn-showcase-demo]')
    ?.querySelector('progress[data-bn="progress"]');
  if (!bar) return;
  const v = signal(0);
  const running = signal(true);
  effect(() => {
    bar.value = v();
  });
  let id = null;
  const start = () => {
    if (id) return;
    id = setInterval(() => v.set((p) => (p + 5) % 105), 200);
  };
  const stop = () => {
    if (!id) return;
    clearInterval(id);
    id = null;
  };
  effect(() => {
    if (running()) start();
    else stop();
  });
  document.querySelector('[data-bn-action="progress-toggle"]')?.addEventListener('click', () => {
    running.set((r) => !r);
  });
  document.querySelector('[data-bn-action="progress-reset"]')?.addEventListener('click', () => {
    v.set(0);
  });
}

function wireThemePicker() {
  const root = document.documentElement;
  const original = getComputedStyle(root).getPropertyValue('--accent').trim();
  for (const btn of document.querySelectorAll('[data-bn-action="theme"]')) {
    btn.addEventListener('click', () => {
      const accent = btn.getAttribute('data-bn-accent');
      if (accent) root.style.setProperty('--accent', accent);
      else root.style.setProperty('--accent', original);
    });
  }
}

function wireSourceCopy() {
  for (const btn of document.querySelectorAll('[data-bn-action="copy-code"]')) {
    btn.addEventListener('click', async () => {
      const pre = btn.parentElement?.querySelector('pre code');
      if (!pre) return;
      try {
        await navigator.clipboard.writeText(pre.textContent || '');
        const prev = btn.textContent;
        btn.textContent = 'Copied ✓';
        btn.setAttribute('data-bn-copied', '');
        setTimeout(() => {
          btn.textContent = prev;
          btn.removeAttribute('data-bn-copied');
        }, 1400);
      } catch {
        btn.textContent = 'Copy failed';
      }
    });
  }
}

function wireShowcaseFilter() {
  const input = document.querySelector('[data-bn-showcase-q]');
  const clear = document.querySelector('[data-bn-showcase-clear]');
  if (!input) return;
  const sections = [...document.querySelectorAll('[data-bn-showcase-section]')];
  const tocLinks = [...document.querySelectorAll('[data-bn-showcase-toc-link]')];
  const results = document.querySelector('[data-bn-showcase-search]') || document.documentElement;
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    for (const sec of sections) {
      const title = (sec.getAttribute('data-bn-title') || '').toLowerCase();
      const cat = (sec.getAttribute('data-bn-category') || '').toLowerCase();
      const captions = [...sec.querySelectorAll('figcaption')]
        .map((f) => f.textContent.toLowerCase())
        .join(' ');
      const match = !q || title.includes(q) || cat.includes(q) || captions.includes(q);
      sec.toggleAttribute('hidden', !match);
      if (match) visible++;
    }
    for (const link of tocLinks) {
      const id = link.getAttribute('data-bn-target');
      const target = id && document.getElementById(id);
      link.toggleAttribute('hidden', !target || target.hasAttribute('hidden'));
    }
    results.toggleAttribute('data-bn-showcase-empty', visible === 0);
  };
  input.addEventListener('input', apply);
  clear?.addEventListener('click', () => {
    input.value = '';
    apply();
    input.focus();
  });
}

function wireShowcaseToc() {
  const links = document.querySelectorAll('[data-bn-showcase-toc-link]');
  if (links.length === 0) return;
  const sections = [...document.querySelectorAll('[data-bn-showcase-section]')];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          for (const link of links) {
            if (link.getAttribute('data-bn-target') === id)
              link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
          }
        }
      }
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  for (const sec of sections) observer.observe(sec);
}

// The pagination demo renders real anchors (so it stays focusable and
// keyboard-activatable) against a '#' baseUrl. Take the clicks over and move
// the current page in place; letting them through would navigate to the same
// static page and throw away the scroll position.
function wirePagination() {
  for (const nav of document.querySelectorAll('[data-bn="pagination"]')) {
    const pageOf = (a) =>
      Number(new URL(a.href).searchParams.get('page') || a.hash.match(/page=(\d+)/)?.[1]);
    nav.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link || !nav.contains(link)) return;
      e.preventDefault();
      const target = pageOf(link);
      if (!target) return;
      const pages = [...nav.querySelectorAll('li > a, li > span')];
      const numbered = pages.filter((el) => /^\d+$/.test(el.textContent.trim()));
      for (const el of numbered) {
        const n = Number(el.textContent.trim());
        if (n === target) {
          el.setAttribute('aria-current', 'page');
          el.setAttribute('data-active', '');
        } else {
          el.removeAttribute('aria-current');
          el.removeAttribute('data-active');
        }
      }
      const prev = nav.querySelector('[rel="prev"]');
      const next = nav.querySelector('[rel="next"]');
      if (prev) prev.href = `#?page=${target - 1}`;
      if (next) next.href = `#?page=${target + 1}`;
    });
  }
}

// The server rendered the first window of rows from a generated list; rebuild
// that list from the total the markup carries and the first row's label so the
// package can re-slice the window as the region scrolls.
function wireVirtualList() {
  for (const container of document.querySelectorAll('[data-bn="virtualizer"]')) {
    const total = Number(container.querySelector('[data-bn="virtual-window"]')?.dataset.total) || 0;
    const first = container.querySelector('[data-bn="virtual-item"]')?.textContent.trim() ?? 'Row 1';
    initVirtualList(container, {
      items: Array.from({ length: total }, (_, i) => first.replace(/\d+/, String(i + 1))),
    });
  }
}
