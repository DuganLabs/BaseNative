import { signal, effect } from '/basenative.js';

const ready = (fn) =>
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();

ready(() => {
  wireTabs();
  wireDialogs();
  wireDrawer();
  wireDropdowns();
  wireTooltips();
  wireCommandPalette();
  wireAlerts();
  const toaster = wireToasts();
  wireToastDemo(toaster);
  wireToastButtons(toaster);
  wireVirtualList();
  wireCounter();
  wireClock();
});

function wireTabs() {
  for (const tablist of document.querySelectorAll('[data-bn="tabs"]')) {
    const tabs = [...tablist.querySelectorAll('[data-bn="tab"]')];
    const panels = [...tablist.querySelectorAll('[data-bn="tab-panel"]')];

    const activate = (tab) => {
      for (const t of tabs) t.setAttribute('aria-selected', String(t === tab));
      for (const p of panels) p.hidden = p.getAttribute('aria-labelledby') !== tab.id;
    };

    for (const tab of tabs) {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (e) => {
        const i = tabs.indexOf(tab);
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const next = tabs[(i + 1) % tabs.length];
          next.focus();
          activate(next);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = tabs[(i - 1 + tabs.length) % tabs.length];
          prev.focus();
          activate(prev);
        } else if (e.key === 'Home') {
          e.preventDefault();
          tabs[0].focus();
          activate(tabs[0]);
        } else if (e.key === 'End') {
          e.preventDefault();
          tabs[tabs.length - 1].focus();
          activate(tabs[tabs.length - 1]);
        }
      });
    }
  }
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
    const overlay = drawer.previousElementSibling?.matches?.('[data-bn="drawer-overlay"]')
      ? drawer.previousElementSibling
      : document.querySelector(`[data-bn="drawer-overlay"][data-for="${drawer.id}"]`);

    const open = () => {
      drawer.setAttribute('data-open', '');
      overlay?.removeAttribute('hidden');
      drawer.querySelector('[data-bn="drawer-close"], button')?.focus();
    };
    const close = () => {
      drawer.removeAttribute('data-open');
      overlay?.setAttribute('hidden', '');
      trigger.focus();
    };

    trigger.addEventListener('click', open);
    drawer.querySelector('[data-bn="drawer-close"]')?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.hasAttribute('data-open')) close();
    });
  }
}

function wireDropdowns() {
  for (const dropdown of document.querySelectorAll('[data-bn="dropdown"]')) {
    const trigger = dropdown.querySelector('[data-bn="dropdown-trigger"]');
    const menu = dropdown.querySelector('[data-bn="dropdown-menu"]');
    if (!trigger || !menu) continue;

    const supportsPopover = HTMLElement.prototype.hasOwnProperty('popover');
    if (!supportsPopover) {
      trigger.addEventListener('click', () => {
        menu.toggleAttribute('data-open');
      });
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) menu.removeAttribute('data-open');
      });
    }

    for (const item of menu.querySelectorAll('[data-bn="dropdown-item"]')) {
      item.addEventListener('click', () => {
        if (supportsPopover && menu.matches(':popover-open')) menu.hidePopover();
        else menu.removeAttribute('data-open');
      });
    }
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

function wireCommandPalette() {
  for (const trigger of document.querySelectorAll('[data-bn-action="open-command-palette"]')) {
    const palette = document.getElementById(trigger.getAttribute('data-bn-target'));
    if (!palette) continue;
    trigger.addEventListener('click', () => {
      palette.showModal();
      palette.querySelector('[data-bn="command-input"]')?.focus();
    });
  }

  for (const palette of document.querySelectorAll('[data-bn="command-palette"]')) {
    const input = palette.querySelector('[data-bn="command-input"]');
    const items = [...palette.querySelectorAll('[data-bn="command-item"]')];
    const groups = [...palette.querySelectorAll('[data-bn="command-group"]')];

    const filter = (query) => {
      const q = query.trim().toLowerCase();
      for (const item of items) {
        const label =
          item.querySelector('[data-bn="command-label"]')?.textContent.toLowerCase() ?? '';
        item.hidden = q.length > 0 && !label.includes(q);
      }
      for (const group of groups) {
        const visibleItems = group.querySelectorAll('[data-bn="command-item"]:not([hidden])');
        group.hidden = visibleItems.length === 0;
      }
      const firstVisible = items.find((i) => !i.hidden);
      for (const item of items) item.removeAttribute('aria-selected');
      if (firstVisible) firstVisible.setAttribute('aria-selected', 'true');
    };

    input?.addEventListener('input', () => filter(input.value));
    input?.addEventListener('keydown', (e) => {
      const visible = items.filter((i) => !i.hidden);
      const currentIndex = visible.findIndex((i) => i.getAttribute('aria-selected') === 'true');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = visible[(currentIndex + 1) % visible.length];
        for (const item of items) item.removeAttribute('aria-selected');
        next?.setAttribute('aria-selected', 'true');
        next?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = visible[(currentIndex - 1 + visible.length) % visible.length];
        for (const item of items) item.removeAttribute('aria-selected');
        prev?.setAttribute('aria-selected', 'true');
        prev?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        visible[currentIndex >= 0 ? currentIndex : 0]?.click();
      } else if (e.key === 'Escape') {
        palette.close();
      }
    });

    for (const item of items) {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        const label = item.querySelector('[data-bn="command-label"]')?.textContent ?? action;
        palette.close();
        if (input) input.value = '';
        filter('');
        palette.dispatchEvent(
          new CustomEvent('command', { detail: { action, label }, bubbles: true }),
        );
      });
    }

    palette.addEventListener('close', () => {
      if (input) input.value = '';
      filter('');
    });
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

function wireToastDemo(toaster) {
  if (!toaster) return;

  document.addEventListener('command', (e) => {
    const { action, label } = e.detail;
    toaster.push(`Ran command: ${label}`, action === 'delete' ? 'error' : 'success');
  });

  for (const item of document.querySelectorAll('[data-bn="dropdown-item"]')) {
    item.addEventListener('click', () => {
      const label = item.textContent.trim();
      const action = item.dataset.action;
      toaster.push(`${label}`, action === 'delete' ? 'error' : 'info');
    });
  }
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
  const root = document.querySelector('[data-showcase-counter]');
  if (!root) return;

  const count = signal(0);
  const valueEl = root.querySelector('[data-bn-counter-value]');
  const doubledEl = root.querySelector('[data-bn-counter-doubled]');
  const parityEl = root.querySelector('[data-bn-counter-parity]');

  effect(() => {
    const n = count();
    if (valueEl) valueEl.textContent = String(n);
    if (doubledEl) doubledEl.textContent = `doubled: ${n * 2}`;
    if (parityEl) {
      parityEl.textContent = n % 2 === 0 ? 'even' : 'odd';
      parityEl.dataset.parity = n % 2 === 0 ? 'even' : 'odd';
    }
  });

  root
    .querySelector('[data-bn-action="counter-inc"]')
    ?.addEventListener('click', () => count.set((c) => c + 1));
  root
    .querySelector('[data-bn-action="counter-dec"]')
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

function wireVirtualList() {
  for (const v of document.querySelectorAll('[data-bn="virtualizer"]')) {
    const window_ = v.querySelector('[data-bn="virtual-window"]');
    if (!window_) continue;
    const itemHeight = Number(window_.dataset.itemHeight) || 40;
    const total = Number(window_.dataset.total) || 0;
    const overscan = 5;
    const viewportHeight = v.clientHeight;
    const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;

    const items = [...window_.querySelectorAll('[data-bn="virtual-item"]')];
    if (items.length === 0 || total <= items.length) return;

    const allLabels = Array.from(
      { length: total },
      (_, i) => items[i]?.textContent ?? `Item ${i + 1}`,
    );

    const render = () => {
      const scrollTop = v.scrollTop;
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const endIndex = Math.min(total, startIndex + visibleCount);
      window_.style.transform = `translateY(${startIndex * itemHeight}px)`;
      window_.innerHTML = '';
      for (let i = startIndex; i < endIndex; i++) {
        const el = document.createElement('div');
        el.setAttribute('data-bn', 'virtual-item');
        el.setAttribute('data-index', String(i));
        el.textContent = allLabels[i] ?? `Item ${i + 1}`;
        window_.append(el);
      }
    };

    v.addEventListener('scroll', render, { passive: true });
  }
}
