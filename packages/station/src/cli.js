#!/usr/bin/env node
// Built with BaseNative — basenative.dev
/**
 * `bn-station` CLI — minimal control surface around the package.
 *
 *   bn-station enqueue <intent> [--venture x] [--payload @file.json]
 *   bn-station list    [--status pending|running|done|escalated|failed]
 *   bn-station run     [--max-iterations N] [--max-jobs N]
 *   bn-station ops
 *   bn-station drain
 *
 * Reads config from env:
 *   STATION_TUNNEL_URL   — required for `run` and `ops`
 *   STATION_MODEL        — primary model (default qwen2.5-coder-7b-instruct)
 *   STATION_QUEUE_DB     — sqlite path; default in-memory (per process)
 *   STATION_FALLBACK_URL — optional Workers AI URL
 */

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { defineStation } from './define-station.js';
import { templates } from './templates/index.js';
import * as ops from './ops.js';

const HELP = `bn-station — queue-driven local-inference primitive

Usage:
  bn-station enqueue <intent> [--venture x] [--payload @file.json | --payload '{"...":"..."}']
  bn-station list    [--status queued|running|done|escalated|failed] [--venture x]
  bn-station run     [--max-iterations N] [--max-jobs N]
  bn-station ops
  bn-station drain   [--reason "..."]

Env:
  STATION_TUNNEL_URL    primary OpenAI-compatible endpoint (required for run/ops)
  STATION_MODEL         primary model id (default: qwen2.5-coder-7b-instruct)
  STATION_QUEUE_DB      sqlite path (default :memory:)
  STATION_FALLBACK_URL  Workers AI fallback endpoint
`;

export async function main(argv = process.argv.slice(2)) {
  const cmd = argv[0];
  const rest = argv.slice(1);
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    process.stdout.write(HELP);
    return 0;
  }

  const station = buildStation();

  switch (cmd) {
    case 'enqueue':
      return cmdEnqueue(station, rest);
    case 'list':
      return cmdList(station, rest);
    case 'run':
      return cmdRun(station, rest);
    case 'ops':
      return cmdOps(station);
    case 'drain':
      return cmdDrain(station, rest);
    default:
      process.stderr.write(`unknown command: ${cmd}\n${HELP}`);
      return 2;
  }
}

function buildStation() {
  const tunnelUrl = process.env.STATION_TUNNEL_URL ?? 'http://localhost:8000';
  const fallback = process.env.STATION_FALLBACK_URL
    ? { url: process.env.STATION_FALLBACK_URL, model: process.env.STATION_FALLBACK_MODEL }
    : undefined;
  return defineStation({
    tunnelUrl,
    model: process.env.STATION_MODEL ?? 'qwen2.5-coder-7b-instruct',
    queueDb: process.env.STATION_QUEUE_DB ?? ':memory:',
    ...(fallback ? { fallback } : {}),
  });
}

function cmdEnqueue(station, argv) {
  const intent = argv[0];
  if (!intent) {
    process.stderr.write('enqueue: intent required\n');
    return 2;
  }
  if (!templates[intent]) {
    process.stderr.write(`enqueue: unknown intent '${intent}'. Known: ${Object.keys(templates).join(', ')}\n`);
    return 2;
  }
  const { values } = parseArgs({
    args: argv.slice(1),
    options: {
      venture: { type: 'string', default: 'unknown' },
      payload: { type: 'string', default: '{}' },
      'max-iterations': { type: 'string' },
      'escalate-to': { type: 'string' },
    },
    allowPositionals: false,
  });
  const payloadRaw = values.payload?.startsWith('@')
    ? readFileSync(values.payload.slice(1), 'utf8')
    : values.payload;
  let payload;
  try {
    payload = JSON.parse(payloadRaw ?? '{}');
  } catch (err) {
    process.stderr.write(`enqueue: invalid payload JSON: ${err.message}\n`);
    return 2;
  }
  const id = station.queue.enqueue({
    venture: values.venture,
    intent,
    payload,
    ...(values['max-iterations'] ? { maxIterations: Number(values['max-iterations']) } : {}),
    ...(values['escalate-to'] ? { escalateTo: values['escalate-to'] } : {}),
  });
  process.stdout.write(`${id}\n`);
  return 0;
}

function cmdList(station, argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      status: { type: 'string' },
      venture: { type: 'string' },
      json: { type: 'boolean' },
    },
    allowPositionals: false,
  });
  const filters = {};
  if (values.status) filters.status = values.status;
  if (values.venture) filters.venture = values.venture;
  const rows = station.queue.list(filters);
  if (values.json) {
    process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
    return 0;
  }
  if (rows.length === 0) {
    process.stdout.write('(no jobs)\n');
    return 0;
  }
  for (const r of rows) {
    process.stdout.write(
      `${r.id.slice(0, 8)}  ${r.status.padEnd(10)} ${r.intent.padEnd(20)} ${r.venture.padEnd(12)} iter=${r.iterations}/${r.maxIterations}\n`
    );
  }
  return 0;
}

async function cmdRun(station, argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'max-iterations': { type: 'string' },
      'max-jobs': { type: 'string' },
    },
    allowPositionals: false,
  });
  const opts = {};
  if (values['max-iterations']) opts.maxIterations = Number(values['max-iterations']);
  if (values['max-jobs']) opts.maxJobs = Number(values['max-jobs']);
  const r = await station.runner.run(opts);
  process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  return 0;
}

async function cmdOps(station) {
  const tunnelUrl = process.env.STATION_TUNNEL_URL ?? '';
  const s = await ops.summary({
    tunnelUrl,
    client: station.client,
    queue: station.queue,
    ...(process.env.STATION_GPU_URL ? { gpuUrl: process.env.STATION_GPU_URL } : {}),
  });
  process.stdout.write(JSON.stringify(s, null, 2) + '\n');
  return s.ok ? 0 : 1;
}

function cmdDrain(station, argv) {
  const { values } = parseArgs({
    args: argv,
    options: { reason: { type: 'string', default: 'manual drain' } },
    allowPositionals: false,
  });
  const stuck = [
    ...station.queue.list({ status: 'queued' }),
    ...station.queue.list({ status: 'running' }),
  ];
  for (const j of stuck) {
    station.queue.escalate(j.id, values.reason);
  }
  process.stdout.write(`escalated ${stuck.length} job(s)\n`);
  return 0;
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`bn-station: ${err?.stack ?? err}\n`);
      process.exit(1);
    });
}
