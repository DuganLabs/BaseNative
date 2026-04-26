// Built with BaseNative — basenative.dev
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  templates,
  testsFromTodos,
  docstringCoverage,
  lintBankruptcy,
  refactorMigration,
  fsmClassifier,
} from '../src/templates/index.js';

describe('templates registry', () => {
  it('exposes all five templates by canonical names', () => {
    assert.ok(templates['tests-from-todos']);
    assert.ok(templates['docstring-coverage']);
    assert.ok(templates['lint-bankruptcy']);
    assert.ok(templates['refactor-migration']);
    assert.ok(templates['fsm-classifier']);
  });

  it('exposes spec-level intent aliases', () => {
    assert.equal(templates.docs, docstringCoverage);
    assert.equal(templates.tests, testsFromTodos);
    assert.equal(templates['lint-fix'], lintBankruptcy);
    assert.equal(templates['one-file-refactor'], refactorMigration);
    assert.equal(templates['fsm-transition'], fsmClassifier);
  });

  it('every template has the required shape', () => {
    for (const t of [testsFromTodos, docstringCoverage, lintBankruptcy, refactorMigration, fsmClassifier]) {
      assert.equal(typeof t.name, 'string');
      assert.equal(typeof t.description, 'string');
      assert.equal(typeof t.buildPrompt, 'function');
      assert.equal(typeof t.successCheck, 'function');
      assert.equal(typeof t.maxIterations, 'number');
      assert.equal(typeof t.escalateTo, 'string');
    }
  });
});

describe('tests-from-todos', () => {
  const payload = {
    filePath: 'foo.js', fileContents: 'export function bar() {}', todoLine: 1,
    todoText: 'bar returns nothing', targetSymbol: 'bar',
  };

  it('builds a prompt that mentions the file and TODO', () => {
    const p = testsFromTodos.buildPrompt(payload);
    assert.match(p, /foo\.js/);
    assert.match(p, /bar/);
    assert.match(p, /TODO/);
  });

  it('successCheck accepts a real-looking test', () => {
    assert.equal(
      testsFromTodos.successCheck(`it('does bar', () => { assert.ok(true); });`, payload),
      true
    );
  });

  it('successCheck rejects prose / non-test output', () => {
    assert.equal(testsFromTodos.successCheck('this is just prose', payload), false);
    assert.equal(testsFromTodos.successCheck('', payload), false);
  });
});

describe('docstring-coverage', () => {
  const payload = { filePath: 'x.js', fileContents: 'export function x() {}', exportName: 'x', exportKind: 'function' };

  it('builds a prompt that mentions the export', () => {
    const p = docstringCoverage.buildPrompt(payload);
    assert.match(p, /Export: x/);
  });

  it('successCheck requires JSDoc fence', () => {
    assert.equal(
      docstringCoverage.successCheck('/** Returns the value of x for further processing. */', payload),
      true
    );
    assert.equal(docstringCoverage.successCheck('docs for x', payload), false);
  });

  it('successCheck rejects when name absent and no signature', () => {
    assert.equal(docstringCoverage.successCheck('/** does the thing */', payload), false);
  });
});

describe('lint-bankruptcy', () => {
  const payload = {
    filePath: 'a.js', fileContents: 'const x = 1;\nconsole.log(x)\n',
    ruleId: 'no-unused-vars', line: 1, message: 'x is unused',
  };

  it('builds a prompt with the rule and location', () => {
    const p = lintBankruptcy.buildPrompt(payload);
    assert.match(p, /no-unused-vars/);
    assert.match(p, /line 1/);
  });

  it('accepts a unified diff', () => {
    const diff = '--- a.js\n+++ a.js\n@@\n-const x = 1;\n+const _x = 1;\n';
    assert.equal(lintBankruptcy.successCheck(diff, payload), true);
  });

  it('accepts a disable-next-line waiver naming the rule', () => {
    assert.equal(
      lintBankruptcy.successCheck('// eslint-disable-next-line no-unused-vars\nconst x = 1;', payload),
      true
    );
  });

  it('rejects prose', () => {
    assert.equal(lintBankruptcy.successCheck('just rename it', payload), false);
  });
});

describe('refactor-migration', () => {
  const payload = {
    filePath: 'm.js',
    fileContents: 'import { oldFn } from "x";\noldFn();\n',
    migration: { from: 'oldFn', to: 'newFn', kind: 'identifier' },
  };

  it('builds prompt with from→to', () => {
    const p = refactorMigration.buildPrompt(payload);
    assert.match(p, /oldFn/);
    assert.match(p, /newFn/);
  });

  it('accepts a diff that swaps oldFn → newFn', () => {
    const diff = '--- m.js\n+++ m.js\n@@\n-import { oldFn } from "x";\n+import { newFn } from "x";\n-oldFn();\n+newFn();\n';
    assert.equal(refactorMigration.successCheck(diff, payload), true);
  });

  it('accepts an empty diff when source has no `from`', () => {
    const empty = refactorMigration.successCheck('', { ...payload, fileContents: 'no match here' });
    assert.equal(empty, true);
  });

  it('rejects a diff that lacks the new name', () => {
    const diff = '--- m.js\n+++ m.js\n@@\n-oldFn();\n+something();\n';
    assert.equal(refactorMigration.successCheck(diff, payload), false);
  });
});

describe('fsm-classifier', () => {
  const payload = {
    message: '123 Main St, Irvine',
    currentState: 'awaiting-address',
    allowedTransitions: ['address-captured', 'invalid'],
  };

  it('builds prompt referencing allowed transitions', () => {
    const p = fsmClassifier.buildPrompt(payload);
    assert.match(p, /address-captured/);
    assert.match(p, /awaiting-address/);
  });

  it('accepts well-formed JSON', () => {
    const r = JSON.stringify({ transition: 'address-captured', confidence: 0.9, fields: { addr: '123 Main' } });
    assert.equal(fsmClassifier.successCheck(r, payload), true);
  });

  it('strips ```json fence and still validates', () => {
    const r = '```json\n' + JSON.stringify({ transition: 'address-captured', confidence: 0.9, fields: {} }) + '\n```';
    assert.equal(fsmClassifier.successCheck(r, payload), true);
  });

  it('rejects unknown transitions', () => {
    const r = JSON.stringify({ transition: 'lol', confidence: 0.9, fields: {} });
    assert.equal(fsmClassifier.successCheck(r, payload), false);
  });

  it('rejects malformed JSON', () => {
    assert.equal(fsmClassifier.successCheck('not json', payload), false);
  });

  it('rejects out-of-range confidence', () => {
    const r = JSON.stringify({ transition: 'invalid', confidence: 2, fields: {} });
    assert.equal(fsmClassifier.successCheck(r, payload), false);
  });
});
