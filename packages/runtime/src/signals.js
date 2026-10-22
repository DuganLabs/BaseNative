let currentEffect = null;
let batchDepth = 0;
const pendingEffects = new Set();
// Effects queued for the current flush pass that have not run yet. A write
// that would schedule one of them is dropped: it already runs this pass,
// after derived computeds, and sees the settled value.
let wave = null;
const plugins = [];
const MAX_FLUSH_PASSES = 10000;

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
  const error = new Error(
    'BaseNative: this effect wrote a signal it also read, so it would re-run forever. Read it with .peek() — that does not subscribe — or write a different signal.'
  );
  error.code = 'BN_EFFECT_LOOP';
  return error;
}

function scheduleEffect(effectRef) {
  if (effectRef.running) throw loopError();
  if (wave && wave.has(effectRef)) return;
  pendingEffects.add(effectRef);
}

function flushEffects() {
  batchDepth++;
  try {
    let passes = 0;
    while (pendingEffects.size > 0) {
      if (++passes > MAX_FLUSH_PASSES) {
        pendingEffects.clear();
        throw loopError();
      }
      const effects = [...pendingEffects];
      pendingEffects.clear();
      const computeds = [];
      const users = [];
      for (const effectRef of effects) {
        (effectRef.computed ? computeds : users).push(effectRef);
      }
      wave = new Set(effects);
      for (const effectRef of computeds) {
        wave.delete(effectRef);
        effectRef.run();
      }
      let moreComputed = false;
      for (const effectRef of pendingEffects) {
        if (effectRef.computed) {
          moreComputed = true;
          break;
        }
      }
      if (moreComputed) {
        for (const effectRef of users) pendingEffects.add(effectRef);
        wave = null;
        continue;
      }
      wave = new Set(users);
      for (const effectRef of users) {
        wave.delete(effectRef);
        effectRef.run();
      }
      wave = null;
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
      const notify = () => {
        for (const effectRef of [...subs]) scheduleEffect(effectRef);
      };
      // A plain set() is its own batch: every subscriber is queued, derived
      // computeds settle, then each effect runs once. batch() already holds
      // batchDepth, so nested writes only queue.
      if (batchDepth > 0) {
        notify();
      } else {
        batchDepth++;
        try {
          notify();
        } finally {
          batchDepth--;
          if (batchDepth === 0) flushEffects();
        }
      }
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
    running: false,
    subscriptions: new Set(),
    run() {
      if (effectRef.disposed) return;
      effectRef.running = true;
      try {
        cleanupEffect(effectRef);

        const previous = currentEffect;
        currentEffect = effectRef;
        try {
          const cleanup = fn();
          effectRef.cleanup = typeof cleanup === 'function' ? cleanup : null;
        } finally {
          currentEffect = previous;
        }
      } finally {
        effectRef.running = false;
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
