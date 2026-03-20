/**
 * Plugin system for BaseNative runtime.
 */

const VALID_HOOKS = [
  'beforeRender',
  'afterRender',
  'beforeHydrate',
  'afterHydrate',
  'error',
];

/**
 * Define a plugin with a name and setup function.
 * @param {{ name: string, setup: (api: object) => void }} config
 * @returns {{ name: string, setup: (api: object) => void }}
 */
export function definePlugin(config) {
  if (!config || typeof config.name !== 'string' || config.name === '') {
    throw new Error('Plugin must have a non-empty "name" string.');
  }
  return {
    name: config.name,
    setup: typeof config.setup === 'function' ? config.setup : () => {},
  };
}

/**
 * Create a plugin registry that manages plugin registration,
 * lifecycle hooks, and custom directives.
 * @returns {{ register: Function, runHook: Function, getDirective: Function, getPlugins: Function }}
 */
export function createPluginRegistry() {
  /** @type {Map<string, object>} */
  const plugins = new Map();

  /** @type {Map<string, Function[]>} */
  const hooks = new Map();

  /** @type {Map<string, Function>} */
  const directives = new Map();

  function addDirective(name, handler) {
    if (typeof name !== 'string' || name === '') {
      throw new Error('Directive name must be a non-empty string.');
    }
    if (typeof handler !== 'function') {
      throw new Error(`Directive handler for "${name}" must be a function.`);
    }
    directives.set(name, handler);
  }

  function addHook(hookName, fn) {
    if (!VALID_HOOKS.includes(hookName)) {
      throw new Error(
        `Unknown hook "${hookName}". Valid hooks: ${VALID_HOOKS.join(', ')}`,
      );
    }
    if (typeof fn !== 'function') {
      throw new Error(`Hook "${hookName}" handler must be a function.`);
    }
    if (!hooks.has(hookName)) {
      hooks.set(hookName, []);
    }
    hooks.get(hookName).push(fn);
  }

  /**
   * Register a plugin. Its setup function is invoked immediately.
   * @param {object} plugin - A plugin created via definePlugin.
   */
  function register(plugin) {
    if (!plugin || typeof plugin.name !== 'string') {
      throw new Error('Invalid plugin: must have a "name" property.');
    }
    if (plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered.`);
    }

    plugins.set(plugin.name, plugin);

    const api = {
      addDirective,
      onBeforeRender: (fn) => addHook('beforeRender', fn),
      onAfterRender: (fn) => addHook('afterRender', fn),
      onBeforeHydrate: (fn) => addHook('beforeHydrate', fn),
      onAfterHydrate: (fn) => addHook('afterHydrate', fn),
      onError: (fn) => addHook('error', fn),
    };

    plugin.setup(api);
  }

  /**
   * Run all registered hooks for a given lifecycle event.
   * @param {string} hookName
   * @param {...*} args
   */
  function runHook(hookName, ...args) {
    const fns = hooks.get(hookName);
    if (!fns) return;
    for (const fn of fns) {
      fn(...args);
    }
  }

  /**
   * Get a registered custom directive handler by name.
   * @param {string} name
   * @returns {Function|undefined}
   */
  function getDirective(name) {
    return directives.get(name);
  }

  /**
   * List all registered plugins.
   * @returns {string[]}
   */
  function getPlugins() {
    return [...plugins.keys()];
  }

  return { register, runHook, getDirective, getPlugins };
}
