let currentEffect = null;

function cleanupEffect(effectRef) {
  for (const subscribers of effectRef.subscriptions) {
    subscribers.delete(effectRef);
  }
  effectRef.subscriptions.clear();

  if (typeof effectRef.cleanup === 'function') {
    const cleanup = effectRef.cleanup;
    effectRef.cleanup = null;
    cleanup();
  }
}

export function signal(initial) {
  let value = initial;
  const subs = new Set();
  const accessor = () => {
    if (currentEffect) {
      subs.add(currentEffect);
      currentEffect.subscriptions.add(subs);
    }
    return value;
  };
  accessor.set = (next) => {
    const resolved = typeof next === 'function' ? next(value) : next;
    if (resolved !== value) {
      value = resolved;
      for (const effectRef of [...subs]) effectRef.run();
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
  const effectRef = {
    cleanup: null,
    disposed: false,
    subscriptions: new Set(),
    run() {
      if (effectRef.disposed) return;
      cleanupEffect(effectRef);

      const previous = currentEffect;
      currentEffect = effectRef;
      try {
        const cleanup = fn();
        effectRef.cleanup = typeof cleanup === 'function' ? cleanup : null;
      } finally {
        currentEffect = previous;
      }
    },
  };

  const execute = () => {
    effectRef.run();
  };

  execute.dispose = () => {
    if (effectRef.disposed) return;
    effectRef.disposed = true;
    cleanupEffect(effectRef);
  };

  execute();
  return execute;
}
