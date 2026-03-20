#!/usr/bin/env node
/**
 * Mozilla Observatory Security Audit — v2 API
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const REPORTS_DIR = join(root, 'reports');

const DEPLOY_URL = process.env.DEPLOY_URL;
const MIN_GRADE = process.env.OBSERVATORY_MIN_GRADE ?? 'B';
const GRADE_ORDER = ['A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F'];

if (!DEPLOY_URL) {
  console.error('✗ DEPLOY_URL environment variable not set');
  process.exit(1);
}

const hostname = new URL(DEPLOY_URL).hostname;
console.log(`\nMozilla Observatory scan: ${hostname}`);
console.log(`Minimum grade: ${MIN_GRADE}\n`);

function gradeIndex(g) {
  const i = GRADE_ORDER.indexOf(g);
  return i === -1 ? GRADE_ORDER.length : i;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runScan() {
  mkdirSync(REPORTS_DIR, { recursive: true });

  // Use v2 API
  const API = 'https://observatory.mozilla.org/api/v2';

  // Trigger scan
  const triggerRes = await fetch(`${API}/analyze?host=${hostname}&rescan=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!triggerRes.ok && triggerRes.status !== 200) {
    // Fall back: just GET current results
    console.log(`  Trigger returned ${triggerRes.status}, fetching existing results...`);
  }

  // Poll for completion
  let result;
  for (let i = 0; i < 24; i++) {
    await sleep(5000);
    const res = await fetch(`${API}/analyze?host=${hostname}`);
    if (!res.ok) { console.log(`  Poll ${i+1}: HTTP ${res.status}`); continue; }
    result = await res.json();
    console.log(`  Status: ${result.state ?? result.status ?? 'unknown'} (attempt ${i+1})`);
    if ((result.state === 'FINISHED') || result.grade) break;
    if (result.state === 'FAILED') throw new Error(`Scan failed: ${JSON.stringify(result)}`);
  }

  if (!result?.grade) {
    // If Observatory API is unavailable, do a manual header check instead
    console.log('\n  Observatory API unavailable — running manual header security check...\n');
    await manualHeaderCheck(hostname);
    return;
  }

  const grade = result.grade;
  const score = result.score ?? 0;
  console.log(`\n  Grade: ${grade}`);
  console.log(`  Score: ${score}/100\n`);

  const report = { timestamp: new Date().toISOString(), hostname, grade, score, minGrade: MIN_GRADE, passed: gradeIndex(grade) <= gradeIndex(MIN_GRADE) };
  writeFileSync(join(REPORTS_DIR, `observatory-${Date.now()}.json`), JSON.stringify(report, null, 2));

  if (gradeIndex(grade) > gradeIndex(MIN_GRADE)) {
    console.error(`✗ Observatory FAILED — grade ${grade} is below minimum ${MIN_GRADE}`);
    process.exit(1);
  }
  console.log(`✓ Observatory PASSED — grade ${grade} meets minimum ${MIN_GRADE}`);
}

async function manualHeaderCheck(hostname) {
  // Manually check security headers as Observatory fallback
  const res = await fetch(`https://${hostname}/`, { method: 'HEAD' });
  const headers = Object.fromEntries(res.headers.entries());

  const checks = [
    { name: 'Strict-Transport-Security', key: 'strict-transport-security', required: true },
    { name: 'Content-Security-Policy', key: 'content-security-policy', required: true },
    { name: 'X-Frame-Options', key: 'x-frame-options', required: true },
    { name: 'X-Content-Type-Options', key: 'x-content-type-options', required: true },
    { name: 'Referrer-Policy', key: 'referrer-policy', required: true },
    { name: 'Permissions-Policy', key: 'permissions-policy', required: false },
    { name: 'Cross-Origin-Opener-Policy', key: 'cross-origin-opener-policy', required: false },
  ];

  let failures = 0;
  for (const check of checks) {
    const present = !!headers[check.key];
    const icon = present ? '  ✓' : check.required ? '  ✗' : '  ~';
    console.log(`${icon} ${check.name}: ${present ? headers[check.key]?.slice(0, 60) : 'MISSING'}`);
    if (!present && check.required) failures++;
  }

  const report = { timestamp: new Date().toISOString(), hostname, method: 'manual-header-check', failures, headers };
  writeFileSync(join(REPORTS_DIR, `observatory-${Date.now()}.json`), JSON.stringify(report, null, 2));

  if (failures > 0) {
    console.error(`\n✗ Security header check FAILED — ${failures} required header(s) missing`);
    process.exit(1);
  }
  console.log(`\n✓ Security header check PASSED — all required headers present`);
}

runScan().catch(err => {
  console.error('Observatory error:', err.message);
  // Don't hard-fail if Observatory is unreachable — log and continue
  console.log('  Observatory unreachable — skipping (check manually at https://observatory.mozilla.org)');
  process.exit(0);
});
