import { readFile, readdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

/**
 * Load messages for a specific locale from a JSON file.
 *
 * @param {string} locale - Locale identifier (e.g. "en", "fr")
 * @param {string} dirPath - Path to the directory containing JSON files
 * @returns {Promise<Record<string, string>>} Message key-value pairs
 */
export async function loadMessages(locale, dirPath) {
  const filePath = join(dirPath, `${locale}.json`);
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Create a loader that can load translation bundles from a directory.
 *
 * Expects JSON files named by locale, e.g. en.json, fr.json, de.json.
 *
 * @param {object} options
 * @param {string} options.directory - Path to the translations directory
 * @param {object} [options.i18n] - Optional i18n instance to auto-add messages
 * @returns {object} loader with load(locale) and loadAll() methods
 */
export function createLoader(options = {}) {
  const { directory, i18n } = options;

  if (!directory) {
    throw new Error('createLoader requires a "directory" option');
  }

  async function load(locale) {
    const msgs = await loadMessages(locale, directory);
    if (i18n) {
      i18n.addMessages(locale, msgs);
    }
    return msgs;
  }

  async function loadAll() {
    const files = await readdir(directory);
    const loaded = {};
    for (const file of files) {
      if (extname(file) === '.json') {
        const locale = basename(file, '.json');
        loaded[locale] = await load(locale);
      }
    }
    return loaded;
  }

  return { load, loadAll };
}
