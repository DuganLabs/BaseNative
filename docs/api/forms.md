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
