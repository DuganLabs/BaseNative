import { signal, computed } from '@basenative/runtime';

/**
 * Creates a reactive form field with value tracking, validation, and state management.
 *
 * @param {*} initial - Initial field value
 * @param {object} [options]
 * @param {Array<Function>} [options.validators] - Array of validator functions
 * @param {Function} [options.transform] - Transform function applied on value change
 * @returns {Field}
 */
export function createField(initial, options = {}) {
  const validators = options.validators || [];
  const transform = options.transform || null;

  const value = signal(initial);
  const touched = signal(false);
  const dirty = signal(false);
  const serverErrors = signal([]);

  const errors = computed(() => {
    const result = [];
    const currentValue = value();

    for (const validator of validators) {
      const error = validator(currentValue);
      if (error) result.push(error);
    }

    // Include server-side errors
    for (const err of serverErrors()) {
      result.push(err);
    }

    return result;
  });

  const valid = computed(() => errors().length === 0);
  const invalid = computed(() => !valid());

  const firstError = computed(() => {
    const errs = errors();
    return errs.length > 0 ? errs[0] : null;
  });

  function setValue(next) {
    const resolved = typeof next === 'function' ? next(value()) : next;
    const final = transform ? transform(resolved) : resolved;
    value.set(final);
    dirty.set(true);
    // Clear server errors on local change
    if (serverErrors().length > 0) {
      serverErrors.set([]);
    }
  }

  function touch() {
    touched.set(true);
  }

  function reset(resetValue) {
    value.set(resetValue !== undefined ? resetValue : initial);
    touched.set(false);
    dirty.set(false);
    serverErrors.set([]);
  }

  function setServerErrors(errs) {
    serverErrors.set(Array.isArray(errs) ? errs : [errs]);
  }

  return {
    value,
    touched,
    dirty,
    errors,
    valid,
    invalid,
    firstError,
    setValue,
    touch,
    reset,
    setServerErrors,
  };
}
