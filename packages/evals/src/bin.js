#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCorpus, tierCoverage } from './corpus.js';
import { runSuite } from './run.js';
import { toMarkdown } from './report.js';

/**
 * bn-evals — run the hand-authored corpus against configured models.
 *
 *   bn-evals --models anthropic:claude-opus-5,openai:gpt-5 [--out results.md] [--no-mcp-delta]
 *
 * Requires one API key per provider. It will not run a partial leaderboard.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { models: [], out: null, conditions: [false, true] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--models') {
      args.models = argv[++i].split(',').map((spec) => {
        const [provider, model] = spec.split(':');
        return { provider, model, id: spec };
      });
    } else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--no-mcp-delta') args.conditions = [false];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.models.length === 0) {
  console.error('Usage: bn-evals --models provider:model[,provider:model] [--out FILE] [--no-mcp-delta]');
  console.error('Providers: anthropic, openai, google, openaiCompatible');
  process.exit(1);
}

const cases = loadCorpus(resolve(ROOT, 'prompts'));
const coverage = tierCoverage(cases);
console.error(`Corpus: ${cases.length} cases — ${Object.entries(coverage).map(([t, n]) => `${t}:${n}`).join(' ')}`);

const suite = await runSuite({ cases, models: args.models, conditions: args.conditions });
const md = toMarkdown(suite);
if (args.out) {
  writeFileSync(args.out, md);
  console.error(`Wrote ${args.out}`);
} else {
  console.log(md);
}
