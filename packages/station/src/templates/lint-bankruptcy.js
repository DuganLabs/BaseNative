// Built with BaseNative — basenative.dev
/**
 * lint-bankruptcy — fix one lint warning per iteration.
 *
 * Named after the strategy of declaring lint bankruptcy and then
 * grinding the warning count down to zero one fix at a time. Loop pattern.
 *
 * payload: {
 *   filePath: string,
 *   fileContents: string,
 *   ruleId: string,         // e.g. 'no-unused-vars'
 *   line: number,
 *   column?: number,
 *   message: string,
 *   linter?: 'eslint' | 'tsc' | 'biome',
 * }
 */

export const lintBankruptcy = Object.freeze({
  name: 'lint-bankruptcy',
  description: 'Fix exactly one lint warning. Smallest possible change.',
  maxIterations: 4,
  escalateTo: 'sonnet',
  temperature: 0.1,
  maxTokens: 600,

  buildPrompt(payload) {
    return [
      `File: ${payload.filePath}`,
      `Linter: ${payload.linter ?? 'eslint'}`,
      `Rule: ${payload.ruleId}`,
      `Location: line ${payload.line}${payload.column ? `, col ${payload.column}` : ''}`,
      `Message: ${payload.message}`,
      '',
      'File contents:',
      '```',
      payload.fileContents,
      '```',
      '',
      'Output a unified diff that fixes ONLY this lint warning.',
      'Rules:',
      '- Smallest possible change.',
      '- No drive-by edits. If the rule needs a config waiver, output a one-line eslint-disable-next-line comment instead.',
      '- Output the diff only, no prose.',
    ].join('\n');
  },

  successCheck(response, payload) {
    if (typeof response !== 'string' || response.length < 10) return false;
    // Diff-shaped: has a +/- line marker, references the file, mentions the rule
    // OR is an explicit disable-next-line waiver.
    const looksLikeDiff = /^(---|\+\+\+|@@|[+-])/m.test(response);
    const hasDisable = response.includes('eslint-disable-next-line') ||
      response.includes('// eslint-disable-line');
    if (!looksLikeDiff && !hasDisable) return false;
    // Soft check: rule id mentioned somewhere (often appears in the disable comment)
    if (hasDisable && !response.includes(payload.ruleId)) return false;
    return true;
  },
});
