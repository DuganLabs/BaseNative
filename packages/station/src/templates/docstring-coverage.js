// Built with BaseNative — basenative.dev
/**
 * docstring-coverage — add a JSDoc comment to one undocumented export.
 *
 * payload: {
 *   filePath: string,
 *   fileContents: string,
 *   exportName: string,
 *   exportSignature?: string,
 *   exportKind: 'function' | 'class' | 'const' | 'type',
 * }
 */

export const docstringCoverage = Object.freeze({
  name: 'docstring-coverage',
  description: 'Write one JSDoc block for one undocumented export.',
  maxIterations: 3,
  escalateTo: 'haiku',
  temperature: 0.2,
  maxTokens: 400,

  buildPrompt(payload) {
    return [
      `File: ${payload.filePath}`,
      `Export: ${payload.exportName} (${payload.exportKind})`,
      payload.exportSignature ? `Signature: ${payload.exportSignature}` : '',
      '',
      'File contents:',
      '```',
      payload.fileContents,
      '```',
      '',
      'Write a single JSDoc block for the export above.',
      'Rules:',
      '- Lead with one short sentence describing what it does (not what it is).',
      '- Document each @param and @returns where applicable.',
      "- Use BaseNative voice: explain WHY, not WHAT. No hedging.",
      '- Output ONLY the JSDoc block, starting with `/**` and ending with `*/`.',
    ]
      .filter(Boolean)
      .join('\n');
  },

  successCheck(response, payload) {
    if (typeof response !== 'string') return false;
    const trimmed = response.trim();
    if (!trimmed.startsWith('/**')) return false;
    if (!trimmed.endsWith('*/')) return false;
    if (trimmed.length < 20) return false;
    // Must mention the export name somewhere — primitive grounding check.
    if (payload.exportName && !trimmed.includes(payload.exportName)) {
      // Allow generic doc when signature is supplied (e.g. anonymous defaults)
      if (!payload.exportSignature) return false;
    }
    return true;
  },
});
