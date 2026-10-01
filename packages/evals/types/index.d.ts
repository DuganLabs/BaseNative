import type { Diagnostic, ValidateOptions, ValidationResult } from '@basenative/validate';

export type Tier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5';

/** The tier names, in order: single directive, composite, stateful, full component, adversarial. */
export const TIERS: Tier[];

/**
 * One hand-authored assertion. `type` selects a runner from `ASSERTION_TYPES`;
 * the remaining fields depend on the type (`value`, `flags`, `count`, `signal`, `then`).
 */
export interface Assertion {
  type: string;
  value?: unknown;
  /** `renders_matches`: regular expression flags. */
  flags?: string;
  /** `renders_count`: expected number of occurrences. */
  count?: number;
  /** `after_set`: name of the signal in the case's `state` to set. */
  signal?: string;
  /** `after_set`: assertion to re-check after the signal is set. */
  then?: Assertion;
  [key: string]: unknown;
}

/** A prompt case, as read from a JSON file in the corpus. */
export interface TestCase {
  id: string;
  tier: Tier;
  prompt: string;
  /** Context the template renders with. */
  context?: Record<string, unknown>;
  /** Initial values, each wrapped in a signal for the hydrate stage. */
  state?: Record<string, unknown>;
  assertions: Assertion[];
  [key: string]: unknown;
}

/** Read and validate one case file. Throws if a required field is missing or the tier is unknown. */
export function loadCase(path: string): TestCase;

/** Load every `.json` case under `dir`, sorted by id. Throws if the directory is missing or empty, or an id repeats. */
export function loadCorpus(dir: string): TestCase[];

/** Number of cases per tier. */
export function tierCoverage(cases: ReadonlyArray<Pick<TestCase, 'tier'>>): Record<Tier, number>;

export interface AssertionResult {
  pass: boolean;
  detail: string;
}

/** The hydrated state an `after_set` assertion works against. */
export interface AssertionExtra {
  template?: string;
  ctx?: Record<string, unknown>;
  root?: { innerHTML: string };
}

export const ASSERTION_TYPES: {
  renders_contains(html: string, assertion: Assertion): AssertionResult;
  renders_excludes(html: string, assertion: Assertion): AssertionResult;
  renders_matches(html: string, assertion: Assertion): AssertionResult;
  renders_equals(html: string, assertion: Assertion): AssertionResult;
  uses_directive(html: string, assertion: Assertion, extra: { template: string }): AssertionResult;
  renders_count(html: string, assertion: Assertion): AssertionResult;
  hydrated_contains(dom: string, assertion: Assertion): AssertionResult;
  hydrated_excludes(dom: string, assertion: Assertion): AssertionResult;
  after_set(dom: string, assertion: Assertion, extra?: AssertionExtra): AssertionResult;
};

export type ValidateFn = (template: string, options?: ValidateOptions) => ValidationResult;
export type RenderFn = (html: string, ctx?: Record<string, unknown>) => string;

export interface HydrateResult {
  /** The mounted root; `innerHTML` is what hydrated assertions read. */
  root: { innerHTML: string };
  /** The case's `state`, each value wrapped in a signal. */
  ctx: Record<string, unknown>;
}

export type HydrateFn = (template: string, state: Record<string, unknown>) => HydrateResult;

export type FailureStage = 'validate' | 'render' | 'hydrate' | 'assertions';

export interface AssertionOutcome extends Assertion {
  pass: boolean;
  detail: string;
}

export interface ScoreResult {
  parses: boolean;
  renders: boolean;
  hydrates: boolean;
  assertions: AssertionOutcome[];
  diagnostics: Diagnostic[];
  /** Rendered HTML, present once the render stage succeeded. */
  html?: string;
  passed: boolean;
  /** The first stage that failed, or `null` when every stage passed. */
  failedAt: FailureStage | null;
  /** Message from a thrown render or hydrate error. */
  error?: string;
}

export interface ScoreOptions {
  template: string;
  testCase: TestCase;
  validate: ValidateFn;
  render: RenderFn;
  /** Required only for cases that declare `state` or a hydrate-family assertion. */
  hydrate?: HydrateFn;
}

/**
 * Score one generated template against a case. Stages run in order (validate,
 * render, optional hydrate, assertions) and an earlier failure short-circuits the rest.
 */
export function scoreTemplate(options: ScoreOptions): ScoreResult;

export type ProviderId = 'anthropic' | 'openai' | 'google' | 'openaiCompatible' | 'ollama';

export interface GenerateOptions {
  model: string;
  apiKey?: string;
  maxTokens?: number;
  baseUrl?: string;
}

export interface Provider {
  id: ProviderId;
  label: string;
  /** Name of the environment variable holding the API key, or `null` when no key is needed. */
  env: string | null;
  generate(prompt: string, options: GenerateOptions): Promise<string>;
}

export const PROVIDERS: Record<ProviderId, Provider>;

/** A model requested by the caller, e.g. `{ provider: 'ollama', model: 'llama3.2' }`. */
export interface ModelSpec {
  provider: string;
  model: string;
  id?: string;
  baseUrl?: string;
}

/** A `ModelSpec` with its provider looked up and its API key attached. */
export interface ResolvedModel extends Omit<ModelSpec, 'provider'> {
  provider: Provider;
  apiKey?: string;
}

/**
 * Resolve credentials for the requested models. Throws, naming every provider
 * whose key is absent, rather than narrowing the run.
 */
export function resolveCredentials(
  models: ModelSpec[],
  env?: Record<string, string | undefined>,
): ResolvedModel[];

/** Strip a Markdown code fence from model output, then trim. */
export function extractTemplate(text: string): string;

/** The prompt sent for one case. `withMcp` adds a sentence naming the MCP tools. */
export function buildPrompt(
  testCase: Pick<TestCase, 'prompt' | 'context'>,
  options: { withMcp: boolean },
): string;

export interface CaseResult extends Partial<Omit<ScoreResult, 'passed' | 'failedAt'>> {
  id: string;
  tier: Tier;
  /** The extracted template, absent when generation failed. */
  template?: string;
  passed: boolean;
  failedAt: FailureStage | 'generate' | null;
  error?: string;
}

export interface Summary {
  total: number;
  passed: number;
  passRate: number;
  byTier: Partial<Record<Tier, { total: number; passed: number }>>;
  byStage: Record<string, number>;
  /** Cases that produced a `BN_E_FOREIGN_DIRECTIVE` diagnostic. */
  driftCount: number;
  driftRate: number;
}

/** Aggregate pass rates overall, per tier, and per failure stage. */
export function summarise(results: CaseResult[]): Summary;

export interface RunModelOptions<M extends { id?: string; model: string } = ResolvedModel> {
  model: M;
  cases: TestCase[];
  withMcp: boolean;
  generate: (prompt: string, model: M) => Promise<string>;
  /** Defaults to `render` from `@basenative/server`. */
  render?: RenderFn;
  /** Defaults to a happy-dom backed hydrate stage. */
  hydrate?: HydrateFn;
  /** Defaults to 4. */
  concurrency?: number;
}

export interface ModelRun {
  model: string;
  withMcp: boolean;
  results: CaseResult[];
  summary: Summary;
}

/** Run the corpus against one model under one condition. */
export function runModel<M extends { id?: string; model: string } = ResolvedModel>(
  options: RunModelOptions<M>,
): Promise<ModelRun>;

export interface Delta {
  model: string;
  without: number;
  with: number;
  lift: number;
  driftWithout: number;
  driftWith: number;
}

/** Pass-rate lift from enabling the MCP validation loop, per model that ran both conditions. */
export function computeDeltas(runs: ModelRun[]): Delta[];

export interface Suite {
  coverage: Record<Tier, number>;
  runs: ModelRun[];
  deltas: Delta[];
}

export interface RunSuiteOptions {
  cases: TestCase[];
  models: ModelSpec[];
  /** Defaults to each model's provider `generate`. When given, credentials are not resolved. */
  generate?: (prompt: string, model: ModelSpec) => Promise<string>;
  render?: RenderFn;
  hydrate?: HydrateFn;
  /** Environment used to look up API keys. Defaults to `process.env`. */
  env?: Record<string, string | undefined>;
  /** MCP conditions to run; defaults to `[false, true]`. */
  conditions?: boolean[];
}

/** Run every model under every condition. */
export function runSuite(options: RunSuiteOptions): Promise<Suite>;

/** Render a suite result as a Markdown leaderboard. */
export function toMarkdown(suite: Suite): string;
