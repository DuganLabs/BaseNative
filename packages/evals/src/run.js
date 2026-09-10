import { validateTemplate } from '@basenative/validate';
import { scoreTemplate } from './assertions.js';
import { extractTemplate, resolveCredentials } from './providers.js';
import { tierCoverage, TIERS } from './corpus.js';

/**
 * The system prompt sent with every case.
 *
 * Kept identical across the MCP-on and MCP-off conditions apart from the single
 * sentence about the tools — otherwise the measured delta would confound "has
 * tools" with "was told more about the language", and the headline number would
 * be meaningless.
 */
export function buildPrompt(testCase, { withMcp }) {
  const tools = withMcp
    ? '\n\nYou have BaseNative MCP tools available: validate_template, render_preview, ' +
      'list_directives, check_expression. Use them to check your output before answering.'
    : '';
  return (
    'Write a BaseNative template for the following requirement. ' +
    'Return only the template markup, with no explanation.' +
    tools +
    `\n\nRequirement: ${testCase.prompt}` +
    (testCase.context ? `\n\nIt will be rendered with this context:\n${JSON.stringify(testCase.context, null, 2)}` : '')
  );
}

/**
 * Run the corpus against one model.
 * `generate` is injected so tests can drive the pipeline without network access.
 */
export async function defaultRender() {
  const { render } = await import('@basenative/server');
  return render;
}

export async function runModel({ model, cases, withMcp, generate, render, concurrency = 4 }) {
  const renderFn = render ?? (await defaultRender());
  const results = [];
  const queue = [...cases];

  async function worker() {
    for (;;) {
      const testCase = queue.shift();
      if (!testCase) return;
      const prompt = buildPrompt(testCase, { withMcp });
      let raw;
      try {
        raw = await generate(prompt, model);
      } catch (err) {
        results.push({ id: testCase.id, tier: testCase.tier, passed: false, failedAt: 'generate', error: err.message });
        continue;
      }
      const template = extractTemplate(raw);
      const score = scoreTemplate({ template, testCase, validate: validateTemplate, render: renderFn });
      results.push({ id: testCase.id, tier: testCase.tier, template, ...score });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, cases.length) }, worker));
  results.sort((a, b) => a.id.localeCompare(b.id));
  return { model: model.id ?? model.model, withMcp, results, summary: summarise(results) };
}

/** Aggregate pass rates overall, per tier, and per failure stage. */
export function summarise(results) {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const byTier = {};
  for (const tier of TIERS) {
    const subset = results.filter((r) => r.tier === tier);
    if (subset.length) {
      byTier[tier] = { total: subset.length, passed: subset.filter((r) => r.passed).length };
    }
  }
  const byStage = {};
  for (const r of results) {
    if (r.passed) continue;
    byStage[r.failedAt ?? 'unknown'] = (byStage[r.failedAt ?? 'unknown'] ?? 0) + 1;
  }
  // The drift rate is the headline diagnostic: how often a model reached for
  // another framework's syntax rather than merely getting the logic wrong.
  const drift = results.filter((r) =>
    (r.diagnostics ?? []).some((d) => d.code === 'BN_E_FOREIGN_DIRECTIVE')
  ).length;

  return {
    total,
    passed,
    passRate: total ? passed / total : 0,
    byTier,
    byStage,
    driftCount: drift,
    driftRate: total ? drift / total : 0,
  };
}

/**
 * Run every model under both conditions. The delta between them is the product
 * claim: does giving a model a validator actually make it write correct BaseNative?
 */
export async function runSuite({ cases, models, generate, render, env = process.env, conditions = [false, true] }) {
  const resolved = generate ? models : resolveCredentials(models, env);
  const renderFn = render ?? (await defaultRender());
  const runs = [];
  for (const model of resolved) {
    for (const withMcp of conditions) {
      const gen = generate ?? ((prompt, m) => m.provider.generate(prompt, m));
      runs.push(await runModel({ model, cases, withMcp, generate: gen, render: renderFn }));
    }
  }
  return { coverage: tierCoverage(cases), runs, deltas: computeDeltas(runs) };
}

/** Pass-rate lift from enabling the MCP validation loop, per model. */
export function computeDeltas(runs) {
  const byModel = new Map();
  for (const run of runs) {
    const entry = byModel.get(run.model) ?? {};
    entry[run.withMcp ? 'withMcp' : 'withoutMcp'] = run.summary;
    byModel.set(run.model, entry);
  }
  return [...byModel.entries()]
    .filter(([, v]) => v.withMcp && v.withoutMcp)
    .map(([model, v]) => ({
      model,
      without: v.withoutMcp.passRate,
      with: v.withMcp.passRate,
      lift: v.withMcp.passRate - v.withoutMcp.passRate,
      driftWithout: v.withoutMcp.driftRate,
      driftWith: v.withMcp.driftRate,
    }));
}
