import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const THEMES_CONFIG = 'themes.json';

/**
 * createThemeManager(options) - Manages themes from the marketplace
 * @param {object} options
 * @param {object} [options.registry] - Registry client from createRegistry
 * @param {string} options.themesDir - Directory to store themes
 * @returns {object} Theme manager
 */
export function createThemeManager(options = {}) {
  const { registry, themesDir = '.basenative/themes' } = options;

  function configPath() {
    return join(themesDir, THEMES_CONFIG);
  }

  async function readConfig() {
    try {
      const data = await readFile(configPath(), 'utf8');
      return JSON.parse(data);
    } catch {
      return { themes: {}, active: null };
    }
  }

  async function writeConfig(config) {
    await mkdir(themesDir, { recursive: true });
    await writeFile(configPath(), JSON.stringify(config, null, 2), 'utf8');
  }

  /**
   * Install a theme from the marketplace.
   * @param {string} themeName - Theme name
   * @returns {Promise<object>} Installed theme info
   */
  async function install(themeName) {
    let themeData = { name: themeName };

    if (registry) {
      const pkg = await registry.getPackage(themeName);
      themeData = {
        name: themeName,
        version: pkg.version || pkg.latestVersion,
        description: pkg.description,
        author: pkg.author,
      };
    }

    const config = await readConfig();
    config.themes[themeName] = {
      ...themeData,
      installedAt: new Date().toISOString(),
    };
    await writeConfig(config);

    return themeData;
  }

  /**
   * List installed themes.
   * @returns {Promise<object[]>}
   */
  async function list() {
    const config = await readConfig();
    return Object.entries(config.themes).map(([name, info]) => ({
      name,
      active: config.active === name,
      ...info,
    }));
  }

  /**
   * Activate a theme.
   * @param {string} themeName - Theme name
   * @returns {Promise<void>}
   */
  async function activate(themeName) {
    const config = await readConfig();
    if (!config.themes[themeName]) {
      throw new Error(`Theme "${themeName}" is not installed`);
    }
    config.active = themeName;
    await writeConfig(config);
  }

  /**
   * Get the currently active theme.
   * @returns {Promise<object|null>}
   */
  async function getActive() {
    const config = await readConfig();
    if (!config.active || !config.themes[config.active]) {
      return null;
    }
    return { name: config.active, ...config.themes[config.active] };
  }

  /**
   * Remove an installed theme.
   * @param {string} themeName - Theme name
   * @returns {Promise<void>}
   */
  async function remove(themeName) {
    const config = await readConfig();
    if (!config.themes[themeName]) {
      throw new Error(`Theme "${themeName}" is not installed`);
    }
    if (config.active === themeName) {
      config.active = null;
    }
    delete config.themes[themeName];
    await writeConfig(config);
  }

  return { install, list, activate, getActive, remove };
}
