// Built with BaseNative — basenative.dev
/**
 * Template registry — keyed by `intent`.
 *
 * Each template:
 *   {
 *     name: string,
 *     description: string,
 *     buildPrompt(payload): string,
 *     successCheck(diffOrResponse, payload): boolean,
 *     maxIterations: number,
 *     escalateTo: 'sonnet' | 'opus' | 'human',
 *     temperature?: number,
 *     maxTokens?: number,
 *   }
 *
 * The five templates here cover the loop-pattern workloads called out
 * in DUGANLABS_ORCHESTRATOR_SPEC §9.
 */

import { testsFromTodos } from './tests-from-todos.js';
import { docstringCoverage } from './docstring-coverage.js';
import { lintBankruptcy } from './lint-bankruptcy.js';
import { refactorMigration } from './refactor-migration.js';
import { fsmClassifier } from './fsm-classifier.js';

export const templates = Object.freeze({
  tests: testsFromTodos,
  'tests-from-todos': testsFromTodos,
  docs: docstringCoverage,
  'docstring-coverage': docstringCoverage,
  'lint-fix': lintBankruptcy,
  'lint-bankruptcy': lintBankruptcy,
  'one-file-refactor': refactorMigration,
  'refactor-migration': refactorMigration,
  'fsm-transition': fsmClassifier,
  classification: fsmClassifier,
  'fsm-classifier': fsmClassifier,
});

export {
  testsFromTodos,
  docstringCoverage,
  lintBankruptcy,
  refactorMigration,
  fsmClassifier,
};
