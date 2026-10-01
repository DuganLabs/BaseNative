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
export function renderTimepicker(options?: TimepickerOptions): string;
export function renderDateRange(options?: DateRangeOptions): string;
