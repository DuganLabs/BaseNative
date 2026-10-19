/**
 * Field — the form-field unit as a public component: label, control, help
 * text and error, composed as one piece of markup.
 *
 * Until now this composition lived only in internal/field.js, where
 * renderInput, renderTextarea and renderSelect used it for their own
 * markup. Every other consumer had to rebuild it: GreenPut's platform grew
 * a client-side field() wrapper, its tenant site a server-side one, and
 * t4bs a CSS-only [data-bn-region="field"] layer — three copies of the same
 * unit, none of them able to share fixes with the others. This module is
 * the one public version.
 *
 * Two levels, deliberately:
 *
 *   renderField({ id, label, control, helpText, error })
 *     The shell. `control` is already-rendered control markup (an HTML
 *     slot); the shell adds the <label for>, the help span (`<id>-help`)
 *     and the error span (`<id>-error`, role="alert") around it. This is
 *     the same function the built-in controls compose — re-exported, not
 *     reimplemented, so the markup contract cannot drift.
 *
 *   renderFormField({ control: 'input' | 'textarea' | 'select' |
 *                     'checkbox' | 'radio' | 'toggle', ...controlOptions })
 *     The composer. Names a built-in control and forwards every other
 *     option to its renderer, so a whole field is one call:
 *
 *       renderFormField({ control: 'input', name: 'email', label: 'Email',
 *                         type: 'email', helpText: 'We never share it.' })
 *
 *     input / textarea / select accept label, helpText and error natively
 *     and wire aria-describedby themselves. checkbox / radio / toggle
 *     carry their label inline and have no help/error channel, so when
 *     helpText or error is given the composer wraps their markup in the
 *     shell (without a second label) and the help/error spans render
 *     inside the same [data-bn="field"] container.
 *
 *     A pre-rendered control can be composed instead of a named one:
 *     renderFormField({ controlHtml, name, label, helpText, error })
 *     renders controlHtml inside the shell. `name` (or `id`) supplies the
 *     field id the label and the help/error ids derive from.
 */
import { renderInput } from './input.js';
import { renderTextarea } from './textarea.js';
import { renderSelect } from './select.js';
import { renderCheckbox } from './checkbox.js';
import { renderRadioGroup } from './radio.js';
import { renderToggle } from './toggle.js';
import { renderField as renderFieldShell } from './internal/field.js';

export { renderField } from './internal/field.js';

/**
 * Compose one form field from a named built-in control (or pre-rendered
 * control markup) plus the shared field options.
 *
 * Every option other than `control` / `controlHtml` is forwarded to the
 * control's own renderer, so control-specific options (type, items,
 * rows, checked, selected, …) behave exactly as documented there. label,
 * helpText and error are escaped by the renderers that consume them.
 *
 * @param {object} options
 * @param {'input'|'textarea'|'select'|'checkbox'|'radio'|'toggle'} [options.control='input']
 *   Which built-in control to render; ignored when controlHtml is given
 * @param {string} [options.controlHtml]  Pre-rendered control markup (HTML slot: not escaped);
 *   when present it is wrapped in the field shell instead of rendering a named control
 * @param {string} options.name     Field name; also the default field id
 * @param {string} [options.id]     Field id; defaults to name
 * @param {string} [options.label]  Escaped text (the group legend for radio)
 * @param {string} [options.helpText]  Escaped text
 * @param {string} [options.error]     Escaped text
 * @returns {string}
 */
export function renderFormField(options = {}) {
  const { control = 'input', controlHtml, helpText = '', error = '', ...rest } = options;
  const id = options.id || options.name;

  if (controlHtml != null) {
    return renderFieldShell({ id, label: options.label, control: controlHtml, helpText, error });
  }

  switch (control) {
    case 'input':
      return renderInput({ ...rest, helpText, error });
    case 'textarea':
      return renderTextarea({ ...rest, helpText, error });
    case 'select':
      return renderSelect({ ...rest, helpText, error });
    case 'checkbox':
    case 'toggle': {
      const render = control === 'checkbox' ? renderCheckbox : renderToggle;
      const markup = render(rest);
      if (!helpText && !error) return markup;
      return renderFieldShell({ id, control: markup, helpText, error });
    }
    case 'radio': {
      const markup = renderRadioGroup(rest);
      if (!helpText && !error) return markup;
      return renderFieldShell({ id, control: markup, helpText, error });
    }
    default:
      throw new TypeError(
        `renderFormField: unknown control "${control}" — expected 'input', 'textarea', ` +
          `'select', 'checkbox', 'radio' or 'toggle', or pass controlHtml with pre-rendered markup.`,
      );
  }
}
