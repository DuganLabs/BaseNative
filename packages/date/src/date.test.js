import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderDatepicker, generateCalendarMonth } from './datepicker.js';
import { renderTimepicker } from './timepicker.js';
import { renderDateRange } from './daterange.js';

describe('renderDatepicker', () => {
  it('renders a date input', () => {
    const html = renderDatepicker({ name: 'birthday', label: 'Birthday' });
    assert.ok(html.includes('type="date"'));
    assert.ok(html.includes('name="birthday"'));
    assert.ok(html.includes('Birthday'));
  });

  it('supports min/max constraints', () => {
    const html = renderDatepicker({ name: 'date', min: '2024-01-01', max: '2024-12-31' });
    assert.ok(html.includes('min="2024-01-01"'));
    assert.ok(html.includes('max="2024-12-31"'));
  });
});

describe('generateCalendarMonth', () => {
  it('generates correct month data', () => {
    const cal = generateCalendarMonth(2024, 0); // January 2024
    assert.equal(cal.monthName, 'January');
    assert.equal(cal.daysInMonth, 31);
    assert.ok(cal.weeks.length >= 4);
    assert.ok(cal.weeks.length <= 6);
  });

  it('formats dates correctly', () => {
    const cal = generateCalendarMonth(2024, 0);
    const firstDay = cal.weeks.flat().find(d => d !== null);
    assert.equal(firstDay.date, '2024-01-01');
  });
});

describe('renderTimepicker', () => {
  it('renders a time input', () => {
    const html = renderTimepicker({ name: 'start_time', label: 'Start Time' });
    assert.ok(html.includes('type="time"'));
    assert.ok(html.includes('name="start_time"'));
  });
});

describe('renderDateRange', () => {
  it('renders start and end date inputs', () => {
    const html = renderDateRange({ label: 'Date Range' });
    assert.ok(html.includes('name="start_date"'));
    assert.ok(html.includes('name="end_date"'));
    assert.ok(html.includes('Date Range'));
  });
});
