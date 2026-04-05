import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderDatepicker, generateCalendarMonth } from './datepicker.js';
import { renderTimepicker } from './timepicker.js';
import { renderDateRange } from './daterange.js';

// ---- renderDatepicker ----

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

  it('omits min and max attributes when not provided', () => {
    const html = renderDatepicker({ name: 'date' });
    assert.ok(!html.includes('min='));
    assert.ok(!html.includes('max='));
  });

  it('includes required attribute when required=true', () => {
    const html = renderDatepicker({ name: 'date', required: true });
    assert.ok(html.includes(' required'));
  });

  it('does not include required attribute by default', () => {
    const html = renderDatepicker({ name: 'date' });
    assert.ok(!html.includes(' required'));
  });

  it('includes disabled attribute when disabled=true', () => {
    const html = renderDatepicker({ name: 'date', disabled: true });
    assert.ok(html.includes(' disabled'));
  });

  it('does not include disabled attribute by default', () => {
    const html = renderDatepicker({ name: 'date' });
    assert.ok(!html.includes(' disabled'));
  });

  it('sets value attribute when value is provided', () => {
    const html = renderDatepicker({ name: 'date', value: '2024-06-15' });
    assert.ok(html.includes('value="2024-06-15"'));
  });

  it('uses provided id for label and input association', () => {
    const html = renderDatepicker({ name: 'date', label: 'Pick', id: 'my-date' });
    assert.ok(html.includes('for="my-date"'));
    assert.ok(html.includes('id="my-date"'));
  });

  it('omits label element when label not provided', () => {
    const html = renderDatepicker({ name: 'date' });
    assert.ok(!html.includes('<label'));
  });

  it('includes data-bn attributes for markup hooks', () => {
    const html = renderDatepicker({ name: 'date' });
    assert.ok(html.includes('data-bn="datepicker"'));
    assert.ok(html.includes('data-bn="datepicker-input"'));
  });

  it('passes through custom attrs string', () => {
    const html = renderDatepicker({ name: 'date', attrs: 'data-custom="yes"' });
    assert.ok(html.includes('data-custom="yes"'));
  });
});

// ---- generateCalendarMonth ----

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

  it('returns the correct year and month in result', () => {
    const cal = generateCalendarMonth(2023, 5); // June 2023
    assert.equal(cal.year, 2023);
    assert.equal(cal.month, 5);
  });

  it('pads day and month numbers in date strings', () => {
    const cal = generateCalendarMonth(2024, 0); // January
    const days = cal.weeks.flat().filter(Boolean);
    // day 9 should be 2024-01-09
    const day9 = days.find(d => d.day === 9);
    assert.equal(day9.date, '2024-01-09');
  });

  it('first week starts with null padding before first day of month', () => {
    // January 2024 starts on Monday (index 1)
    const cal = generateCalendarMonth(2024, 0);
    const firstWeek = cal.weeks[0];
    // The first null-count equals the day-of-week of the 1st
    const nullCount = firstWeek.indexOf(firstWeek.find(Boolean));
    const firstDayDow = new Date(2024, 0, 1).getDay();
    assert.equal(nullCount, firstDayDow);
  });

  it('last week is padded with nulls to fill 7 cells', () => {
    const cal = generateCalendarMonth(2024, 0);
    const lastWeek = cal.weeks[cal.weeks.length - 1];
    assert.equal(lastWeek.length, 7);
  });

  it('handles February in a leap year correctly', () => {
    const cal = generateCalendarMonth(2024, 1); // February 2024 (leap)
    assert.equal(cal.daysInMonth, 29);
    const allDays = cal.weeks.flat().filter(Boolean);
    assert.equal(allDays.length, 29);
    assert.equal(allDays[allDays.length - 1].date, '2024-02-29');
  });

  it('handles February in a non-leap year correctly', () => {
    const cal = generateCalendarMonth(2023, 1); // February 2023 (non-leap)
    assert.equal(cal.daysInMonth, 28);
  });

  it('every week has exactly 7 cells', () => {
    const cal = generateCalendarMonth(2024, 2); // March 2024
    for (const week of cal.weeks) {
      assert.equal(week.length, 7);
    }
  });
});

// ---- renderTimepicker ----

describe('renderTimepicker', () => {
  it('renders a time input', () => {
    const html = renderTimepicker({ name: 'start_time', label: 'Start Time' });
    assert.ok(html.includes('type="time"'));
    assert.ok(html.includes('name="start_time"'));
  });

  it('includes label when provided', () => {
    const html = renderTimepicker({ name: 'appt', label: 'Appointment' });
    assert.ok(html.includes('Appointment'));
    assert.ok(html.includes('<label'));
  });

  it('omits label element when label not provided', () => {
    const html = renderTimepicker({ name: 'appt' });
    assert.ok(!html.includes('<label'));
  });

  it('includes min and max when provided', () => {
    const html = renderTimepicker({ name: 't', min: '08:00', max: '18:00' });
    assert.ok(html.includes('min="08:00"'));
    assert.ok(html.includes('max="18:00"'));
  });

  it('includes step when provided', () => {
    const html = renderTimepicker({ name: 't', step: '900' });
    assert.ok(html.includes('step="900"'));
  });

  it('omits step when not provided', () => {
    const html = renderTimepicker({ name: 't' });
    assert.ok(!html.includes('step='));
  });

  it('includes required attribute when required=true', () => {
    const html = renderTimepicker({ name: 't', required: true });
    assert.ok(html.includes(' required'));
  });

  it('includes disabled attribute when disabled=true', () => {
    const html = renderTimepicker({ name: 't', disabled: true });
    assert.ok(html.includes(' disabled'));
  });

  it('includes data-bn attributes for markup hooks', () => {
    const html = renderTimepicker({ name: 't' });
    assert.ok(html.includes('data-bn="timepicker"'));
    assert.ok(html.includes('data-bn="timepicker-input"'));
  });

  it('uses provided id for label and input association', () => {
    const html = renderTimepicker({ name: 't', label: 'Time', id: 'my-time' });
    assert.ok(html.includes('for="my-time"'));
    assert.ok(html.includes('id="my-time"'));
  });
});

// ---- renderDateRange ----

describe('renderDateRange', () => {
  it('renders start and end date inputs', () => {
    const html = renderDateRange({ label: 'Date Range' });
    assert.ok(html.includes('name="start_date"'));
    assert.ok(html.includes('name="end_date"'));
    assert.ok(html.includes('Date Range'));
  });

  it('uses custom nameStart and nameEnd when provided', () => {
    const html = renderDateRange({ nameStart: 'from', nameEnd: 'to' });
    assert.ok(html.includes('name="from"'));
    assert.ok(html.includes('name="to"'));
  });

  it('sets valueStart and valueEnd when provided', () => {
    const html = renderDateRange({ valueStart: '2024-01-01', valueEnd: '2024-12-31' });
    assert.ok(html.includes('value="2024-01-01"'));
    assert.ok(html.includes('value="2024-12-31"'));
  });

  it('includes min and max on both inputs', () => {
    const html = renderDateRange({ min: '2024-01-01', max: '2024-12-31' });
    // Both inputs should have min/max — count occurrences
    const minCount = (html.match(/min="2024-01-01"/g) || []).length;
    const maxCount = (html.match(/max="2024-12-31"/g) || []).length;
    assert.equal(minCount, 2);
    assert.equal(maxCount, 2);
  });

  it('includes required on both inputs when required=true', () => {
    const html = renderDateRange({ required: true });
    const reqCount = (html.match(/ required/g) || []).length;
    assert.equal(reqCount, 2);
  });

  it('includes disabled on both inputs when disabled=true', () => {
    const html = renderDateRange({ disabled: true });
    const disCount = (html.match(/ disabled/g) || []).length;
    assert.equal(disCount, 2);
  });

  it('renders a fieldset with data-bn="daterange"', () => {
    const html = renderDateRange({});
    assert.ok(html.includes('<fieldset data-bn="daterange"'));
  });

  it('renders legend element when label provided', () => {
    const html = renderDateRange({ label: 'Travel Dates' });
    assert.ok(html.includes('<legend'));
    assert.ok(html.includes('Travel Dates'));
  });

  it('omits legend when label not provided', () => {
    const html = renderDateRange({});
    assert.ok(!html.includes('<legend'));
  });

  it('renders separator element between inputs', () => {
    const html = renderDateRange({});
    assert.ok(html.includes('data-bn="daterange-separator"'));
  });
});

describe('renderDatepicker — additional', () => {
  it('renders with no options (all defaults)', () => {
    const html = renderDatepicker({});
    assert.ok(html.includes('type="date"'));
    assert.ok(html.includes('data-bn="datepicker"'));
  });

  it('omits min attribute when not provided', () => {
    const html = renderDatepicker({ name: 'date' });
    assert.ok(!html.includes('min='));
  });

  it('omits max attribute when not provided', () => {
    const html = renderDatepicker({ name: 'date' });
    assert.ok(!html.includes('max='));
  });

  it('id attribute links label to input', () => {
    const html = renderDatepicker({ name: 'dob', label: 'DOB', id: 'my-id' });
    assert.ok(html.includes('for="my-id"'));
    assert.ok(html.includes('id="my-id"'));
  });

  it('passes through custom attrs string', () => {
    const html = renderDatepicker({ name: 'date', attrs: 'data-custom="yes"' });
    assert.ok(html.includes('data-custom="yes"'));
  });

  it('value is empty string by default', () => {
    const html = renderDatepicker({ name: 'date' });
    assert.ok(html.includes('value=""'));
  });
});

describe('renderTimepicker — additional', () => {
  it('renders with no options (all defaults)', () => {
    const html = renderTimepicker({});
    assert.ok(html.includes('type="time"'));
    assert.ok(html.includes('data-bn="timepicker"'));
  });

  it('passes through custom attrs string', () => {
    const html = renderTimepicker({ name: 'appt', attrs: 'data-time="yes"' });
    assert.ok(html.includes('data-time="yes"'));
  });

  it('id attribute links label to input', () => {
    const html = renderTimepicker({ name: 'appt', label: 'Appt', id: 'appt-id' });
    assert.ok(html.includes('for="appt-id"'));
    assert.ok(html.includes('id="appt-id"'));
  });

  it('value defaults to empty string', () => {
    const html = renderTimepicker({ name: 'time' });
    assert.ok(html.includes('value=""'));
  });
});

describe('generateCalendarMonth — additional', () => {
  it('March 2024 starts on Friday (index 5)', () => {
    const cal = generateCalendarMonth(2024, 2); // month 2 = March
    assert.equal(cal.weeks[0].filter(d => d !== null).length, 2); // Mar 1 and 2
    assert.equal(cal.weeks[0][5].day, 1);
    assert.equal(cal.weeks[0][6].day, 2);
  });

  it('generates correct daysInMonth for months with 30 days', () => {
    const cal = generateCalendarMonth(2024, 3); // April = 30 days
    assert.equal(cal.daysInMonth, 30);
  });

  it('monthName is not empty', () => {
    const cal = generateCalendarMonth(2024, 0);
    assert.ok(typeof cal.monthName === 'string');
    assert.ok(cal.monthName.length > 0);
  });

  it('total day cells equals daysInMonth (non-null cells)', () => {
    const cal = generateCalendarMonth(2024, 5); // June
    const nonNull = cal.weeks.flatMap(w => w).filter(d => d !== null);
    assert.equal(nonNull.length, cal.daysInMonth);
  });
});
