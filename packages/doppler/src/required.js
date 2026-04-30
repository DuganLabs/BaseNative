// ────────────────────────────────────────────────────────────────────────────
//   doppler-required.json validator
//   "A schema is just a promise from yesterday's you to today's you."
// ────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * @typedef {Object} RequiredSecret
 * @property {string}  name
 * @property {string}  [description]
 * @property {boolean} [required]
 */

/**
 * @typedef {Object} RequiredSchema
 * @property {RequiredSecret[]} secrets
 * @property {string[]}         configs
 */

const VALID_CONFIGS = ['dev', 'prep', 'preview', 'staging', 'prod', 'production'];

/**
 * Parse and validate a `doppler-required.json` file from disk.
 *
 * @param {string} filePath  absolute or cwd-relative path
 * @returns {RequiredSchema}
 */
export function loadRequired(filePath) {
  const full = resolve(filePath);
  if (!existsSync(full)) {
    throw new Error(
      `doppler-required.json not found at ${full}. Copy the template from ` +
        '@basenative/doppler/templates/doppler-required.json into your project root.',
    );
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(full, 'utf-8'));
  } catch (err) {
    throw new Error(`doppler-required.json is not valid JSON: ${err.message}`, { cause: err });
  }
  return validateRequired(raw);
}

/**
 * @param {unknown} input
 * @returns {RequiredSchema}
 */
export function validateRequired(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError(['root: must be an object']);
  }
  const obj = /** @type {Record<string, unknown>} */ (input);

  if (!Array.isArray(obj.secrets)) {
    errors.push('secrets: must be an array');
  }
  if (!Array.isArray(obj.configs)) {
    errors.push('configs: must be an array');
  }
  if (errors.length > 0) throw new ValidationError(errors);

  /** @type {RequiredSecret[]} */
  const secrets = [];
  const seen = new Set();
  for (let i = 0; i < obj.secrets.length; i++) {
    const s = obj.secrets[i];
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      errors.push(`secrets[${i}]: must be an object`);
      continue;
    }
    const sec = /** @type {Record<string, unknown>} */ (s);
    if (typeof sec.name !== 'string' || sec.name.length === 0) {
      errors.push(`secrets[${i}].name: must be a non-empty string`);
      continue;
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(sec.name)) {
      errors.push(`secrets[${i}].name (${sec.name}): must be SCREAMING_SNAKE_CASE`);
    }
    if (seen.has(sec.name)) {
      errors.push(`secrets[${i}].name (${sec.name}): duplicate`);
      continue;
    }
    seen.add(sec.name);
    if (sec.description !== undefined && typeof sec.description !== 'string') {
      errors.push(`secrets[${i}].description: must be a string when set`);
    }
    if (sec.required !== undefined && typeof sec.required !== 'boolean') {
      errors.push(`secrets[${i}].required: must be a boolean when set`);
    }
    secrets.push({
      name: sec.name,
      description: typeof sec.description === 'string' ? sec.description : undefined,
      required: typeof sec.required === 'boolean' ? sec.required : true,
    });
  }

  /** @type {string[]} */
  const configs = [];
  const cseen = new Set();
  for (let i = 0; i < obj.configs.length; i++) {
    const c = obj.configs[i];
    if (typeof c !== 'string' || c.length === 0) {
      errors.push(`configs[${i}]: must be a non-empty string`);
      continue;
    }
    if (!VALID_CONFIGS.includes(c)) {
      errors.push(`configs[${i}] (${c}): expected one of ${VALID_CONFIGS.join(', ')}`);
    }
    if (cseen.has(c)) {
      errors.push(`configs[${i}] (${c}): duplicate`);
      continue;
    }
    cseen.add(c);
    configs.push(c);
  }

  if (errors.length > 0) throw new ValidationError(errors);
  return { secrets, configs };
}

export class ValidationError extends Error {
  constructor(errors) {
    super(`doppler-required.json invalid:\n  - ${errors.join('\n  - ')}`);
    this.name = 'ValidationError';
    this.errors = errors;
    this.code = 'E_INVALID_REQUIRED';
  }
}

/**
 * Returns the names of secrets in the schema that are missing from `env`.
 * Optional secrets (required: false) are ignored.
 *
 * @param {RequiredSchema} schema
 * @param {Record<string, string|undefined>} env
 * @returns {string[]}
 */
export function findMissing(schema, env) {
  const missing = [];
  for (const sec of schema.secrets) {
    if (sec.required === false) continue;
    if (!env[sec.name] || env[sec.name] === '') missing.push(sec.name);
  }
  return missing;
}
