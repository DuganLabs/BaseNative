/**
 * Keyboard behaviour for the controls that are not native.
 * Native dialog, details, checkbox, radio, and range keep the browser's keys.
 */

function items(root, selector) {
  return [...root.querySelectorAll(selector)].filter((node) => !node.hasAttribute('disabled'));
}

function focusAt(list, index) {
  if (!list.length) return;
  const next = (index + list.length) % list.length;
  list[next].focus();
}

/**
 * Arrow keys move among `[role="menuitem"]`. Escape closes the nearest
 * `[popover]` and returns focus to the control that opened it.
 * @param {KeyboardEvent} event
 * @param {Element} menu
 */
export function handleMenuKeydown(event, menu) {
  const list = items(menu, '[role="menuitem"]');
  const current = list.indexOf(document.activeElement);
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    focusAt(list, current < 0 ? 0 : current + 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    focusAt(list, current < 0 ? list.length - 1 : current - 1);
  } else if (event.key === 'Home') {
    event.preventDefault();
    focusAt(list, 0);
  } else if (event.key === 'End') {
    event.preventDefault();
    focusAt(list, list.length - 1);
  } else if (event.key === 'Escape') {
    const pop = menu.closest('[popover]');
    if (pop && typeof pop.hidePopover === 'function') {
      const opener = menu.ownerDocument.querySelector(`[popovertarget="${pop.id}"]`);
      pop.hidePopover();
      opener?.focus();
    }
  }
}

/**
 * Arrow keys, Home, and End move the checked radio in a segmented control
 * or page control. The group is `role="radiogroup"`.
 * @param {KeyboardEvent} event
 * @param {Element} group
 */
export function handleRadioGroupKeydown(event, group) {
  const horizontal = group.getAttribute('aria-orientation') !== 'vertical';
  const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
  const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
  if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
    return;
  const list = items(group, '[role="radio"]');
  if (!list.length) return;
  const current = Math.max(0, list.indexOf(document.activeElement));
  let index;
  if (event.key === nextKey) index = current + 1;
  else if (event.key === prevKey) index = current - 1;
  else if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = list.length - 1;
  else return;
  event.preventDefault();
  index = (index + list.length) % list.length;
  for (const node of list)
    node.setAttribute('aria-checked', node === list[index] ? 'true' : 'false');
  list[index].focus();
}

/**
 * Arrow keys move focus inside a toolbar.
 * @param {KeyboardEvent} event
 * @param {Element} bar
 */
export function handleToolbarKeydown(event, bar) {
  if (
    event.key !== 'ArrowRight' &&
    event.key !== 'ArrowLeft' &&
    event.key !== 'Home' &&
    event.key !== 'End'
  )
    return;
  const list = items(bar, 'button, a, input');
  const current = list.indexOf(document.activeElement);
  if (current < 0) return;
  event.preventDefault();
  if (event.key === 'Home') focusAt(list, 0);
  else if (event.key === 'End') focusAt(list, list.length - 1);
  else if (event.key === 'ArrowRight') focusAt(list, current + 1);
  else focusAt(list, current - 1);
}

/** Attach the keyboard handlers once. */
export function bindPlatform(root) {
  if (!root || root.dataset.bnPlatformBound === 'true') return;
  root.dataset.bnPlatformBound = 'true';
  root.addEventListener('keydown', (event) => {
    const menu = event.target?.closest?.('[data-bn="bn-menu"], [data-bn="bn-context-menu"]');
    if (menu) {
      handleMenuKeydown(event, menu);
      return;
    }
    const group = event.target?.closest?.('[data-bn="bn-segmented"], [data-bn="bn-page-control"]');
    if (group) {
      handleRadioGroupKeydown(event, group);
      return;
    }
    const bar = event.target?.closest?.('[data-bn="bn-toolbar"], [data-bn="bn-input-accessory"]');
    if (bar) handleToolbarKeydown(event, bar);
  });
}
