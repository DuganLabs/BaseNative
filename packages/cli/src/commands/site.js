// Built with BaseNative — basenative.dev
/**
 * `bn site` — generate static pages from data.
 *
 *   bn site build --input site.json [--outdir dist] [--dry-run] [--json]
 *
 * The input file names the site's page module (the same module the
 * dev server renders through), the output directory, and the pages to
 * generate; see lib/site-build.js for the format and the determinism
 * contract. Generation is a pure function of the input and the site
 * module: run it twice, get the same tree.
 */

import { parseArgs } from 'node:util';
import { c, ok, err, info, banner } from '../lib/colors.js';
import { buildSite } from '../lib/site-build.js';

function showHelp() {
  console.log(`
  ${c.bold('bn site')} ${c.gray('<subcommand>')}

  Generate static pages from data.

  ${c.bold('Subcommands')}
    ${c.accent('build')}    Render the pages named by a site input file to static HTML

  ${c.bold('Options')}
    --input <f>   Input JSON (module, outdir, pages) [required for build]
    --outdir <d>  Override the input's output directory
    --dry-run     Render and report; write nothing
    --json        Machine-readable output
    -h, --help
`);
}

export async function run(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      input: { type: 'string' },
      outdir: { type: 'string' },
      json: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    showHelp();
    return;
  }

  const sub = positionals[0];
  if (sub !== 'build') {
    err(`Unknown subcommand: ${sub}`);
    console.log(`  Try: bn site build --input site.json`);
    process.exit(1);
  }
  if (!values.input) {
    err('Missing --input <site.json>.');
    console.log(`  Try: bn site build --input site.json`);
    process.exit(1);
  }

  const result = await buildSite(values.input, {
    outdir: values.outdir,
    dryRun: values['dry-run'],
  });

  if (values.json) {
    console.log(JSON.stringify({ ...result, dryRun: values['dry-run'] }, null, 2));
  } else {
    banner();
    for (const path of result.written) info(`  ${path}`);
    ok(
      values['dry-run']
        ? `Dry run — ${result.written.length} page(s) would be written to ${result.outdir}`
        : `Wrote ${result.written.length} page(s) to ${result.outdir}`,
    );
  }
  return result;
}
