/**
 * Deterministic ids. Pass an explicit `id`, or call `resetIds()` at the
 * start of each server render so hydration can match.
 */
let counter = 0;

export function nextId(prefix) {
  counter += 1;
  return `bn-${prefix}-${counter}`;
}

export function resetIds() {
  counter = 0;
}
