import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createField } from './field.js';
import { createForm } from './form.js';
import { createWizard } from './wizard.js';
import { required, min } from './validators.js';

describe('createWizard', () => {
  function makeTestWizard() {
    const step1Form = createForm({
      name: createField('', { validators: [required('Name is required')] }),
      email: createField('', { validators: [required('Email is required')] }),
    });

    const step2Form = createForm({
      salary: createField(0, { validators: [min(1, 'Salary required')] }),
      filingStatus: createField('single'),
    });

    const step3Form = createForm({
      confirm: createField(false),
    });

    return createWizard([
      { name: 'personal', form: step1Form, title: 'Personal Info' },
      { name: 'income', form: step2Form, title: 'Income Details' },
      { name: 'review', form: step3Form, title: 'Review' },
    ]);
  }

  it('starts at step 0', () => {
    const w = makeTestWizard();
    assert.equal(w.currentIndex(), 0);
    assert.equal(w.isFirst(), true);
    assert.equal(w.isLast(), false);
    assert.equal(w.stepCount, 3);
  });

  it('tracks progress percentage', () => {
    const w = makeTestWizard();
    assert.ok(Math.abs(w.progress() - 33.33) < 1);
  });

  it('blocks next() when current step is invalid and validateBeforeNext is true', () => {
    const w = makeTestWizard();
    assert.equal(w.next(), false);
    assert.equal(w.currentIndex(), 0);
  });

  it('advances on next() when step is valid', () => {
    const w = makeTestWizard();
    w.steps[0].form.fields.name.setValue('Warren');
    w.steps[0].form.fields.email.setValue('warren@test.com');
    assert.equal(w.next(), true);
    assert.equal(w.currentIndex(), 1);
  });

  it('goes back on prev()', () => {
    const w = makeTestWizard();
    w.steps[0].form.fields.name.setValue('Warren');
    w.steps[0].form.fields.email.setValue('warren@test.com');
    w.next();
    assert.equal(w.currentIndex(), 1);
    assert.equal(w.prev(), true);
    assert.equal(w.currentIndex(), 0);
  });

  it('prev() returns false at first step', () => {
    const w = makeTestWizard();
    assert.equal(w.prev(), false);
  });

  it('next() returns false at last step', () => {
    const w = makeTestWizard();
    // Fill all steps
    w.steps[0].form.fields.name.setValue('Warren');
    w.steps[0].form.fields.email.setValue('warren@test.com');
    w.next();
    w.steps[1].form.fields.salary.setValue(100000);
    w.next();
    assert.equal(w.isLast(), true);
    assert.equal(w.next(), false);
  });

  it('getValues() collects all step values', () => {
    const w = makeTestWizard();
    w.steps[0].form.fields.name.setValue('Warren');
    w.steps[0].form.fields.email.setValue('warren@test.com');
    w.steps[1].form.fields.salary.setValue(150000);

    const values = w.getValues();
    assert.deepEqual(values.personal, { name: 'Warren', email: 'warren@test.com' });
    assert.deepEqual(values.income, { salary: 150000, filingStatus: 'single' });
  });

  it('reset() returns to step 0 and resets all forms', () => {
    const w = makeTestWizard();
    w.steps[0].form.fields.name.setValue('Warren');
    w.steps[0].form.fields.email.setValue('warren@test.com');
    w.next();
    w.reset();
    assert.equal(w.currentIndex(), 0);
    assert.equal(w.steps[0].form.fields.name.value(), '');
  });

  it('complete() fails and jumps to first invalid step', async () => {
    const w = makeTestWizard();
    w.steps[0].form.fields.name.setValue('Warren');
    w.steps[0].form.fields.email.setValue('warren@test.com');
    // Step 2 salary still 0 (invalid)
    const result = await w.complete();
    assert.equal(result.ok, false);
    assert.equal(w.currentIndex(), 1); // Jumped to income step
  });

  it('complete() succeeds when all steps valid', async () => {
    const w = makeTestWizard();
    w.steps[0].form.fields.name.setValue('Warren');
    w.steps[0].form.fields.email.setValue('warren@test.com');
    w.steps[1].form.fields.salary.setValue(150000);

    const result = await w.complete();
    assert.equal(result.ok, true);
    assert.deepEqual(result.data.personal.name, 'Warren');
  });

  it('complete() calls onComplete handler', async () => {
    let received = null;
    const step1 = createForm({ name: createField('Test') });
    const w = createWizard(
      [{ name: 'info', form: step1 }],
      { onComplete: (values) => { received = values; return 'done'; } }
    );

    const result = await w.complete();
    assert.equal(result.ok, true);
    assert.equal(result.data, 'done');
    assert.deepEqual(received.info, { name: 'Test' });
  });

  it('visited tracks which steps have been seen', () => {
    const w = makeTestWizard();
    assert.equal(w.visited().has(0), true);
    assert.equal(w.visited().has(1), false);

    w.steps[0].form.fields.name.setValue('Warren');
    w.steps[0].form.fields.email.setValue('warren@test.com');
    w.next();
    assert.equal(w.visited().has(1), true);
  });
});
