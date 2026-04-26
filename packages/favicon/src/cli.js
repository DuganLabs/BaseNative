#!/usr/bin/env node
// Built with BaseNative — basenative.dev
/**
 * `bn-favicon` — favicon generator CLI.
 *
 * Subcommands:
 *   - `bn-favicon init [preset]` — interactive (or non-interactive with
 *     `--preset`) generation. Writes `public/favicon.svg`,
 *     `public/manifest.json`, and (if `@basenative/og-image` is installed)
 *     a full PNG icon set. Idempotent — asks before overwriting.
 *   - `bn-favicon render <preset>` — render a preset to stdout (SVG).
 *   - `bn-favicon html [--theme-color <hex>]` — print the recommended
 *     `<head>` tags.
 *   - `bn-favicon list` — list available presets.
 *
 * Designed to be invoked from the BaseNative `bn` umbrella CLI as
 * `bn favicon …`, but works standalone after `pnpm add -D @basenative/favicon`.
 *
 * @module
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { parseArgs } from "node:util";

import { defineFavicon, htmlTags, presets, presetList } from "./index.js";

const HELP = `bn-favicon — SVG-first favicon generator

Usage:
  bn-favicon init [--preset <name>] [--out <dir>] [--force]
  bn-favicon render <preset>
  bn-favicon html [--theme-color <hex>] [--svg-href <path>]
  bn-favicon list

Examples:
  bn-favicon init                  # interactive
  bn-favicon init --preset tabs    # one-shot, default output dir is ./public
  bn-favicon render basenative     # SVG to stdout
  bn-favicon html --theme-color "#0C0B09"

Presets:
${presetList.map((p) => `  ${p.name.padEnd(20)} ${p.description}`).join("\n")}
`;

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "-h" || cmd === "--help") {
    process.stdout.write(HELP);
    return;
  }

  switch (cmd) {
    case "init":
      return cmdInit(argv.slice(1));
    case "render":
      return cmdRender(argv.slice(1));
    case "html":
      return cmdHtml(argv.slice(1));
    case "list":
      return cmdList();
    default:
      process.stderr.write(`bn-favicon: unknown command "${cmd}"\n\n${HELP}`);
      process.exit(1);
  }
}

/* ───────────── init ───────────── */

async function cmdInit(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      preset: { type: "string" },
      out: { type: "string", default: "public" },
      force: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  let presetName = values.preset;
  if (!presetName) {
    presetName = await prompt(
      `Pick a preset (${Object.keys(presets).join(", ")})\n> `,
    );
    presetName = presetName.trim();
  }

  const preset = presets[presetName];
  if (!preset) {
    process.stderr.write(
      `bn-favicon: unknown preset "${presetName}". Run \`bn-favicon list\`.\n`,
    );
    process.exit(1);
  }

  const fav = defineFavicon(preset);
  const outDir = resolve(process.cwd(), values.out);
  await mkdir(outDir, { recursive: true });

  // Always-on writes.
  await writeIfAllowed(resolve(outDir, "favicon.svg"), fav.svg, values.force);
  await writeIfAllowed(
    resolve(outDir, "manifest.json"),
    fav.manifest({ name: preset.name, themeColor: preset.themeColor }),
    values.force,
  );

  // PNG fallbacks — best-effort. If the optional peer is missing we surface
  // a clear note and keep going.
  let pngsWritten = 0;
  try {
    const { toIconSet } = await import("./png.js");
    const icons = await toIconSet({ favicon: fav.svg, maskable: fav.maskable });
    for (const [filename, bytes] of Object.entries(icons)) {
      await writeBinaryIfAllowed(resolve(outDir, filename), bytes, values.force);
      pngsWritten++;
    }
  } catch (err) {
    process.stderr.write(
      `\nbn-favicon: skipped PNG generation — install @basenative/og-image to enable.\n` +
        `  ${err && /** @type {any} */ (err).message}\n\n`,
    );
  }

  // Final report.
  process.stdout.write(
    `\nWrote favicon assets for "${preset.name}" → ${values.out}/\n` +
      `  - favicon.svg\n` +
      `  - manifest.json\n` +
      (pngsWritten ? `  - ${pngsWritten} PNG fallbacks\n` : "") +
      `\nAdd the following to your <head>:\n\n` +
      fav.htmlTags().map((t) => `  ${t}`).join("\n") +
      `\n`,
  );
}

/* ───────────── render ───────────── */

async function cmdRender(argv) {
  const name = argv[0];
  if (!name || !presets[name]) {
    process.stderr.write(
      `bn-favicon render: pass a preset name. Available: ${Object.keys(presets).join(", ")}\n`,
    );
    process.exit(1);
  }
  const fav = defineFavicon(presets[name]);
  process.stdout.write(fav.svg + "\n");
}

/* ───────────── html ───────────── */

async function cmdHtml(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      "theme-color": { type: "string", default: "#0C0B09" },
      "svg-href": { type: "string", default: "/favicon.svg" },
    },
    allowPositionals: false,
  });
  const tags = htmlTags({
    themeColor: values["theme-color"],
    svgHref: values["svg-href"],
  });
  process.stdout.write(tags.join("\n") + "\n");
}

/* ───────────── list ───────────── */

async function cmdList() {
  for (const p of presetList) {
    process.stdout.write(`${p.name.padEnd(20)} ${p.description}\n`);
  }
}

/* ───────────── helpers ───────────── */

async function prompt(message) {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(message);
  } finally {
    rl.close();
  }
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function writeIfAllowed(path, content, force) {
  if (!force && (await fileExists(path))) {
    const ans = (await prompt(`File exists: ${path} — overwrite? [y/N] `))
      .trim()
      .toLowerCase();
    if (ans !== "y" && ans !== "yes") {
      process.stdout.write(`  skipped: ${path}\n`);
      return;
    }
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  process.stdout.write(`  wrote: ${path}\n`);
}

async function writeBinaryIfAllowed(path, bytes, force) {
  if (!force && (await fileExists(path))) {
    const ans = (await prompt(`File exists: ${path} — overwrite? [y/N] `))
      .trim()
      .toLowerCase();
    if (ans !== "y" && ans !== "yes") {
      process.stdout.write(`  skipped: ${path}\n`);
      return;
    }
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(bytes));
  process.stdout.write(`  wrote: ${path}\n`);
}

// Silence "unused" warning — keep readFile available for future read-back logic.
void readFile;

main().catch((err) => {
  process.stderr.write(`bn-favicon: ${err && err.message ? err.message : err}\n`);
  process.exit(1);
});
