// Showcase page interactivity.
// Uses data-bn-action delegation so the SSR HTML stays declarative
// and the BaseNative no-inline-handlers axiom is preserved.

import { signal, effect } from '/basenative.js';

// -------- Action delegation --------

const actions = {
  'open-dialog': (target) => {
    const id = target?.dataset.bnTarget;
    const dialog = id && document.getElementById(id);
    dialog?.showModal?.();
  },

  'close-dialog': (target) => {
    target.closest('[data-bn="dialog"], [data-bn="command-palette"]')?.close?.();
  },

  'open-drawer': (target) => {
    const id = target?.dataset.bnTarget;
    const drawer = id && document.getElementById(id);
    if (!drawer) return;
    drawer.setAttribute('data-open', '');
    const overlay = drawer.previousElementSibling;
    if (overlay?.matches('[data-bn="drawer-overlay"]')) overlay.removeAttribute('hidden');
  },

  'close-drawer': (target) => {
    const drawer = target.closest('[data-bn="drawer"]')
      ?? document.querySelector('[data-bn="drawer"][data-open]');
    if (!drawer) return;
    drawer.removeAttribute('data-open');
    const overlay = drawer.previousElementSibling;
    if (overlay?.matches('[data-bn="drawer-overlay"]')) overlay.setAttribute('hidden', '');
  },

  'dismiss-alert': (target) => {
    target.closest('[data-bn="alert"]')?.remove();
  },

  'remove-tag': (target) => {
    const tag = target.closest('[data-bn="tag"]');
    if (!tag) return;
    const value = tag.dataset.value;
    const root = tag.closest('[data-bn="multiselect"]');
    const select = root?.querySelector('select');
    if (select) {
      const option = select.querySelector(`option[value="${CSS.escape(value)}"]`);
      if (option) option.selected = false;
    }
    tag.remove();
  },

  'open-command-palette': (target) => {
    const id = target?.dataset.bnTarget;
    const palette = id && document.getElementById(id);
    palette?.showModal?.();
    palette?.querySelector('[data-bn="command-input"]')?.focus();
  },

  'run-command': (target) => {
    const palette = target.closest('[data-bn="command-palette"]');
    palette?.close?.();
  },
};

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-bn-action]');
  if (!trigger) return;
  const action = actions[trigger.dataset.bnAction];
  if (!action) return;
  action(trigger, event);
});

// Drawer: clicking the overlay closes the drawer
document.addEventListener('click', (event) => {
  const overlay = event.target.closest('[data-bn="drawer-overlay"]');
  if (!overlay || overlay.hasAttribute('hidden')) return;
  const drawer = overlay.nextElementSibling;
  if (drawer?.matches('[data-bn="drawer"]')) {
    drawer.removeAttribute('data-open');
    overlay.setAttribute('hidden', '');
  }
});

// -------- Tabs (existing behaviour) --------

document.querySelectorAll('[data-bn="tab"]').forEach((tab) => {
  tab.addEventListener('click', () => {
    const tabs = tab.closest('[data-bn="tabs"]');
    if (!tabs) return;
    tabs.querySelectorAll('[data-bn="tab"]').forEach((t) => t.setAttribute('aria-selected', 'false'));
    tabs.querySelectorAll('[data-bn="tab-panel"]').forEach((p) => (p.hidden = true));
    tab.setAttribute('aria-selected', 'true');
    const panel = tabs.querySelector('#' + tab.getAttribute('aria-controls'));
    if (panel) panel.hidden = false;
  });
});

// -------- Dropdown menu --------
//
// `popovertarget` toggles popover visibility natively, but the popover
// renders in the top-layer with `position: fixed; inset: 0` by default,
// landing in the top-left. We anchor it to the trigger's bounding rect
// via CSS custom properties; positioning rules live in components.css.

function positionDropdown(trigger, menu) {
  const rect = trigger.getBoundingClientRect();
  menu.style.setProperty('--bn-dropdown-top', `${rect.bottom + 4}px`);
  menu.style.setProperty('--bn-dropdown-left', `${rect.left}px`);
}

document.querySelectorAll('[data-bn="dropdown-trigger"]').forEach((trigger) => {
  const id = trigger.getAttribute('popovertarget');
  const menu = id && document.getElementById(id);
  if (!menu) return;
  trigger.addEventListener('click', () => {
    positionDropdown(trigger, menu);
  });
  // If popover API is not supported, fall back to manual toggle
  if (typeof menu.showPopover !== 'function') {
    trigger.removeAttribute('popovertarget');
    trigger.addEventListener('click', () => {
      const open = menu.hasAttribute('data-open');
      if (open) menu.removeAttribute('data-open');
      else menu.setAttribute('data-open', '');
      positionDropdown(trigger, menu);
    });
  }
});

// -------- Tooltip --------
//
// `popover` on the tooltip span gives us top-layer rendering, but no
// hover wiring. Show on mouseenter/focus, hide on the inverse.

document.querySelectorAll('[data-bn="tooltip-trigger"]').forEach((trigger) => {
  const id = trigger.getAttribute('popovertarget');
  const tip = id && document.getElementById(id);
  if (!tip) return;

  function position() {
    const rect = trigger.getBoundingClientRect();
    tip.style.setProperty('--bn-tooltip-top', `${rect.top - 8}px`);
    tip.style.setProperty('--bn-tooltip-left', `${rect.left + rect.width / 2}px`);
  }
  function show() {
    position();
    tip.showPopover?.();
  }
  function hide() {
    tip.hidePopover?.();
  }

  trigger.addEventListener('mouseenter', show);
  trigger.addEventListener('mouseleave', hide);
  trigger.addEventListener('focus', show);
  trigger.addEventListener('blur', hide);
});

// -------- Toast demo (kept from original showcase) --------

const toastCount = signal(0);
effect(() => {
  // Reading keeps the signal alive; toast UI can subscribe later.
  void toastCount();
});
