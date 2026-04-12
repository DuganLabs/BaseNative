import { signal, computed } from '@basenative/runtime';
import { createForm } from './form.js';

/**
 * Creates a multi-step form wizard that wraps createForm for each step.
 *
 * @param {Array<{ fields: Record<string, Field>, label?: string }>} steps
 * @param {object} [options]
 * @param {Function} [options.onComplete] - Called with aggregated values when all steps are valid
 * @returns {Wizard}
 */
export function createWizard(steps, options = {}) {
  const stepCount = steps.length;
  const forms = steps.map((step) => createForm(step.fields));
  const currentStep = signal(0);
  const visited = signal(new Set([0]));

  const currentForm = computed(() => forms[currentStep()]);
  const isFirst = computed(() => currentStep() === 0);
  const isLast = computed(() => currentStep() === stepCount - 1);
  const progress = computed(() => (currentStep() + 1) / stepCount);
  const canNext = computed(() => currentForm().valid());
  const allValid = computed(() => forms.every((form) => form.valid()));

  function getValues() {
    const result = {};
    for (const form of forms) {
      Object.assign(result, form.getValues());
    }
    return result;
  }

  function next() {
    currentForm().touchAll();
    if (!currentForm().valid() || isLast()) return;
    const nextIndex = currentStep() + 1;
    currentStep.set(nextIndex);
    const v = new Set(visited());
    v.add(nextIndex);
    visited.set(v);
  }

  function prev() {
    if (isFirst()) return;
    currentStep.set(currentStep() - 1);
  }

  function goTo(index) {
    if (index < 0 || index >= stepCount) return;
    const v = visited();
    const maxVisited = Math.max(...v);
    if (index <= maxVisited + 1) {
      currentStep.set(index);
      const next = new Set(v);
      next.add(index);
      visited.set(next);
    }
  }

  function reset() {
    for (const form of forms) form.reset();
    currentStep.set(0);
    visited.set(new Set([0]));
  }

  function complete() {
    if (!allValid()) return;
    if (options.onComplete) return options.onComplete(getValues());
  }

  return {
    currentStep, stepCount, steps: forms, currentForm,
    isFirst, isLast, progress, canNext, visited, allValid,
    next, prev, goTo, getValues, reset, complete,
  };
}
