/**
 * Assertion runners.
 *
 * The assertion *types* are infrastructure and live here. The assertion *values* —
 * what a correct answer looks like for a given prompt — are hand-authored in the
 * corpus and must never be generated.
 */
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
};

/**
 * Score one generated template against a hand-authored case.
 *
 * The pipeline is staged, and an earlier stage failing short-circuits the rest:
 * a template that does not parse cannot be meaningfully rendered, and a template
 * that does not render cannot satisfy a behavioural assertion.
 */
export function scoreTemplate({ template, testCase, validate, render }) {
  const stages = { parses: false, renders: false, assertions: [] };

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

  for (const a of testCase.assertions) {
    const runner = ASSERTION_TYPES[a.type];
    if (!runner) {
      stages.assertions.push({ ...a, pass: false, detail: `unknown assertion type "${a.type}"` });
      continue;
    }
    const { pass, detail } = runner(html, a, { template });
    stages.assertions.push({ ...a, pass, detail });
  }

  const passed = stages.assertions.every((a) => a.pass);
  return { ...stages, passed, failedAt: passed ? null : 'assertions' };
}
