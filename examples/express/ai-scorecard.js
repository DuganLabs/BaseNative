/**
 * The /ai scorecard. The route was not in git history — no view, no commit
 * by Muse — so the rows are the last committed list of points against
 * BaseNative: /compare ("Where others win", "Probably not", the DX rows),
 * the October 2026 LLM benchmark, and docs/blog/2026-10-llm-benchmark.md.
 *
 * `point` is plain text. The integration test requires every point to
 * appear in the rendered page.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeAttr, escapeText, raw } from '@basenative/runtime/shared/escape';
import {
  renderBadge,
  renderFaq,
  renderStatCard,
  renderTable,
} from '../../packages/components/src/index.js';
import { getMeasuredStats } from './site-data.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

const STATUS_VARIANT = {
  Fixed: 'success',
  'Already fixed': 'success',
  Mitigated: 'primary',
  Accepted: 'warning',
};

export const AI_SCORECARD = [
  {
    id: 'component-model',
    from: 'Where others win',
    point: 'No framework component layer, and no component-library ecosystem on top of HTML',
    status: 'Accepted',
    standing: 'Semantic HTML is the component model. That is the design, not a missing feature.',
  },
  {
    id: 'third-party-libs',
    from: 'Where others win',
    point: 'Ecosystem of one, with no third-party component libraries',
    status: 'Accepted',
    standing: 'Nothing on npm supplies a BaseNative component library. The in-repo catalog is @basenative/components.',
  },
  {
    id: 'parse-overhead',
    from: 'Where others win',
    point: 'Runtime expression parsing has overhead versus compiled output',
    status: 'Accepted',
    standing: 'Templates stay data, so a model can emit them under a strict CSP with no build. A compiler would give that up.',
  },
  {
    id: 'svelte-dx',
    from: 'Where others win',
    point: 'Svelte has the better-polished DX and a mature compiler toolchain',
    status: 'Accepted',
    standing: 'Compiled DX is still ahead. The counterweight is no compiler in the agent loop.',
  },
  {
    id: 'devtools',
    from: 'Where others win',
    point: 'No React DevTools, no Angular CLI, and no Svelte inspector',
    status: 'Mitigated',
    standing: 'enableDevtools() sets globalThis.__BASENATIVE_DEVTOOLS__. That is not a browser extension. The bn CLI scaffolds and deploys.',
  },
  {
    id: 'bus-factor',
    from: 'Where others win',
    point: 'Solo-maintained, with a bus factor of one',
    status: 'Accepted',
    standing: 'One maintainer. Distribution does not change that.',
  },
  {
    id: 'unheard-of',
    from: 'Where others win',
    point: 'Almost nobody has heard of it, so hiring and onboarding start from zero',
    status: 'Accepted',
    standing: 'This page, the cheat sheet, AGENTS.md, and package keywords are the response. They are not a community.',
  },
  {
    id: 'enforced-architecture',
    from: 'Probably not',
    point: 'Large team apps that need an enforced architecture',
    status: 'Mitigated',
    standing: '@basenative/validate and the MCP server reject foreign syntax. They are not a staff engineer.',
  },
  {
    id: 'third-party-integrations',
    from: 'Probably not',
    point: 'Projects that need deep third-party integrations',
    status: 'Mitigated',
    standing: 'Auth, db, upload, and the Plaid wrapper exist in this repo. Most of npm does not have a BaseNative adapter.',
  },
  {
    id: 'inspector-critical',
    from: 'Probably not',
    point: 'Apps where a mature devtools inspector is a critical part of the workflow',
    status: 'Mitigated',
    standing: 'Same gap as the missing browser extension. Use enableDevtools() or do not pick BaseNative for that workflow.',
  },
  {
    id: 'hiring-pool',
    from: 'Probably not',
    point: 'Enterprise apps with a strict hiring-pool requirement',
    status: 'Accepted',
    standing: 'There is no hiring pool. Do not pretend otherwise.',
  },
  {
    id: 'huge-spa',
    from: 'Probably not',
    point: 'Complex SPAs with hundreds of components',
    status: 'Accepted',
    standing: 'Router, forms, and the in-repo catalog exist. There is no npm component ecosystem to assemble a huge SPA from.',
  },
  {
    id: 'ecosystem-size',
    from: 'DX table',
    point: 'Ecosystem packages are Growing against a massive React ecosystem',
    status: 'Accepted',
    standing: 'The DX table still says Growing. The word is accurate.',
  },
  {
    id: 'community-size',
    from: 'DX table',
    point: 'Community size is a solo project',
    status: 'Accepted',
    standing: 'The DX table still says Solo project.',
  },
  {
    id: 'dx-behind',
    from: 'DX section',
    point: 'The place BaseNative is furthest behind',
    status: 'Mitigated',
    standing: 'HMR already ships. A CDN file, bn from-jsx, and agent rules shorten the first hour. Compiled-DX parity is not claimed.',
  },
  {
    id: 'more-tokens',
    from: 'LLM benchmark',
    point: 'More code tokens than React, because HTML templates carry closing tags',
    status: 'Accepted',
    standing: 'The October 2026 measurement stands: fewer lines, more tokens. The frozen benchmark apps were not rewritten.',
  },
  {
    id: 'no-break-even',
    from: 'LLM benchmark',
    point: 'The docs bundle has no break-even through code savings',
    status: 'Mitigated',
    standing: 'llms.txt stays an index. docs/llm/START.md is a separate short file, also served as /llms-start.txt. Code savings still do not pay for the index.',
  },
  {
    id: 'double-fire',
    from: 'LLM benchmark',
    point: 'An effect that read a signal and a computed derived from it fired twice',
    status: 'Fixed',
    standing: 'A set() now settles derived computeds and then runs each affected effect once. The historical run still recorded one app-code fix.',
  },
  {
    id: 'class-replace',
    from: 'October blog',
    point: ':class used to replace the class attribute instead of merging',
    status: 'Fixed',
    standing: 'mergeClass() joins class and :class on the server and in hydrate(). A false binding adds nothing.',
  },
  {
    id: 'effect-loop',
    from: 'October blog',
    point: 'An effect that reads a signal it writes used to overflow the stack',
    status: 'Fixed',
    standing: 'That pattern throws BN_EFFECT_LOOP and names .peek(). A read inside a helper still subscribes.',
  },
  {
    id: 'value-property',
    from: 'October blog',
    point: ':value used to write the attribute instead of the property',
    status: 'Already fixed',
    standing: 'Fixed in 2.0.1. :value and :checked mirror the DOM property, so clearing a signal clears the field.',
  },
  {
    id: 'not-a-field-study',
    from: 'October blog',
    point: 'Two small tasks are not a field study, and routing, forms, auth, and the database adapters went unbenchmarked',
    status: 'Accepted',
    standing: 'No model pass rate is published. The eval corpus is empty and was not generated to fill this row.',
  },
  {
    id: 'readme-install',
    from: 'README',
    point: 'The README told models to install from GitHub Packages',
    status: 'Fixed',
    standing: 'The quick start now says npmjs.org, with no token. The old GitHub Packages page carries an out-of-date banner.',
  },
];

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
  import { signal, computed, hydrate } from 'https://cdn.jsdelivr.net/npm/@basenative/runtime@2/+esm';
  const count = signal(0);
  const doubled = computed(() => count() * 2);
  hydrate(document.body, { count, doubled });
</script>`;

function codeBlock(label, source) {
  return `<pre tabindex="0" aria-label="${escapeAttr(label)}"><code>${escapeText(source)}</code></pre>`;
}

function statusBadge(status) {
  return renderBadge('', { text: status, variant: STATUS_VARIANT[status] || 'default' });
}

export function getAiPageContext() {
  const measured = getMeasuredStats();
  const tokens = cheatSheetTokens();
  const scorecard = renderTable({
    caption: 'Points against BaseNative, and where each one stands',
    columns: [
      { key: 'from', label: 'From' },
      { key: 'point', label: 'Point' },
      { key: 'status', label: 'Status', render: (value) => statusBadge(value) },
      { key: 'standing', label: 'Standing' },
    ],
    rows: AI_SCORECARD,
  });
  const statsRow = [
    renderStatCard({
      value: `${measured.runtimeGzipKb} KB`,
      label: 'Runtime gzip, measured at render',
    }),
    renderStatCard({
      value: String(measured.unsafeEvalUses),
      label: 'eval and new Function uses in the runtime',
    }),
    renderStatCard({
      value: String(tokens),
      label: 'Cheat sheet tokens, bytes divided by four',
    }),
    renderStatCard({
      value: `${measured.benchBnTokens} vs ${measured.benchReactTokens}`,
      label: 'Historical code tokens, BaseNative vs React',
    }),
  ].join('\n');
  const mistakes = renderFaq({
    items: [
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
    ],
  });

  return {
    scorecard: raw(scorecard),
    statsRow: raw(statsRow),
    canonical: raw(codeBlock('Canonical counter, one file, no build', CANONICAL)),
    mistakes: raw(mistakes),
    cheatTokens: String(tokens),
    benchBnTokens: measured.benchBnTokens,
    benchReactTokens: measured.benchReactTokens,
  };
}
