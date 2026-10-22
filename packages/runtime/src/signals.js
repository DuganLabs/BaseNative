let currentEffect = null;
let batchDepth = 0;
const pendingComputed = new Set();
const pendingEffects = new Set();
// Effects still waiting in the current pass. A write that would schedule
// one of them is dropped: it runs this pass and sees the settled value.
let wave = null;
const plugins = [];

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

function loopError() {
  const error = new Error('Use .peek() or write a different signal.');
  error.code = 'BN_EFFECT_LOOP';
  return error;
}

function scheduleEffect(effectRef) {
  if (effectRef === currentEffect) throw loopError();
  if (wave && wave.has(effectRef)) return;
  (effectRef.computed ? pendingComputed : pendingEffects).add(effectRef);
}

function runQueued(queue) {
  const effects = [...queue];
  queue.clear();
  wave = new Set(effects);
  for (const effectRef of effects) {
    wave.delete(effectRef);
    effectRef.run();
  }
}

function flushEffects() {
  batchDepth++;
  try {
    for (let passes = 0; pendingComputed.size || pendingEffects.size;) {
      if (++passes > 10000) {
        pendingComputed.clear();
        pendingEffects.clear();
        throw loopError();
      }
      runQueued(pendingComputed.size ? pendingComputed : pendingEffects);
    }
  } finally {
    wave = null;
    batchDepth--;
  }
}

export function batch(fn) {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flushEffects();
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
      const prev = value;
      value = resolved;
      for (const plugin of plugins) {
        if (plugin.onSignalWrite) plugin.onSignalWrite(accessor, prev, value);
      }
      // A plain set() is its own batch. Nested writes only queue.
      batch(() => {
        for (const effectRef of [...subs]) scheduleEffect(effectRef);
      });
    }
  };
  accessor.peek = () => value;
  return accessor;
}

function createEffect(fn, computed) {
  const effectRef = {
    computed,
    cleanup: null,
    disposed: false,
    subscriptions: new Set(),
    run() {
      if (effectRef.disposed) return;
      const previous = currentEffect;
      currentEffect = effectRef;
      try {
        cleanupEffect(effectRef);
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

export function computed(fn) {
  const s = signal(undefined);
  createEffect(() => s.set(fn()), true);
  return s;
}

export function registerPlugin(plugin) {
  plugins.push(plugin);
  return () => {
    const idx = plugins.indexOf(plugin);
    if (idx !== -1) plugins.splice(idx, 1);
  };
}

export function effect(fn) {
  return createEffect(fn, false);
}
