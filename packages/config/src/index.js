export { loadEnv, parseEnvFile } from './env.js';
export { string, number, boolean, oneOf, optional, validateConfig, zodAdapter } from './schema.js';
import { validateConfig } from './schema.js';

/**
 * Define and load a type-safe configuration.
 *
 * @param {object} options
 * @param {object} options.schema - Schema definition (key -> validator) or Zod adapter function
 * @param {object} [options.env] - Source of env vars (defaults to process.env)
 * @param {string} [options.prefix] - Optional env var prefix (e.g. 'APP_')
 * @returns {object} Validated configuration object
 */
export function defineConfig(options) {
  const { schema, env = process.env, prefix = '' } = options;

  // If schema is a function (e.g. zodAdapter), call it directly with extracted values
  if (typeof schema === 'function') {
    const values = prefix ? extractPrefixed(env, prefix) : { ...env };
    return schema(values);
  }

  // Otherwise treat as key -> validator map
  const values = {};
  for (const key of Object.keys(schema)) {
    const envKey = prefix ? `${prefix}${key.toUpperCase()}` : key;
    values[key] = env[envKey];
  }

  return validateConfig(values, schema);
}

function extractPrefixed(env, prefix) {
  const result = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith(prefix)) {
      result[key.slice(prefix.length).toLowerCase()] = value;
    }
  }
  return result;
}
