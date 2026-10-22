import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  installFailedBecauseStaged,
  partitionSmokeSpecs,
  smokeSource,
} from './npm-smoke.mjs';

const specs = [
  { name: '@basenative/runtime', version: '2.3.1', spec: '@basenative/runtime@2.3.1' },
  { name: '@basenative/server', version: '2.3.1', spec: '@basenative/server@2.3.1' },
  { name: '@basenative/forms', version: '2.3.1', spec: '@basenative/forms@2.3.1' },
];

test('exact versions that were only staged are left out of the install', () => {
  const staged = [{ name: '@basenative/runtime', version: '2.3.1', stageId: 'abc' }];
  const { install, skipped } = partitionSmokeSpecs(specs, staged);
  assert.deepEqual(skipped, ['@basenative/runtime@2.3.1']);
  assert.deepEqual(install, ['@basenative/server@2.3.1', '@basenative/forms@2.3.1']);
});

test('latest mode does not skip, because staging does not move the latest tag', () => {
  const staged = [{ name: '@basenative/runtime', version: '2.3.1', stageId: 'abc' }];
  const { install, skipped } = partitionSmokeSpecs(specs, staged, { useLatest: true });
  assert.deepEqual(skipped, []);
  assert.equal(install.length, 3);
});

test('an install that 404s on a staged dependency is tolerated', () => {
  const staged = [{ name: '@basenative/runtime', version: '2.3.1' }];
  const text = 'ERR_PNPM_NO_MATCHING_VERSION No matching version found for @basenative/runtime@2.3.1';
  assert.equal(installFailedBecauseStaged(text, staged), true);
  assert.equal(installFailedBecauseStaged('ECONNRESET registry.npmjs.org', staged), false);
  assert.equal(installFailedBecauseStaged(text, []), false);
});

test('the smoke program only imports packages that were installed', () => {
  const source = smokeSource(['@basenative/server', '@basenative/forms']);
  assert.match(source, /from '@basenative\/server'/);
  assert.match(source, /from '@basenative\/forms'/);
  assert.doesNotMatch(source, /@basenative\/runtime/);
  assert.doesNotMatch(source, /@basenative\/components/);
});
