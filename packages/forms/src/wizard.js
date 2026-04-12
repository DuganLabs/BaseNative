import { signal, computed } from '@basenative/runtime';

/**
 * Creates a multi-step form wizard that coordinates pre-built form instances.
 *
 * @param {Array<{ name: string, form: Form, title?: string }>} steps
 * @param {object} [options]
 * @param {Function} [options.onComplete] - Called with aggregated values when all steps are valid
 * @param {boolean} [options.validateBeforeNext] - Whether to validate before advancing (default: true)
 * @returns {Wizard}
 */
export function createWizard(steps, options = {}) {
  const stepCount = steps.length;
  const validateBeforeNext = options.validateBeforeNext !== false;
  const currentIndex = signal(0);
  const visited = signal(new Set([0]));

  const currentStep = computed(() => steps[currentIndex()]);
  const currentForm = computed(() => currentStep().form);
  const isFirst = computed(() => currentIndex() === 0);
  const isLast = computed(() => currentIndex() === stepCount - 1);
  const progress = computed(() => ((currentIndex() + 1) / stepCount) * 100);
  const canNext = computed(() => currentForm().valid());
  const allValid = computed(() => steps.every((step) => step.form.valid()));

  function getValues() {
    const result = {};
    for (const step of steps) {
      result[step.name] = step.form.getValues();
    }
    return result;
  }

  function next() {
    if (isLast()) return false;
    if (validateBeforeNext) {
      currentForm().touchAll();
      if (!currentForm().valid()) return false;
    }
    const nextIdx = currentIndex() + 1;
    currentIndex.set(nextIdx);
    const v = new Set(visited());
    v.add(nextIdx);
    visited.set(v);
    return true;
  }

  function prev() {
    if (isFirst()) return false;
    currentIndex.set(currentIndex() - 1);
    return true;
  }

  function goTo(index) {
    if (index < 0 || index >= stepCount) return false;
    const v = visited();
    const maxVisited = Math.max(...v);
    if (index <= maxVisited + 1) {
      currentIndex.set(index);
      const next = new Set(v);
      next.add(index);
      visited.set(next);
      return true;
    }
    return false;
  }

  function reset() {
    for (const step of steps) step.form.reset();
    currentIndex.set(0);
    visited.set(new Set([0]));
  }

  async function complete() {
    // Find first invalid step
    for (let i = 0; i < steps.length; i++) {
      steps[i].form.touchAll();
      if (!steps[i].form.valid()) {
        currentIndex.set(i);
        return { ok: false, errors: steps[i].form.errors(), step: i };
      }
    }

    const values = getValues();
    if (options.onComplete) {
      try {
        const result = await options.onComplete(values);
        return { ok: true, data: result };
      } catch (error) {
        return { ok: false, error };
      }
    }

    return { ok: true, data: values };
  }

  return {
    currentIndex, stepCount, steps, currentStep, currentForm,
    isFirst, isLast, progress, canNext, visited, allValid,
    next, prev, goTo, getValues, reset, complete,
  };
}
