import { computed } from '@basenative/runtime';

/**
 * Creates a form instance that groups multiple fields.
 *
 * @param {Record<string, Field>} fields - Named field instances
 * @param {object} [options]
 * @param {Function} [options.onSubmit] - Submit handler, receives form values
 * @param {Function} [options.schema] - Schema validation function (e.g., Zod adapter)
 * @returns {Form}
 */
export function createForm(fields, options = {}) {
  const fieldEntries = Object.entries(fields);

  const values = computed(() => {
    const result = {};
    for (const [name, field] of fieldEntries) {
      result[name] = field.value();
    }
    return result;
  });

  const errors = computed(() => {
    const result = {};
    let schemaErrors = {};

    // Run schema validation if provided
    if (options.schema) {
      schemaErrors = options.schema(values()) || {};
    }

    for (const [name, field] of fieldEntries) {
      const fieldErrors = field.errors();
      const schemaFieldErrors = schemaErrors[name] || [];
      const combined = [...fieldErrors, ...(Array.isArray(schemaFieldErrors) ? schemaFieldErrors : [schemaFieldErrors])];
      if (combined.length > 0) {
        result[name] = combined;
      }
    }
    return result;
  });

  const valid = computed(() => Object.keys(errors()).length === 0);
  const invalid = computed(() => !valid());

  const dirty = computed(() => fieldEntries.some(([_, field]) => field.dirty()));
  const touched = computed(() => fieldEntries.some(([_, field]) => field.touched()));

  function touchAll() {
    for (const [_, field] of fieldEntries) {
      field.touch();
    }
  }

  function reset() {
    for (const [_, field] of fieldEntries) {
      field.reset();
    }
  }

  function getValues() {
    return values();
  }

  async function submit() {
    touchAll();

    if (!valid()) {
      return { ok: false, errors: errors() };
    }

    if (options.onSubmit) {
      try {
        const result = await options.onSubmit(values());
        return { ok: true, data: result };
      } catch (error) {
        return { ok: false, error };
      }
    }

    return { ok: true, data: values() };
  }

  function setServerErrors(errorMap) {
    for (const [name, errs] of Object.entries(errorMap)) {
      if (fields[name]) {
        fields[name].setServerErrors(errs);
      }
    }
  }

  return {
    fields,
    values,
    errors,
    valid,
    invalid,
    dirty,
    touched,
    touchAll,
    reset,
    getValues,
    submit,
    setServerErrors,
  };
}

/**
 * Creates a schema adapter for Zod-like validation libraries.
 * Returns a function compatible with createForm's schema option.
 */
export function zodAdapter(schema) {
  return (values) => {
    const result = schema.safeParse(values);
    if (result.success) return {};

    const errors = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push({ code: issue.code, message: issue.message });
    }
    return errors;
  };
}
