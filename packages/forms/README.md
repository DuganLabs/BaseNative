# @basenative/forms

> Signal-based form state management with validation and field tracking

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/forms
```

## Quick Start

```js
import { createForm, createField, required, email, minLength } from '@basenative/forms';

const form = createForm({
  fields: {
    email: createField('', { validators: [required(), email()] }),
    password: createField('', { validators: [required(), minLength(8)] }),
  },
});

// Read field state reactively
import { effect } from '@basenative/runtime';

effect(() => {
  console.log(form.fields.email.value());
  console.log(form.fields.email.errors());
  console.log(form.valid());
});

// Handle submission
form.fields.email.setValue('user@example.com');
form.fields.password.setValue('secret123');

if (form.valid()) {
  const data = form.values();
  await submitToApi(data);
}
```

## API

### `createField(initial, options?)`

Creates a reactive form field. Returns:

- `value` — Signal with the current field value.
- `touched` — Signal, true after the field has been blurred.
- `dirty` — Signal, true after the value has changed.
- `errors` — Computed signal with array of validation error messages.
- `valid` / `invalid` — Computed booleans.
- `firstError` — Computed signal with the first error message or `null`.
- `setValue(value)` — Updates the value and marks the field dirty.
- `touch()` — Marks the field as touched.
- `reset()` — Resets value, touched, dirty, and server errors to initial state.
- `setServerErrors(errors)` — Injects server-side validation errors.

#### Options

- `validators` — Array of validator functions (see built-in validators below).
- `transform` — Function applied to every new value before storing it.

### `createForm(options)`

Creates a form group from a map of fields. Returns:

- `fields` — The field map passed in.
- `valid` — Computed signal, true when all fields are valid.
- `values()` — Returns a plain object of current field values.
- `reset()` — Resets all fields.
- `touch()` — Marks all fields as touched.

### `zodAdapter(schema)`

Adapts a Zod schema for use as a form-level validator.

### Built-in Validators

- `required()` — Value must be non-empty.
- `minLength(n)` — String must be at least `n` characters.
- `maxLength(n)` — String must be at most `n` characters.
- `pattern(regex, message?)` — Value must match a regular expression.
- `email()` — Value must be a valid email address.
- `min(n)` — Numeric value must be at least `n`.
- `max(n)` — Numeric value must be at most `n`.
- `custom(fn)` — Runs `fn(value)` and uses its return value as the error message (return falsy for valid).

## License

MIT
