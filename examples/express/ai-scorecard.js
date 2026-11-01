/**
 * The /ai page: how BaseNative fits an agent's loop (the CLI, the MCP
 * server, the validator, llms.txt), the figures measured at build, the
 * canonical one-file counter and the React habits the validator names.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeAttr, escapeText, raw } from '@basenative/runtime/shared/escape';
import { renderTrinity } from './trinity.js';
import { getMeasuredStats } from './site-data.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** Bytes divided by four, the same estimator the benchmark used. */
export function cheatSheetTokens() {
  const text = readFileSync(join(ROOT, 'docs/llm/START.md'));
  return Math.ceil(text.length / 4);
}

const CANONICAL = `<p class="item" :class="count() > 0 ? 'done' : ''">
  Count <span>{{ count() }}</span>, doubled <span>{{ doubled() }}</span>
</p>
<button type="button" @click="count.set(count() + 1)">Add</button>

<script type="module">
  import { signal, computed, hydrate } from 'https://cdn.jsdelivr.net/npm/@basenative/runtime@3/+esm';
  const count = signal(0);
  const doubled = computed(() => count() * 2);
  hydrate(document.body, { count, doubled });
</script>`;

function codeBlock(label, source) {
  return `<pre tabindex="0" aria-label="${escapeAttr(label)}"><code>${escapeText(source)}</code></pre>`;
}

export function getAiPageContext() {
  const measured = getMeasuredStats();
  const tokens = cheatSheetTokens();
  // The measured strip is the same stat surface /compare carries —
  // app markup on the app's tokens (styles.css, bn-metric).
  const statCard = (value, label) =>
    `<li><article data-bn="bn-metric"><p data-bn="bn-metric-value">${escapeText(value)}</p>` +
    `<p data-bn="bn-metric-label">${escapeText(label)}</p></article></li>`;
  const statsRow =
    statCard(`${measured.runtimeGzipKb} KB`, 'Runtime, gzip') +
    statCard(String(measured.unsafeEvalUses), 'Uses of eval or new Function in the runtime') +
    statCard(String(tokens), 'Tokens in the model cheat sheet');
  const toolkit = renderTrinity('list-group', {
    items: [
      ['bn create', 'Scaffolds a project: <code>npx -p @basenative/cli bn create my-app</code>.'],
      ['@basenative/mcp', 'An MCP server that gives any agent template validation, server-rendered previews and the directive reference.'],
      ['@basenative/validate', 'Machine-actionable errors a model can repair from the error object alone.'],
      ['bn from-jsx', 'Rewrites a React or JSX draft into BaseNative templates.'],
      ['llms.txt', 'The docs indexed for models at <a href="/llms.txt">/llms.txt</a>, with a one-page <a href="/llms-start.txt">cheat sheet</a>.'],
    ].map(([title, detail]) => ({ contentHtml: `<p><strong>${title}</strong> ${detail}</p>` })),
  });
  const mistakes = [
    ...[

      {
        question: 'className and htmlFor',
        answerText: 'Use class and for. An expression goes in :class, and it merges with the static class.',
      },
      {
        question: 'onClick={save}',
        answerText: 'Use @click="save($event)". The event name is lowercase after the @.',
      },
      {
        question: 'A single brace around a value',
        answerText: 'Text interpolation is {{ name() }}, with the signal called. A single brace is reported as React syntax.',
      },
      {
        question: 'useState, useMemo, useEffect',
        answerText: 'signal, computed, and effect. The setter is count.set, not setCount.',
      },
      {
        question: 'An effect that logs by appending to the same signal',
        answerText: 'Read that signal with .peek(), or write a different one. Otherwise the runtime throws BN_EFFECT_LOOP.',
      },
      {
        question: 'Putting every class token inside :class',
        answerText: 'That was the workaround when :class replaced the attribute. Write class="item" :class="done() ? \'done\' : \'\'" now.',
      },
    ].map((item) =>
      renderTrinity('accordion', {
        summary: item.question,
        bodyHtml: `<p>${escapeText(item.answerText)}</p>`,
      }),
    ),
  ].join('\n');

  return {
    toolkit: raw(toolkit),
    statsRow: raw(statsRow),
    canonical: raw(codeBlock('Canonical counter, one file, no build', CANONICAL)),
    mistakes: raw(mistakes),
    cheatTokens: String(tokens),
    benchBnTokens: measured.benchBnTokens,
    benchReactTokens: measured.benchReactTokens,
  };
}
