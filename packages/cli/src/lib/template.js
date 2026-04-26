// Built with BaseNative — basenative.dev
/**
 * Tiny template engine — no Handlebars. Walks a template directory, copies
 * every file into a destination directory, and runs `{{tokens}}` replacement
 * on file *contents* and *paths*. Files ending in `.tmpl` get the suffix
 * stripped (lets templates ship things like `package.json.tmpl` so npm
 * doesn't mistakenly treat the template as an installable package).
 *
 * Safety: refuses to write outside `dest`. Refuses to overwrite unless
 * `overwrite: true`.
 */

import { readdirSync, statSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/**
 * Interpolate `{{key}}` tokens against `vars`. Unknown tokens are left as-is
 * (so the user can spot them in the output).
 */
export function interpolate(text, vars) {
  return String(text).replace(TOKEN_RE, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match;
  });
}

/**
 * Render an entire template directory tree into `destDir`.
 *
 * @param {string} srcDir - absolute path to template root
 * @param {string} destDir - absolute path to destination root
 * @param {Record<string, string|number>} vars - token map
 * @param {{overwrite?: boolean, dryRun?: boolean, onFile?: (rel:string)=>void}} [opts]
 * @returns {{written: string[], skipped: string[]}}
 */
export function renderTemplate(srcDir, destDir, vars, opts = {}) {
  const { overwrite = false, dryRun = false, onFile } = opts;
  if (!existsSync(srcDir)) throw new Error(`Template not found: ${srcDir}`);

  const written = [];
  const skipped = [];
  const absDest = resolve(destDir);

  walk(srcDir, (absPath, rel) => {
    // Interpolate the path itself.
    let outRel = interpolate(rel, vars);
    if (outRel.endsWith('.tmpl')) outRel = outRel.slice(0, -'.tmpl'.length);

    const outPath = resolve(absDest, outRel);

    // Path-traversal guard.
    const within = relative(absDest, outPath);
    if (within.startsWith('..') || resolve(absDest, within) !== outPath) {
      throw new Error(`Refusing to write outside destination: ${outRel}`);
    }

    if (existsSync(outPath) && !overwrite) {
      skipped.push(outRel);
      return;
    }

    const raw = readFileSync(absPath);
    let body;
    if (isProbablyText(absPath, raw)) {
      body = interpolate(raw.toString('utf-8'), vars);
    } else {
      body = raw; // binary — copy verbatim
    }

    if (!dryRun) {
      mkdirSync(join(outPath, '..'), { recursive: true });
      writeFileSync(outPath, body);
    }
    written.push(outRel);
    if (onFile) onFile(outRel);
  });

  return { written, skipped };
}

function walk(dir, onFile, base = dir) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walk(abs, onFile, base);
    } else {
      onFile(abs, relative(base, abs));
    }
  }
}

const TEXT_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.json', '.md', '.html', '.htm', '.css', '.scss', '.txt',
  '.yml', '.yaml', '.toml', '.ini', '.env', '.tmpl',
  '.gitignore', '.npmrc', '.nvmrc', '.prettierrc', '.editorconfig',
  '.sh', '.bash',
]);

function isProbablyText(path, buf) {
  // Cheap heuristic: extension allow-list, plus reject if NUL byte in first 512.
  const ext = path.match(/\.[^./]+$/)?.[0]?.toLowerCase();
  if (ext && TEXT_EXT.has(ext)) return true;
  // Files like `Dockerfile`, `LICENSE`, etc. → check content.
  const slice = buf.subarray(0, Math.min(buf.length, 512));
  for (let i = 0; i < slice.length; i++) {
    if (slice[i] === 0) return false;
  }
  return true;
}

/**
 * Convert a project name into a slug suitable for package.json `name`.
 */
export function toSlug(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert kebab/snake → PascalCase.
 */
export function toPascal(name) {
  return String(name)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('');
}
