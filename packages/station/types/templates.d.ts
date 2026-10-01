// Built with BaseNative — basenative.dev

import type { EscalateTo } from './queue.js';

export interface JobTemplate {
  name: string;
  description: string;
  buildPrompt(payload: Record<string, unknown>): string;
  successCheck(diffOrResponse: string, payload: Record<string, unknown>): boolean;
  maxIterations: number;
  escalateTo: EscalateTo;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export const templates: Readonly<Record<string, JobTemplate>>;

export const testsFromTodos: Readonly<JobTemplate>;
export const docstringCoverage: Readonly<JobTemplate>;
export const lintBankruptcy: Readonly<JobTemplate>;
export const refactorMigration: Readonly<JobTemplate>;
export const fsmClassifier: Readonly<JobTemplate>;
