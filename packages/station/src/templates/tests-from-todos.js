// Built with BaseNative — basenative.dev
/**
 * tests-from-todos — given a file with `// TODO: test X` markers,
 * generate one test per iteration. Loop pattern: knock off one TODO,
 * mark done, advance.
 *
 * payload: {
 *   filePath: string,
 *   fileContents: string,
 *   todoLine: number,           // index into fileContents lines
 *   todoText: string,           // text after `// TODO: test ` prefix
 *   testFramework?: 'node' | 'vitest' | 'jest',
 *   targetSymbol?: string,
 * }
 */

export const testsFromTodos = Object.freeze({
  name: 'tests-from-todos',
  description: 'Generate one test for one TODO marker. Single iteration removes one TODO.',
  maxIterations: 5,
  escalateTo: 'sonnet',
  temperature: 0.1,
  maxTokens: 800,

  buildPrompt(payload) {
    const fw = payload.testFramework ?? 'node';
    return [
      `File: ${payload.filePath}`,
      `Test framework: ${fw} (use \`import { describe, it } from 'node:test'\` for node).`,
      payload.targetSymbol ? `Target symbol: ${payload.targetSymbol}` : '',
      `TODO marker (line ${payload.todoLine}): ${payload.todoText}`,
      '',
      'File contents:',
      '```',
      payload.fileContents,
      '```',
      '',
      'Output a single new test (one `it(...)` block) that exercises exactly the TODO.',
      'Do not modify other code. Do not output prose. Output only the test code.',
    ]
      .filter(Boolean)
      .join('\n');
  },

  successCheck(response, payload) {
    if (typeof response !== 'string') return false;
    if (response.length < 20) return false;
    // Must look like a test: contains it(...) or test(...)
    if (!/\b(it|test)\s*\(/.test(response)) return false;
    // Must reference the TODO subject (target symbol or todo text words).
    const subject =
      payload.targetSymbol ?? (payload.todoText ?? '').split(/\s+/).find((w) => w.length > 3);
    if (subject && !response.toLowerCase().includes(String(subject).toLowerCase())) return false;
    return true;
  },
});
