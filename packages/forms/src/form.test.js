import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createField } from './field.js';
import { createForm, zodAdapter } from './form.js';
import { required } from './validators.js';

describe('createForm', () => {
  function makeForm() {
    return createForm({
      name: createField('', { validators: [required()] }),
      email: createField('', { validators: [required()] }),
    });
  }

  it('tracks combined validity', () => {
    const form = makeForm();
    assert.equal(form.valid(), false);

    form.fields.name.setValue('John');
    form.fields.email.setValue('john@example.com');
    assert.equal(form.valid(), true);
  });

  it('collects values from all fields', () => {
    const form = makeForm();
    form.fields.name.setValue('Jane');
    form.fields.email.setValue('jane@test.com');
    assert.deepEqual(form.values(), { name: 'Jane', email: 'jane@test.com' });
  });

  it('collects errors by field name', () => {
    const form = makeForm();
    const errs = form.errors();
    assert.ok(errs.name);
    assert.ok(errs.email);
  });

  it('tracks dirty and touched state', () => {
    const form = makeForm();
    assert.equal(form.dirty(), false);
    assert.equal(form.touched(), false);

    form.fields.name.setValue('x');
    assert.equal(form.dirty(), true);

    form.touchAll();
    assert.equal(form.touched(), true);
  });

  it('resets all fields', () => {
    const form = makeForm();
    form.fields.name.setValue('John');
    form.fields.email.setValue('john@test.com');
    form.touchAll();

    form.reset();
    assert.equal(form.fields.name.value(), '');
    assert.equal(form.fields.email.value(), '');
    assert.equal(form.dirty(), false);
    assert.equal(form.touched(), false);
  });

  it('submits with valid data', async () => {
    let submitted = null;
    const form = createForm(
      {
        name: createField('John', { validators: [required()] }),
      },
      {
        onSubmit: (values) => { submitted = values; return 'ok'; },
      },
    );

    const result = await form.submit();
    assert.equal(result.ok, true);
    assert.deepEqual(submitted, { name: 'John' });
  });

  it('blocks submit on invalid form', async () => {
    const form = createForm(
      { name: createField('', { validators: [required()] }) },
      { onSubmit: () => 'should not reach' },
    );

    const result = await form.submit();
    assert.equal(result.ok, false);
    assert.ok(result.errors.name);
  });

  it('handles server-side errors', () => {
    const form = makeForm();
    form.fields.name.setValue('taken-name');
    form.fields.email.setValue('a@b.com');

    form.setServerErrors({
      name: [{ code: 'taken', message: 'Name already taken' }],
    });

    assert.equal(form.valid(), false);
    assert.equal(form.fields.name.valid(), false);
  });

  it('invalid computed is inverse of valid', () => {
    const form = makeForm();
    assert.equal(form.invalid(), true);
    form.fields.name.setValue('John');
    form.fields.email.setValue('j@test.com');
    assert.equal(form.invalid(), false);
  });

  it('getValues returns same as values()', () => {
    const form = makeForm();
    form.fields.name.setValue('Val');
    form.fields.email.setValue('val@test.com');
    assert.deepEqual(form.getValues(), form.values());
  });

  it('submit returns ok:false with error when onSubmit throws', async () => {
    const form = createForm(
      { name: createField('John', { validators: [required()] }) },
      { onSubmit: () => { throw new Error('server down'); } }
    );
    const result = await form.submit();
    assert.equal(result.ok, false);
    assert.ok(result.error instanceof Error);
  });

  it('submit returns values when no onSubmit provided', async () => {
    const form = createForm({ name: createField('Alice', { validators: [required()] }) });
    const result = await form.submit();
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { name: 'Alice' });
  });

  it('schema option adds cross-field validation errors', () => {
    const schema = (values) => {
      if (values.name === values.email) {
        return { name: [{ code: 'same', message: 'Name and email must differ' }] };
      }
      return {};
    };
    const form = createForm(
      {
        name: createField('same@test.com'),
        email: createField('same@test.com'),
      },
      { schema }
    );
    const errs = form.errors();
    assert.ok(errs.name);
  });

  it('touchAll marks all fields as touched', () => {
    const form = makeForm();
    form.touchAll();
    for (const field of Object.values(form.fields)) {
      assert.equal(field.touched(), true);
    }
  });
});

describe('zodAdapter', () => {
  it('returns empty object when schema passes', () => {
    const mockSchema = {
      safeParse: () => ({ success: true }),
    };
    const validate = zodAdapter(mockSchema);
    assert.deepEqual(validate({ name: 'John' }), {});
  });

  it('maps Zod issues to field error paths', () => {
    const mockSchema = {
      safeParse: () => ({
        success: false,
        error: {
          issues: [
            { path: ['name'], code: 'too_small', message: 'Too short' },
            { path: ['email'], code: 'invalid_string', message: 'Invalid email' },
          ],
        },
      }),
    };
    const validate = zodAdapter(mockSchema);
    const result = validate({});
    assert.ok(result.name);
    assert.ok(result.email);
    assert.equal(result.name[0].message, 'Too short');
  });
});
