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
 * Cloud providers require one API key each. `ollama` models need no key —
 * they run locally against Ollama (default http://localhost:11434, override
 * with --ollama-url), which is the intended path for non-Anthropic models
 * when no cloud keys are available:
 *
 *   bn-evals --models anthropic:claude-opus-5,ollama:llama3.2 --ollama-url http://localhost:11434
 *
 * It will not run a partial leaderboard.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

function parseArgs(argv) {
  const args = { models: [], out: null, conditions: [false, true], ollamaUrl: DEFAULT_OLLAMA_URL };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--models') {
      args.models = argv[++i].split(',').map((spec) => {
        const [provider, model] = spec.split(':');
        return { provider, model, id: spec };
      });
    } else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--no-mcp-delta') args.conditions = [false];
    else if (argv[i] === '--ollama-url') args.ollamaUrl = argv[++i];
  }
  for (const m of args.models) {
    if (m.provider === 'ollama') m.baseUrl = args.ollamaUrl;
  }
  return args;
}

/**
 * Ollama refuses to generate against a model that hasn't been pulled, but it
 * does so per-request with no up-front indication of what's available — so
 * check `/api/tags` before burning a whole run on a typo'd model name.
 */
function tagMatches(tagName, requested) {
  return tagName === requested || tagName === `${requested}:latest` || tagName.startsWith(`${requested}:`);
}

async function preflightOllama(models, fetchImpl = fetch) {
  const byBaseUrl = new Map();
  for (const m of models) {
    if (m.provider !== 'ollama') continue;
    if (!byBaseUrl.has(m.baseUrl)) byBaseUrl.set(m.baseUrl, new Set());
    byBaseUrl.get(m.baseUrl).add(m.model);
  }
  if (byBaseUrl.size === 0) return;

  for (const [baseUrl, requested] of byBaseUrl) {
    const tagsUrl = `${baseUrl.replace(/\/$/, '')}/api/tags`;
    let tags;
    try {
      const res = await fetchImpl(tagsUrl);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      tags = await res.json();
    } catch (err) {
      console.error(`Could not reach Ollama at ${baseUrl} (${tagsUrl}): ${err.message}`);
      console.error('Is Ollama running? See https://ollama.com to install and start it.');
      process.exit(1);
    }
    const tagNames = (tags.models ?? []).map((t) => t.name ?? t.model).filter(Boolean);
    const missing = [...requested].filter((model) => !tagNames.some((tag) => tagMatches(tag, model)));
    if (missing.length) {
      console.error(`Requested Ollama model(s) not pulled at ${baseUrl}:`);
      for (const model of missing) console.error(`  ollama pull ${model}`);
      process.exit(1);
    }
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.models.length === 0) {
  console.error('Usage: bn-evals --models provider:model[,provider:model] [--out FILE] [--no-mcp-delta] [--ollama-url URL]');
  console.error('Providers: anthropic, openai, google, openaiCompatible, ollama (local, no API key required)');
  process.exit(1);
}

await preflightOllama(args.models);

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
