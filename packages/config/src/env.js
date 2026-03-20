import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Parse a .env file into a key-value object.
 * Supports comments (#), empty lines, quoted values, and inline comments.
 */
export function parseEnvFile(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Handle quoted values
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      // Strip inline comments for unquoted values
      const commentIndex = value.indexOf(' #');
      if (commentIndex !== -1) value = value.slice(0, commentIndex).trim();
    }

    result[key] = value;
  }
  return result;
}

/**
 * Load environment variables from .env files.
 * Does NOT override existing process.env values.
 */
export function loadEnv(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  // Load in order of precedence (later files don't override earlier)
  const files = [
    `.env.${nodeEnv}.local`,
    `.env.${nodeEnv}`,
    '.env.local',
    '.env',
  ];

  const loaded = {};

  for (const file of files) {
    const filePath = resolve(cwd, file);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf-8');
    const parsed = parseEnvFile(content);

    for (const [key, value] of Object.entries(parsed)) {
      // Don't override existing env vars or previously loaded values
      if (process.env[key] === undefined && loaded[key] === undefined) {
        loaded[key] = value;
        process.env[key] = value;
      }
    }
  }

  return loaded;
}
