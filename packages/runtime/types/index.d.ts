/**
 * Creates a reactive signal with an initial value.
 * Reading the signal in an effect automatically subscribes to updates.
 */
export function signal<T>(initial: T): Signal<T>;

/**
 * Creates a computed signal derived from other signals.
 * Automatically re-evaluates when dependencies change.
 */
export function computed<T>(fn: () => T): Signal<T>;

/**
 * Creates a reactive effect that runs when its signal dependencies change.
 * Returns a dispose function to stop the effect.
 * The callback may return a cleanup function that runs before re-execution.
 */
export function effect(fn: () => void | (() => void)): EffectHandle;

/**
 * Batches signal writes so subscribed effects run once after `fn` returns, instead of once per write.
 */
export function batch<T>(fn: () => T): T;

/**
 * Hydrates a DOM subtree, activating template directives and reactive bindings.
 * Returns a dispose function to clean up all bindings.
 */
export function hydrate(
  root: Element | DocumentFragment,
  ctx: Record<string, unknown>,
  options?: HydrateOptions,
): () => void;

/**
 * Detects and returns current browser feature support.
 */
export function detectBrowserFeatures(): BrowserFeatures;

/**
 * Returns the cached browser features object.
 */
export const browserFeatures: BrowserFeatures;

/**
 * Checks whether a specific browser feature is supported.
 */
export function supportsFeature(feature: keyof BrowserFeatures): boolean;

/**
 * Emits a structured diagnostic event.
 */
export function emitDiagnostic(options: RuntimeOptions, diagnostic: Diagnostic): void;

/**
 * Reports a hydration mismatch through the diagnostics system.
 */
export function reportHydrationMismatch(
  options: RuntimeOptions,
  message: string,
  detail?: Record<string, unknown>,
): void;

// --- Types ---

export interface Signal<T> {
  /** Read the current value. Subscribes the active effect. */
  (): T;
  /** Update the signal value. Accepts a value or updater function. */
  set(next: T | ((prev: T) => T)): void;
  /** Read the value without subscribing. */
  peek(): T;
}

export interface EffectHandle {
  (): void;
  /** Permanently stops the effect and runs cleanup. */
  dispose(): void;
}

export interface HydrateOptions {
  /** Callback for diagnostic events during hydration. */
  onDiagnostic?: (diagnostic: Diagnostic) => void;
  /** Callback for hydration mismatch events. */
  onMismatch?: (message: string, detail?: Record<string, unknown>) => void;
  /** Recovery strategy for hydration mismatches. */
  recover?: 'client' | 'throw';
}

export interface RuntimeOptions extends HydrateOptions {
  onDiagnostic?: (diagnostic: Diagnostic) => void;
}

export interface Diagnostic {
  level: 'error' | 'warn' | 'info';
  domain: string;
  code: string;
  message: string;
  expression?: string;
  [key: string]: unknown;
}

export interface BrowserFeatures {
  dialog: boolean;
  popover: boolean;
  anchorPositioning: boolean;
  baseSelect: boolean;
}

// --- Plugins ---

export interface PluginAPI {
  addDirective(name: string, handler: (el: Element, value: unknown, ctx: Record<string, unknown>) => void): void;
  onBeforeRender(hook: (...args: unknown[]) => void): void;
  onAfterRender(hook: (...args: unknown[]) => void): void;
  onBeforeHydrate(hook: (...args: unknown[]) => void): void;
  onAfterHydrate(hook: (...args: unknown[]) => void): void;
  onError(hook: (error: Error) => void): void;
}

export interface Plugin {
  name: string;
  setup: (api: PluginAPI) => void;
}

export interface PluginRegistry {
  register(plugin: Plugin): void;
  runHook(hookName: string, ...args: unknown[]): void;
  getDirective(name: string): ((el: Element, value: unknown, ctx: Record<string, unknown>) => void) | undefined;
  getPlugins(): Plugin[];
}

export function definePlugin(config: { name: string; setup: (api: PluginAPI) => void }): Plugin;
export function createPluginRegistry(): PluginRegistry;

// --- Directive Registry ---
// The extension point render()/hydrate() actually consult for plugin-contributed
// directives (e.g. @feature from @basenative/flags, @t from @basenative/i18n).
// Distinct from PluginAPI.addDirective above, which is not wired into render()/
// hydrate() dispatch.

export type DirectiveHandler = (
  value: string,
  ctx: Record<string, unknown>,
  options?: RuntimeOptions,
) => unknown;

export interface DirectiveDefinition {
  on: 'template' | 'element';
  server?: DirectiveHandler;
  client?: DirectiveHandler;
}

export function registerDirective(
  name: string,
  config: { on?: 'template' | 'element'; server?: DirectiveHandler; client?: DirectiveHandler },
): void;
export function unregisterDirective(name: string): void;
export function getDirective(name: string): DirectiveDefinition | undefined;
export function listDirectives(): string[];

// --- Lazy Hydration ---

export interface LazyHydrator {
  observe(element: Element, hydrateFn: () => void): void;
  disconnect(): void;
  hydrateNow(element: Element): void;
  getPending(): number;
}

export function createLazyHydrator(options?: { rootMargin?: string; threshold?: number }): LazyHydrator;
export function lazyHydrate(element: Element, hydrateFn: () => void, options?: { rootMargin?: string; threshold?: number }): void;
export function hydrateOnIdle(hydrateFn: () => void): void;
export function hydrateOnInteraction(element: Element, hydrateFn: () => void, events?: string[]): () => void;
export function hydrateOnMedia(hydrateFn: () => void, query: string): () => void;

// --- Web Vitals ---

export interface VitalsMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  inp?: number;
}

export interface VitalsReporter {
  start(): void;
  stop(): void;
  getMetrics(): VitalsMetrics;
}

export function createVitalsReporter(options?: { onReport?: (metric: { name: string; value: number }) => void; threshold?: Partial<VitalsMetrics> }): VitalsReporter;
export function observeLCP(callback: (value: number) => void): (() => void) | null;
export function observeFID(callback: (value: number) => void): (() => void) | null;
export function observeCLS(callback: (value: number) => void): (() => void) | null;
export function observeFCP(callback: (value: number) => void): (() => void) | null;
export function observeTTFB(callback: (value: number) => void): (() => void) | null;
export function observeINP(callback: (value: number) => void): (() => void) | null;

// --- Signal Write Observers ---
// Distinct from the Plugin/PluginRegistry system above: this is a lower-level hook
// notified synchronously on every signal write, independent of the directive/lifecycle
// plugin API.

export interface SignalPlugin {
  /** Called synchronously after any signal's value changes. */
  onSignalWrite?: (signal: Signal<unknown>, previousValue: unknown, nextValue: unknown) => void;
}

/**
 * Registers a signal write observer. Returns a function that unregisters it.
 */
export function registerPlugin(plugin: SignalPlugin): () => void;

// --- Output Escaping ---
// Re-exported from ./shared/escape.js. The other functions in that module
// (isRaw, unwrapRaw, escapeText, escapeAttr, isUrlAttribute, sanitizeUrl,
// findInterpolations) are subpath-only — see @basenative/runtime/shared/escape.

/** Marker produced by `raw()`; exempt from HTML escaping in `{{ }}` interpolation. */
export interface RawHtml {
  readonly value: string;
}

/**
 * Marks `value` as trusted markup, exempt from HTML escaping. Does not exempt the
 * value from the URL-scheme guard on href-style attribute bindings.
 */
export function raw(value: unknown): RawHtml;

// --- Error Boundary ---

export interface ErrorBoundaryOptions {
  /** Called with the caught error. */
  onError?: (error: Error) => void;
  /** Fallback HTML string returned by getFallback(). */
  fallback?: string;
}

export interface ErrorBoundary {
  /** Runs `fn`, returning its result or `null` if it throws. */
  try<T>(fn: () => T): T | null;
  /** Returns the last caught error, or null if none has been caught. */
  getError(): Error | null;
  /** Returns whether an error has been caught. */
  hasError(): boolean;
  /** Returns the configured fallback HTML string, or '' if none was given. */
  getFallback(): string;
  /** Clears the caught error state. */
  reset(): void;
}

/**
 * Creates an error boundary that wraps template rendering, backing the `@catch` directive.
 */
export function createErrorBoundary(options?: ErrorBoundaryOptions): ErrorBoundary;

/**
 * Server-side error boundary for render(): runs `renderFn`, returning its HTML or a fallback comment/string on error.
 */
export function renderWithBoundary(
  renderFn: () => string,
  options?: { onError?: (error: Error) => void; fallback?: string },
): string;

// --- Devtools ---

/**
 * Enables devtools instrumentation and installs `globalThis.__BASENATIVE_DEVTOOLS__`.
 */
export function enableDevtools(): void;

/** Disables devtools and clears all tracked signals, effects, and hydrations. */
export function disableDevtools(): void;

/** Returns whether devtools instrumentation is enabled. */
export function isDevtoolsEnabled(): boolean;

/** Registers a signal for devtools inspection; a no-op unless devtools are enabled. */
export function trackSignal(accessor: Signal<unknown>, label?: string): number | undefined;

/** Registers an effect for devtools inspection; a no-op unless devtools are enabled. */
export function trackEffect(handle: EffectHandle, label?: string): number | undefined;

/** Records a hydration event on the devtools timeline; a no-op unless devtools are enabled. */
export function recordHydration(
  root: Element | null | undefined,
  details?: { directivesProcessed?: number; duration?: number },
): void;

// --- Debug Mode ---

export interface DebugOptions {
  /** Prefix for log messages, e.g. 'HomePage'. */
  label?: string;
  /** Custom logger (default: console). */
  logger?: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
  /** Also log signal reads (very verbose, default: false). */
  trackReads?: boolean;
}

export interface DebugStats {
  signalsCreated: number;
  effectsCreated: number;
  signalWrites: number;
  signalReads: number;
  effectRuns: number;
}

/** Enables debug mode: wraps signal/effect helpers with verbose console logging. */
export function enableDebug(options?: DebugOptions): void;

/** Disables debug mode and resets accumulated stats. */
export function disableDebug(): void;

/** Returns whether debug mode is active. */
export function isDebugEnabled(): boolean;

/** Returns a copy of the accumulated debug statistics. */
export function getDebugStats(): DebugStats;

/** Wraps a signal with debug logging; the returned signal has an identical API. */
export function debugSignal<T>(signal: Signal<T>, name?: string): Signal<T>;

/** Wraps an effect with debug logging that reports execution count and timing. */
export function debugEffect(fn: () => void | (() => void), name?: string): EffectHandle;

/** Runs `fn`, logging its execution time in debug mode; returns `fn`'s result either way. */
export function debugTime<T>(label: string, fn: () => T): T;

/** Asserts a reactive invariant in debug mode; throws if `condition` is false. No-op when debug mode is off. */
export function debugAssert(condition: boolean, message: string): void;

/** Logs a signal's (or plain value's) current value under `name`. No-op when debug mode is off. */
export function debugDeps(value: unknown, name?: string): void;
