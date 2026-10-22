// Built with BaseNative — basenative.dev
/**
 * `bn from-jsx` — translate a React/JSX draft into BaseNative.
 *
 * Reads a file or stdin and writes the translation to stdout (or `-o`).
 * The translator covers the habits named in docs/llm/START.md. It prints
 * notes for anything it could not finish.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { fromJsx } from '../lib/from-jsx.js';

export async function run(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      out: { type: 'string', short: 'o' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
  bn from-jsx [file]

  Translate className, htmlFor, onClick, useState, and {expr} text into
  BaseNative. Not a full JSX parser — notes name anything left unfinished.

  Options:
    -o, --out <file>   Write the translation to a file instead of stdout
    -h, --help         Show this help

  With no file, reads stdin.
`);
    return;
  }

  const file = positionals[0];
  const source = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
  const { code, notes } = fromJsx(source);
  const body = notes.length
    ? `<!-- bn from-jsx\n${notes.map((n) => `  - ${n}`).join('\n')}\n-->\n${code}`
    : code;

  if (values.out) writeFileSync(values.out, body);
  else process.stdout.write(body);
}
