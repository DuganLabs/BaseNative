/**
 * The /ai scorecard: every point against BaseNative, with its standing.
 * Rows are sourced from /compare ("Where others win", "Probably not",
 * the DX rows), the October 2026 LLM benchmark and its 2026-10-24
 * re-run against the published 2.3.2 packages, and
 * docs/blog/2026-10-llm-benchmark.md. A row is Fixed only when the
 * runtime or the docs changed to close it; otherwise the tradeoff is
 * Accepted, and the standing says so in plain terms.
 *
 * `point` is plain text. The integration test requires every point to
 * appear in the rendered page.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeAttr, escapeText, raw } from '@basenative/runtime/shared/escape';
import { renderTrinity } from './trinity.js';
import { getMeasuredStats } from './site-data.js';
import { cellProse } from './cell-prose.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

const STATUS_VARIANT = {
  Fixed: 'success',
  'Already fixed': 'success',
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
    status: 'Accepted',
    standing: 'enableDevtools() is wired into the runtime: signals, effects, and hydrations register as they happen, with live values, subscriber counts, and disposed state on globalThis.__BASENATIVE_DEVTOOLS__. It is a console hook. There is no browser extension, and the bn CLI is not an inspector.',
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
    status: 'Accepted',
    standing: '@basenative/validate and the MCP server reject foreign syntax in templates. Nothing enforces architecture — no layering, boundary, or import rules. Structure is the team\'s own discipline.',
  },
  {
    id: 'third-party-integrations',
    from: 'Probably not',
    point: 'Projects that need deep third-party integrations',
    status: 'Accepted',
    standing: 'In this repo: auth, WebAuthn, db, and upload packages, plus a Plaid client in @basenative/integrations. The rest of npm has no BaseNative adapter; deep integration means writing to the service\'s API directly.',
  },
  {
    id: 'inspector-critical',
    from: 'Probably not',
    point: 'Apps where a mature devtools inspector is a critical part of the workflow',
    status: 'Accepted',
    standing: 'The devtools hook reports live state to the console. It is not a visual inspector, and there is no extension. If a mature inspector is critical to the workflow, do not pick BaseNative for that workflow.',
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
    status: 'Accepted',
    standing: 'Still the furthest behind — the DX table on /compare is the standing. HMR ships, bn from-jsx rewrites React drafts, and the CDN file skips the build; none of it is compiled-toolchain parity.',
  },
  {
    id: 'more-tokens',
    from: 'LLM benchmark',
    point: 'More code tokens than React, because HTML templates carry closing tags',
    status: 'Accepted',
    standing: 'Re-run fresh on 2026-10-24 against the published 2.3.2 packages: the line count tied and BaseNative used more tokens. The verdict is unchanged, and no code-size win is claimed.',
  },
  {
    id: 'no-break-even',
    from: 'LLM benchmark',
    point: 'The docs bundle has no break-even through code savings',
    status: 'Accepted',
    standing: 'Measured twice — the October 2026 benchmark and the 2026-10-24 re-run: no break-even. The docs cost tokens and the generated code does not repay them. llms.txt stays an index; the short cheat sheet only lowers the one-time cost.',
  },
  {
    id: 'double-fire',
    from: 'LLM benchmark',
    point: 'An effect that read a signal and a computed derived from it fired twice',
    status: 'Fixed',
    standing: 'A set() now settles derived computeds and then runs each affected effect once. The 2026-10-24 benchmark re-run against the published 2.3.2 packages confirms it behaviorally: the log effect fired exactly once per change, and the run needed no app-code fix.',
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
  return renderTrinity('badge', { label: status, variant: STATUS_VARIANT[status] || 'default' });
}

export function getAiPageContext() {
  const measured = getMeasuredStats();
  const tokens = cheatSheetTokens();
  const scorecard = renderTrinity('table', {
    caption: 'Points against BaseNative, and where each one stands',
    columns: ['From', 'Point', 'Status', 'Standing'],
    rows: AI_SCORECARD.map((row) => [
      row.from,
      { contentHtml: cellProse(row.point) },
      { contentHtml: statusBadge(row.status) },
      { contentHtml: cellProse(row.standing) },
    ]),
  });
  // The measured strip is the same stat surface /compare carries —
  // app markup on the app's tokens (styles.css, bn-metric).
  const statCard = (value, label) =>
    `<li><article data-bn="bn-metric"><p data-bn="bn-metric-value">${escapeText(value)}</p>` +
    `<p data-bn="bn-metric-label">${escapeText(label)}</p></article></li>`;
  const statsRow =
    statCard(`${measured.runtimeGzipKb} KB`, 'Runtime gzip, measured at render') +
    statCard(String(measured.unsafeEvalUses), 'eval and new Function uses in the runtime') +
    statCard(String(tokens), 'Cheat sheet tokens, bytes divided by four') +
    statCard(
      `${measured.benchBnTokens} vs ${measured.benchReactTokens}`,
      'Historical code tokens, BaseNative vs React',
    );
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
    scorecard: raw(scorecard),
    statsRow: raw(statsRow),
    canonical: raw(codeBlock('Canonical counter, one file, no build', CANONICAL)),
    mistakes: raw(mistakes),
    cheatTokens: String(tokens),
    benchBnTokens: measured.benchBnTokens,
    benchReactTokens: measured.benchReactTokens,
  };
}
