export interface DatepickerOptions {
  name?: string;
  label?: string;
  value?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  attrs?: string;
}

export interface CalendarDay {
  day: number;
  date: string;
}

export interface CalendarMonth {
  year: number;
  month: number;
  monthName: string;
  weeks: (CalendarDay | null)[][];
  daysInMonth: number;
}

export interface TimepickerOptions {
  name?: string;
  label?: string;
  value?: string;
  min?: string;
  max?: string;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  attrs?: string;
}

export interface DateRangeOptions {
  nameStart?: string;
  nameEnd?: string;
  label?: string;
  valueStart?: string;
  valueEnd?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  attrs?: string;
}

export function renderDatepicker(options?: DatepickerOptions): string;
export function generateCalendarMonth(year: number, month: number): CalendarMonth;
export function renderTimepicker(options?: TimepickerOptions): string;
export function renderDateRange(options?: DateRangeOptions): string;
