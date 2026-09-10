# @basenative/forms API

## `createField(initial, options?)`

Creates a reactive form field.

```js
import { createField, required, email } from '@basenative/forms';

const emailField = createField('', {
  validators: [required(), email()],
  transform: (v) => v.trim().toLowerCase(),
});
```

### Field Properties

| Property | Type | Description |
|----------|------|-------------|
| `value` | `Signal` | Current field value |
| `touched` | `Signal<boolean>` | Whether field has been interacted with |
| `dirty` | `Signal<boolean>` | Whether value has changed from initial |
| `errors` | `Signal<Error[]>` | Current validation errors |
| `valid` | `Signal<boolean>` | Whether field passes all validation |
| `invalid` | `Signal<boolean>` | Inverse of valid |
| `firstError` | `Signal<Error\|null>` | First validation error or null |

### Field Methods

| Method | Description |
|--------|-------------|
| `setValue(value)` | Update field value (accepts updater fn) |
| `touch()` | Mark as touched |
| `reset(value?)` | Reset to initial (or provided) value |
| `setServerErrors(errors)` | Set server-side validation errors |

## `createForm(fields, options?)`

Groups fields into a form with combined state management.

```js
import { createForm } from '@basenative/forms';

const form = createForm({
  name: nameField,
  email: emailField,
}, {
  async onSubmit(values) {
    return fetch('/api', { method: 'POST', body: JSON.stringify(values) });
  },
});
```

### Form Properties

| Property | Type | Description |
|----------|------|-------------|
| `fields` | `Record<string, Field>` | Named fields |
| `values` | `Signal<Record>` | All field values |
| `errors` | `Signal<Record>` | All field errors by name |
| `valid` | `Signal<boolean>` | Whether all fields are valid |
| `dirty` | `Signal<boolean>` | Whether any field is dirty |
| `touched` | `Signal<boolean>` | Whether any field is touched |

### Form Methods

| Method | Description |
|--------|-------------|
| `submit()` | Touch all fields and run onSubmit if valid |
| `reset()` | Reset all fields |
| `touchAll()` | Mark all fields as touched |
| `getValues()` | Get current values snapshot |
| `setServerErrors(map)` | Set server errors by field name |

## Built-in Validators

| Validator | Description |
|-----------|-------------|
| `required(msg?)` | Value must not be empty |
| `minLength(n, msg?)` | String must be at least n characters |
| `maxLength(n, msg?)` | String must be at most n characters |
| `pattern(regex, msg?)` | Value must match pattern |
| `email(msg?)` | Must be valid email format |
| `min(n, msg?)` | Number must be >= n |
| `max(n, msg?)` | Number must be <= n |
| `custom(fn)` | Custom validator function |

## `createWizard(steps, options?)`

Coordinates multiple pre-built `Form` instances as a linear multi-step wizard.

```js
import { createForm, createWizard } from '@basenative/forms';

const wizard = createWizard([
  { name: 'account', form: accountForm, title: 'Account' },
  { name: 'profile', form: profileForm, title: 'Profile' },
], {
  validateBeforeNext: true, // default
  async onComplete(values) {
    // values = { account: {...}, profile: {...} }
    return fetch('/api/signup', { method: 'POST', body: JSON.stringify(values) });
  },
});

wizard.next();   // advance if the current step's form is valid
wizard.prev();   // go back
wizard.goTo(1);  // jump to a step already visited (or the next unvisited one)
```

### Wizard Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentIndex` | `Signal<number>` | Index of the active step |
| `stepCount` | `number` | Total number of steps |
| `steps` | `Array` | The `steps` array passed in |
| `currentStep` | `Signal` | The active `{ name, form, title? }` entry |
| `currentForm` | `Signal<Form>` | The active step's form |
| `isFirst` / `isLast` | `Signal<boolean>` | Whether the active step is the first/last |
| `progress` | `Signal<number>` | Percentage complete (`0`–`100`) |
| `canNext` | `Signal<boolean>` | Whether the active step's form is currently valid |
| `visited` | `Signal<Set<number>>` | Indexes of steps visited so far |
| `allValid` | `Signal<boolean>` | Whether every step's form is valid |

### Wizard Methods

| Method | Description |
|--------|-------------|
| `next()` | Validates the current step (unless `validateBeforeNext: false`) and advances; returns `false` if invalid or already on the last step |
| `prev()` | Goes back one step; returns `false` if already on the first step |
| `goTo(index)` | Jumps to `index` if it has already been visited or is the next unvisited step; returns `false` otherwise |
| `getValues()` | Returns `{ [stepName]: values }` across all steps |
| `reset()` | Resets every step's form and returns to step 0 |
| `complete()` | Touches and validates every step in order; on the first invalid step, jumps to it and resolves `{ ok: false, errors, step }`. If all steps are valid, calls `options.onComplete(values)` (when provided) and resolves `{ ok: true, data }`, or `{ ok: false, error }` if `onComplete` throws |

## `zodAdapter(schema)`

Adapter for Zod schemas.

```js
import { z } from 'zod';
import { zodAdapter } from '@basenative/forms';

const schema = zodAdapter(z.object({
  name: z.string().min(1),
  email: z.string().email(),
}));

const form = createForm(fields, { schema });
```
