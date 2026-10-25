// @ts-check
import { signal, computed } from '@basenative/runtime';

export const name = 'stepper';
export const root = 'ol';

/**
 * The stepper: a linear sequence shown as a progress rail — each step
 * complete, current, or upcoming, the state carried by the item's own
 * registered variant name and authored in this sheet. The current step
 * also carries aria-current="step". The view model moves the position
 * (goTo / next / previous) and reports one event per move, so an app
 * or a wizard can drive it; the indicator itself renders no controls.
 *
 * @typedef {object} StepperStep
 * @property {string} value
 * @property {string} label
 * @property {string} [detail] A quieter second line.
 *
 * @typedef {object} StepperProps
 * @property {string} [name] Carried on the step event.
 * @property {StepperStep[]} steps
 * @property {string} [current] The current step's value. Default the first.
 * @property {(event: { name: string, index: number, value: string, label: string }) => void} [onStep]
 * @property {string} [variant] A registered variant name.
 */

/** @param {StepperProps} props */
export function create(props) {
  if (!Array.isArray(props.steps) || props.steps.length === 0) {
    throw new TypeError('stepper: steps must be a non-empty array');
  }

  const stepperName = signal(props.name ?? '');
  const steps = signal(props.steps);
  const variant = signal(props.variant ?? 'stepper');
  const currentValue = signal(props.current ?? props.steps[0].value);
  const currentIndex = computed(() => steps().findIndex((step) => step.value === currentValue()));

  /** @param {StepperStep} step */
  function indexOf(step) {
    return steps().findIndex((candidate) => candidate.value === step.value);
  }

  /** @param {StepperStep} step */
  function stateFor(step) {
    const index = indexOf(step);
    if (index < currentIndex()) return 'complete';
    if (index === currentIndex()) return 'current';
    return 'upcoming';
  }

  /** @param {StepperStep} step */
  function isCurrent(step) {
    return step.value === currentValue();
  }

  /** @param {StepperStep} step */
  function stepNumber(step) {
    return String(indexOf(step) + 1);
  }

  /** @param {string} value */
  function goTo(value) {
    const index = steps().findIndex((step) => step.value === value);
    if (index === -1 || value === currentValue()) return;
    currentValue.set(value);
    props.onStep?.({ name: stepperName(), index, value, label: steps()[index].label });
  }

  function next() {
    const target = steps()[currentIndex() + 1];
    if (target) goTo(target.value);
  }

  function previous() {
    const target = steps()[currentIndex() - 1];
    if (target) goTo(target.value);
  }

  return { stepperName, steps, variant, currentValue, currentIndex, stateFor, isCurrent, stepNumber, goTo, next, previous };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('stepper', 'stepper');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const stepper = { name, root, create, registerVariants, template, styles };
export default stepper;
