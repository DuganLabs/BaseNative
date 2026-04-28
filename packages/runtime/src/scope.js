import { SCOPE_SLOT } from './shared/expression.js';
import { signal } from './signals.js';

export function createScopeSlot(initial) {
  const state = signal(initial);
  return {
    [SCOPE_SLOT]: true,
    get() {
      return state();
    },
    set(value) {
      state.set(value);
    },
    peek() {
      return state.peek();
    },
  };
}

export function createChildContext(parent, bindings = {}) {
  return Object.assign(Object.create(parent ?? null), bindings);
}

export function createLoopContext(parent, itemName, item, index, length) {
  const slots = {
    [itemName]: createScopeSlot(item),
    $index: createScopeSlot(index),
    $first: createScopeSlot(index === 0),
    $last: createScopeSlot(index === length - 1),
    $even: createScopeSlot(index % 2 === 0),
    $odd: createScopeSlot(index % 2 !== 0),
  };

  return {
    ctx: createChildContext(parent, slots),
    slots,
  };
}

export function updateLoopContext(slots, itemName, item, index, length) {
  slots[itemName].set(item);
  slots.$index.set(index);
  slots.$first.set(index === 0);
  slots.$last.set(index === length - 1);
  slots.$even.set(index % 2 === 0);
  slots.$odd.set(index % 2 !== 0);
}
