import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createField } from './field.js';
import { createForm } from './form.js';
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
});
