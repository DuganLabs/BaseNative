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
