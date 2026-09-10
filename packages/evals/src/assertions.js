/**
 * Assertion runners.
 *
 * The assertion *types* are infrastructure and live here. The assertion *values* —
 * what a correct answer looks like for a given prompt — are hand-authored in the
 * corpus and must never be generated.
 *
 * `renders_*` check the SSR output string. `hydrated_*` and `after_set` check a
 * *live* DOM produced by the hydrate stage (see hydrate.js) — the only way to score
 * a stateful (T3) case, because SSR evaluates every `{{ }}` to a static value and
 * strips every `@`-prefixed directive from its output (see @basenative/server's
 * render.js), so a rendered-HTML string can never exercise a signal, computed, or
 * effect.
 */
export const HYDRATE_ASSERTION_TYPES = new Set(['hydrated_contains', 'hydrated_excludes', 'after_set']);

export const ASSERTION_TYPES = {
  /** Rendered HTML contains this substring. */
  renders_contains: (html, a) => ({
    pass: html.includes(a.value),
    detail: `expected rendered HTML to contain ${JSON.stringify(a.value)}`,
  }),

  /** Rendered HTML does NOT contain this substring. */
  renders_excludes: (html, a) => ({
    pass: !html.includes(a.value),
    detail: `expected rendered HTML NOT to contain ${JSON.stringify(a.value)}`,
  }),

  /** Rendered HTML matches this regular expression. */
  renders_matches: (html, a) => ({
    pass: new RegExp(a.value, a.flags ?? '').test(html),
    detail: `expected rendered HTML to match /${a.value}/${a.flags ?? ''}`,
  }),

  /** Rendered HTML equals this exactly, after collapsing whitespace. */
  renders_equals: (html, a) => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    return {
      pass: norm(html) === norm(a.value),
      detail: `expected rendered HTML to equal ${JSON.stringify(a.value)}`,
    };
  },

  /** The generated template uses this directive. */
  uses_directive: (html, a, { template }) => ({
    pass: new RegExp(`@${a.value.replace(/^@/, '')}\\b`).test(template),
    detail: `expected the template to use @${a.value.replace(/^@/, '')}`,
  }),

  /** Number of occurrences of a substring in the rendered HTML. */
  renders_count: (html, a) => {
    const n = html.split(a.value).length - 1;
    return { pass: n === a.count, detail: `expected ${a.count} occurrence(s) of ${JSON.stringify(a.value)}, got ${n}` };
  },

  /** The hydrated DOM contains this substring right after hydrate() runs. */
  hydrated_contains: (dom, a) => ({
    pass: dom.includes(a.value),
    detail: `expected the hydrated DOM to contain ${JSON.stringify(a.value)}`,
  }),

  /** The hydrated DOM does NOT contain this substring right after hydrate() runs. */
  hydrated_excludes: (dom, a) => ({
    pass: !dom.includes(a.value),
    detail: `expected the hydrated DOM NOT to contain ${JSON.stringify(a.value)}`,
  }),

  /**
   * Set a live signal from the case's `state`, then re-check a nested assertion
   * (`then` — typically `hydrated_contains`/`hydrated_excludes`, but any registered
   * type works) against the DOM that results. This is the only way to score
   * reactivity itself rather than just a template's initial hydrated shape.
   */
  after_set: (_dom, a, extra) => {
    const { ctx, root } = extra ?? {};
    if (!ctx || !root) {
      return { pass: false, detail: 'after_set requires a hydrated context — add "state" to the case' };
    }
    const target = ctx[a.signal];
    if (typeof target?.set !== 'function') {
      return { pass: false, detail: `after_set: no signal named "${a.signal}" in the hydration context` };
    }

    target.set(a.value);

    const thenRunner = ASSERTION_TYPES[a.then?.type];
    if (!thenRunner) {
      return { pass: false, detail: `after_set: unknown "then" assertion type ${JSON.stringify(a.then?.type)}` };
    }
    const { pass, detail } = thenRunner(root.innerHTML, a.then, extra);
    return { pass, detail: `after setting ${a.signal} = ${JSON.stringify(a.value)}: ${detail}` };
  },
};

/** True when a case's own declarations require the hydrate stage to run. */
function needsHydration(testCase) {
  return Boolean(testCase.state) || testCase.assertions.some((a) => HYDRATE_ASSERTION_TYPES.has(a.type));
}

/**
 * Score one generated template against a hand-authored case.
 *
 * The pipeline is staged, and an earlier stage failing short-circuits the rest:
 * a template that does not parse cannot be meaningfully rendered, and a template
 * that does not render cannot satisfy a behavioural assertion. Hydration is the one
 * optional stage — it only runs when the case declares `state` or a hydrate-family
 * assertion, since most cases (T1/T2/T4/T5) are fully scored by SSR output alone.
 *
 * `hydrate`, like `render`, is injected so tests can drive the pipeline without a
 * real DOM; in production it defaults to mounting the DOM shim in hydrate.js.
 */
export function scoreTemplate({ template, testCase, validate, render, hydrate }) {
  const stages = { parses: false, renders: false, hydrates: false, assertions: [] };

  const validation = validate(template, testCase.context ? { context: testCase.context } : undefined);
  stages.diagnostics = validation.diagnostics;
  stages.parses = validation.valid;
  if (!stages.parses) {
    return { ...stages, passed: false, failedAt: 'validate' };
  }

  let html;
  try {
    html = render(template, testCase.context ?? {});
    stages.renders = true;
    stages.html = html;
  } catch (err) {
    return { ...stages, passed: false, failedAt: 'render', error: err.message };
  }

  let hydrated = null;
  if (needsHydration(testCase)) {
    if (typeof hydrate !== 'function') {
      return { ...stages, passed: false, failedAt: 'hydrate', error: 'this case needs hydration but no hydrate function was provided' };
    }
    try {
      hydrated = hydrate(template, testCase.state ?? {});
      stages.hydrates = true;
    } catch (err) {
      return { ...stages, passed: false, failedAt: 'hydrate', error: err.message };
    }
  }

  for (const a of testCase.assertions) {
    const runner = ASSERTION_TYPES[a.type];
    if (!runner) {
      stages.assertions.push({ ...a, pass: false, detail: `unknown assertion type "${a.type}"` });
      continue;
    }
    const isHydrateAssertion = HYDRATE_ASSERTION_TYPES.has(a.type);
    const subject = isHydrateAssertion ? (hydrated?.root.innerHTML ?? '') : html;
    const extra = { template, ctx: hydrated?.ctx, root: hydrated?.root };
    const { pass, detail } = runner(subject, a, extra);
    stages.assertions.push({ ...a, pass, detail });
  }

  const passed = stages.assertions.every((a) => a.pass);
  return { ...stages, passed, failedAt: passed ? null : 'assertions' };
}
