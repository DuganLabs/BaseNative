// Built with BaseNative — basenative.dev
/**
 * Analyze command - analyzes bundle size and dependencies.
 *
 * Usage: bn analyze [dir]
 *
 * Scans the build output directory and reports:
 * - Total bundle size
 * - Per-file sizes (sorted largest first)
 * - Dependency breakdown
 * - Suggestions for optimization
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';
import { parseArgs } from 'node:util';

export async function run(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
  bn analyze [dir]

  Analyze bundle size and dependencies.

  Arguments:
    dir    Directory to analyze [default: dist]

  Options:
    --help, -h   Show this help
`);
    return;
  }

  const cwd = process.cwd();
  const targetDir = resolve(cwd, positionals[0] || 'dist');

  if (!existsSync(targetDir)) {
    console.error(`Directory "${relative(cwd, targetDir) || targetDir}" not found. Run "bn build" first.`);
    process.exit(1);
  }

  console.log(`Analyzing ${relative(cwd, targetDir) || targetDir}...\n`);

  const files = collectFiles(targetDir, targetDir);

  if (files.length === 0) {
    console.log('No files found in the build directory.');
    return { files: [], totalSize: 0, groups: {} };
  }

  // Sort by size descending
  files.sort((a, b) => b.size - a.size);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Group by extension
  const groups = {};
  for (const file of files) {
    const ext = extname(file.relativePath) || '(no ext)';
    if (!groups[ext]) groups[ext] = { count: 0, size: 0 };
    groups[ext].count++;
    groups[ext].size += file.size;
  }

  // Print per-file table
  console.log('Files (sorted by size):');
  console.log(`${'  File'.padEnd(50)} Size`);
  console.log(`${'  ' + '-'.repeat(46)}  ${'-'.repeat(10)}`);
  for (const file of files) {
    const name = `  ${file.relativePath}`;
    console.log(`${name.padEnd(50)} ${formatSize(file.size)}`);
  }

  // Print group summary
  console.log('\nBy file type:');
  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].size - a[1].size);
  for (const [ext, data] of sortedGroups) {
    const pct = ((data.size / totalSize) * 100).toFixed(1);
    console.log(`  ${ext.padEnd(12)} ${String(data.count).padStart(3)} file(s)  ${formatSize(data.size).padStart(10)}  (${pct}%)`);
  }

  // Print total
  console.log(`\nTotal: ${formatSize(totalSize)} across ${files.length} file(s)`);

  // Warnings and suggestions
  const suggestions = [];

  if (totalSize > 1024 * 1024) {
    console.log(`\n  Warning: Total bundle size exceeds 1 MB.`);
    suggestions.push('Consider code splitting or lazy loading large modules.');
  }

  const jsFiles = files.filter((f) => f.relativePath.endsWith('.js'));
  const largeJs = jsFiles.filter((f) => f.size > 100 * 1024);
  if (largeJs.length > 0) {
    suggestions.push(`${largeJs.length} JS file(s) > 100 KB. Consider tree-shaking unused exports.`);
  }

  const cssFiles = files.filter((f) => f.relativePath.endsWith('.css'));
  const largeCss = cssFiles.filter((f) => f.size > 50 * 1024);
  if (largeCss.length > 0) {
    suggestions.push(`${largeCss.length} CSS file(s) > 50 KB. Consider purging unused styles.`);
  }

  if (suggestions.length > 0) {
    console.log('\nSuggestions:');
    for (const s of suggestions) {
      console.log(`  - ${s}`);
    }
  }

  return { files, totalSize, groups };
}

function collectFiles(dir, baseDir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir));
    } else {
      results.push({
        relativePath: relative(baseDir, fullPath),
        size: stat.size,
      });
    }
  }
  return results;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
