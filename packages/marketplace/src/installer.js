import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const MANIFEST_DIR = '.basenative';
const MANIFEST_FILE = 'marketplace.json';

/**
 * createInstaller(options) - Creates a package installer
 * @param {object} options
 * @param {object} options.registry - Registry client from createRegistry
 * @param {string} options.targetDir - Directory to install packages into
 * @param {string} [options.packageManager='npm'] - Package manager to use (npm, pnpm, yarn)
 * @returns {object} Installer client
 */
export function createInstaller(options = {}) {
  const { registry, targetDir = process.cwd(), packageManager = 'npm' } = options;

  function manifestPath() {
    return join(targetDir, MANIFEST_DIR, MANIFEST_FILE);
  }

  async function readManifest() {
    try {
      const data = await readFile(manifestPath(), 'utf8');
      return JSON.parse(data);
    } catch {
      return { packages: {} };
    }
  }

  async function writeManifest(manifest) {
    const dir = join(targetDir, MANIFEST_DIR);
    await mkdir(dir, { recursive: true });
    await writeFile(manifestPath(), JSON.stringify(manifest, null, 2), 'utf8');
  }

  /**
   * Install a marketplace package.
   * @param {string} packageName - Package name
   * @param {string} [version='latest'] - Version to install
   * @returns {Promise<object>} Installed package info
   */
  async function install(packageName, version = 'latest') {
    let resolvedVersion = version;

    if (registry) {
      const pkg = await registry.getPackage(packageName);
      if (version === 'latest') {
        resolvedVersion = pkg.version || pkg.latestVersion || version;
      }
    }

    const spec = resolvedVersion && resolvedVersion !== 'latest'
      ? `${packageName}@${resolvedVersion}`
      : packageName;

    const args = packageManager === 'yarn'
      ? ['add', spec]
      : ['install', spec];

    await execFileAsync(packageManager, args, { cwd: targetDir });

    const manifest = await readManifest();
    manifest.packages[packageName] = {
      version: resolvedVersion,
      installedAt: new Date().toISOString(),
    };
    await writeManifest(manifest);

    return { name: packageName, version: resolvedVersion };
  }

  /**
   * Uninstall a marketplace package.
   * @param {string} packageName - Package name
   * @returns {Promise<void>}
   */
  async function uninstall(packageName) {
    const args = packageManager === 'yarn'
      ? ['remove', packageName]
      : ['uninstall', packageName];

    await execFileAsync(packageManager, args, { cwd: targetDir });

    const manifest = await readManifest();
    delete manifest.packages[packageName];
    await writeManifest(manifest);
  }

  /**
   * List installed marketplace packages.
   * @returns {Promise<object[]>}
   */
  async function list() {
    const manifest = await readManifest();
    return Object.entries(manifest.packages).map(([name, info]) => ({
      name,
      ...info,
    }));
  }

  /**
   * Update a package to its latest version.
   * @param {string} packageName - Package name
   * @returns {Promise<object>} Updated package info
   */
  async function update(packageName) {
    const manifest = await readManifest();
    if (!manifest.packages[packageName]) {
      throw new Error(`Package "${packageName}" is not installed`);
    }
    return install(packageName, 'latest');
  }

  /**
   * Update all installed marketplace packages.
   * @returns {Promise<object[]>} Updated packages
   */
  async function updateAll() {
    const manifest = await readManifest();
    const names = Object.keys(manifest.packages);
    const results = [];
    for (const name of names) {
      const result = await install(name, 'latest');
      results.push(result);
    }
    return results;
  }

  return { install, uninstall, list, update, updateAll };
}
