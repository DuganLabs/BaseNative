/**
 * Every Source pane on /components/:slug is copied verbatim into the reader's
 * clipboard, so each one has to be JavaScript that parses. The panes are
 * authored as strings in examples/express/component-demos.js, independently
 * of the render beside them, and nothing else ties the two together — this is
 * the check that keeps `items: [...]` and friends off the published site.
 *
 * Shared by scripts/build-pages.js (refuses to build) and
 * tests/integration/integration.test.js (fails the suite).
 */
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { demos, getDemo } from '../examples/express/component-demos.js';
import { flatComponents } from '../examples/express/component-catalog.js';
import * as components from '../packages/components/src/index.js';

/** Every Source pane string, with the slug/label the ticket and the guard name it by. */
export function demoSnippets() {
  const out = [];
  for (const slug of Object.keys(demos)) {
    const demo = getDemo(slug);
    if (typeof demo.quickstart === 'string') {
      out.push({ slug, label: 'quickstart', code: demo.quickstart });
    }
    (demo.examples || []).forEach((example, i) => {
      if (typeof example.code === 'string') {
        out.push({ slug, label: `ex${i}`, code: example.code, scripted: example.scripted, title: example.title });
      }
    });
  }
  return out;
}

// Snippets are ESM (`import … from '@basenative/components'`), so a plain
// vm.Script would reject every quickstart for the wrong reason.
// vm.SourceTextModule parses ESM in-process but only exists under
// --experimental-vm-modules; without it, `node --check` on stdin does the
// same parse in a child process.
export function snippetSyntaxError(code) {
  if (typeof vm.SourceTextModule === 'function') {
    try {
      new vm.SourceTextModule(code);
      return null;
    } catch (err) {
      return err.message;
    }
  }
  const result = spawnSync(process.execPath, ['--input-type=module', '--check', '-'], {
    input: code,
    encoding: 'utf8',
  });
  if (result.status === 0) return null;
  const line = result.stderr.split('\n').find((l) => /Error/.test(l));
  return line ? line.trim() : result.stderr.trim();
}

/**
 * Parse failures, plus any component page left without a single runnable
 * snippet. Empty when the site is fit to publish.
 */
export function demoSnippetProblems() {
  const problems = [];
  const parseable = new Set();
  for (const { slug, label, code } of demoSnippets()) {
    const error = snippetSyntaxError(code);
    if (error) {
      problems.push(`${slug}/${label}: ${error} — the Source pane must be runnable JavaScript, not an elision`);
    } else {
      parseable.add(slug);
    }
  }
  for (const { slug } of flatComponents) {
    if (!parseable.has(slug)) {
      problems.push(`${slug}: /components/${slug} has no parseable Source snippet — a reader cannot run anything on that page`);
    }
  }
  return problems;
}

// `@basenative/components` is a server-render package; the client bundle
// exports no render* helper. A pane that assigns one into the DOM teaches an
// API the page itself does not use (component-demo-scripts.js builds the
// markup inline), and following it throws `renderX is not defined`. Only the
// package's own render* names count — a helper the snippet defines is fine.
const SERVER_RENDER_NAMES = Object.keys(components).filter((name) => /^render[A-Z]/.test(name));
const SERVER_RENDER_INTO_DOM = new RegExp(
  `(?:innerHTML\\s*=|insertAdjacentHTML\\s*\\()[^;]*\\b(?:${SERVER_RENDER_NAMES.join('|')})\\s*\\(`,
);

export function demoClientApiProblems() {
  const problems = [];
  for (const { slug, label, code, scripted } of demoSnippets()) {
    if (!scripted) continue;
    const hit = SERVER_RENDER_INTO_DOM.exec(code);
    if (hit) {
      problems.push(
        `${slug}/${label} (scripted: ${scripted}): assigns a server render helper into the DOM — ` +
          `match the markup component-demo-scripts.js builds instead:\n    ${hit[0].slice(0, 100)}`,
      );
    }
  }
  return problems;
}
