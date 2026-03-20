/**
 * Built-in schema validators for config definitions.
 * These can be used standalone or with Zod via zodAdapter.
 */

export function string(options = {}) {
  return (value) => {
    if (typeof value !== 'string') return { error: `Expected string, got ${typeof value}` };
    if (options.minLength && value.length < options.minLength) {
      return { error: `String must be at least ${options.minLength} characters` };
    }
    if (options.maxLength && value.length > options.maxLength) {
      return { error: `String must be at most ${options.maxLength} characters` };
    }
    return { value };
  };
}

export function number(options = {}) {
  return (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return { error: `Expected number, got "${value}"` };
    if (options.min !== undefined && num < options.min) {
      return { error: `Number must be >= ${options.min}` };
    }
    if (options.max !== undefined && num > options.max) {
      return { error: `Number must be <= ${options.max}` };
    }
    return { value: num };
  };
}

export function boolean() {
  return (value) => {
    if (value === 'true' || value === '1' || value === true) return { value: true };
    if (value === 'false' || value === '0' || value === false) return { value: false };
    return { error: `Expected boolean, got "${value}"` };
  };
}

export function oneOf(allowed) {
  return (value) => {
    if (!allowed.includes(value)) {
      return { error: `Expected one of [${allowed.join(', ')}], got "${value}"` };
    }
    return { value };
  };
}

export function optional(validator, defaultValue) {
  return (value) => {
    if (value === undefined || value === null || value === '') {
      return { value: defaultValue };
    }
    return validator(value);
  };
}

/**
 * Validate a config object against a schema definition.
 * Schema is a map of key -> validator function.
 */
export function validateConfig(values, schema) {
  const result = {};
  const errors = [];

  for (const [key, validator] of Object.entries(schema)) {
    const raw = values[key];
    const validated = validator(raw);
    if (validated.error) {
      errors.push({ key, message: validated.error });
    } else {
      result[key] = validated.value;
    }
  }

  if (errors.length > 0) {
    const message = errors.map(e => `  ${e.key}: ${e.message}`).join('\n');
    throw new Error(`Config validation failed:\n${message}`);
  }

  return result;
}

/**
 * Adapt a Zod schema for use with defineConfig.
 */
export function zodAdapter(zodSchema) {
  return (values) => {
    const parsed = zodSchema.safeParse(values);
    if (parsed.success) return parsed.data;
    const message = parsed.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Config validation failed:\n${message}`);
  };
}
