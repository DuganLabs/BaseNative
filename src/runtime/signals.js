let currentEffect = null;

export function signal(initial) {
  let value = initial;
  const subs = new Set();
  const accessor = () => {
    if (currentEffect) subs.add(currentEffect);
    return value;
  };
  accessor.set = (next) => {
    const resolved = typeof next === 'function' ? next(value) : next;
    if (resolved !== value) {
      value = resolved;
      for (const fn of [...subs]) fn();
    }
  };
  accessor.peek = () => value;
  return accessor;
}

export function computed(fn) {
  const s = signal(undefined);
  effect(() => s.set(fn()));
  return s;
}

export function effect(fn) {
  const execute = () => {
    currentEffect = execute;
    try { fn(); } finally { currentEffect = null; }
  };
  execute();
  return execute;
}
