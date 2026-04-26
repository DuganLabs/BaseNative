// Built with BaseNative — basenative.dev
/**
 * fsm-classifier — Greenput intake classification.
 *
 * Given an inbound SMS reply and the current FSM state, classify the
 * next transition. The model returns one of a closed set of labels,
 * plus structured fields for downstream code to apply.
 *
 * payload: {
 *   message: string,            // raw inbound SMS body
 *   currentState: string,       // FSM state id, e.g. 'awaiting-address'
 *   allowedTransitions: string[], // valid next-state ids
 *   contextHints?: string[],
 * }
 *
 * Successful response shape (JSON):
 *   {
 *     "transition": "<one of allowedTransitions>",
 *     "confidence": 0.0–1.0,
 *     "fields": { ... extracted slot values ... }
 *   }
 */

export const fsmClassifier = Object.freeze({
  name: 'fsm-classifier',
  description: 'Classify Greenput SMS reply into FSM transition + extracted slot values.',
  maxIterations: 2,
  escalateTo: 'sonnet',
  temperature: 0.0,
  maxTokens: 300,

  buildPrompt(payload) {
    return [
      `Current FSM state: ${payload.currentState}`,
      `Allowed transitions: ${(payload.allowedTransitions ?? []).join(', ')}`,
      payload.contextHints?.length ? `Context: ${payload.contextHints.join('; ')}` : '',
      '',
      'Inbound message:',
      `"""${payload.message}"""`,
      '',
      'Return ONE JSON object with this exact shape:',
      '{ "transition": "<allowed-transition-id>", "confidence": <0-1>, "fields": { } }',
      'No prose. No markdown fence. Just the JSON.',
    ]
      .filter(Boolean)
      .join('\n');
  },

  successCheck(response, payload) {
    if (typeof response !== 'string') return false;
    let parsed;
    try {
      // Tolerate an accidental ```json ... ``` wrap by stripping.
      const stripped = response
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '');
      parsed = JSON.parse(stripped);
    } catch {
      return false;
    }
    if (typeof parsed !== 'object' || parsed === null) return false;
    if (typeof parsed.transition !== 'string') return false;
    if (!(payload.allowedTransitions ?? []).includes(parsed.transition)) return false;
    if (typeof parsed.confidence !== 'number') return false;
    if (parsed.confidence < 0 || parsed.confidence > 1) return false;
    if (typeof parsed.fields !== 'object' || parsed.fields === null) return false;
    return true;
  },
});
