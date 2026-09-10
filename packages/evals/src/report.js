const pct = (n) => `${(n * 100).toFixed(1)}%`;

/** Render a suite result as a Markdown leaderboard. */
export function toMarkdown({ coverage, runs, deltas }) {
  const lines = ['# BaseNative eval results', ''];

  lines.push('## Corpus coverage', '');
  lines.push('| Tier | Cases |', '|---|---|');
  for (const [tier, n] of Object.entries(coverage)) lines.push(`| ${tier} | ${n} |`);
  lines.push('');

  lines.push('## Pass rate', '');
  lines.push('| Model | MCP | Pass | Rate | Drift rate |', '|---|---|---|---|---|');
  for (const r of runs) {
    lines.push(
      `| ${r.model} | ${r.withMcp ? 'on' : 'off'} | ${r.summary.passed}/${r.summary.total} | ` +
        `${pct(r.summary.passRate)} | ${pct(r.summary.driftRate)} |`
    );
  }
  lines.push('');

  if (deltas.length) {
    lines.push('## MCP validation lift', '');
    lines.push('This delta is the product claim.', '');
    lines.push('| Model | Without | With | Lift | Drift without | Drift with |', '|---|---|---|---|---|---|');
    for (const d of deltas) {
      lines.push(
        `| ${d.model} | ${pct(d.without)} | ${pct(d.with)} | ${d.lift >= 0 ? '+' : ''}${pct(d.lift)} | ` +
          `${pct(d.driftWithout)} | ${pct(d.driftWith)} |`
      );
    }
    lines.push('');
  }

  const stages = {};
  for (const r of runs) for (const [k, v] of Object.entries(r.summary.byStage)) stages[k] = (stages[k] ?? 0) + v;
  if (Object.keys(stages).length) {
    lines.push('## Where failures happen', '');
    lines.push('| Stage | Failures |', '|---|---|');
    for (const [k, v] of Object.entries(stages)) lines.push(`| ${k} | ${v} |`);
    lines.push('');
  }

  return lines.join('\n');
}
