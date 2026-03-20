import type { Signal } from '@basenative/runtime';

// Button
export function buttonVariants(variant?: string, size?: string): string;
export function renderButton(content: string, options?: {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  disabled?: boolean;
  type?: string;
  attrs?: string;
}): string;

// Input
export function renderInput(options?: {
  name: string;
  type?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  error?: string;
  id?: string;
}): string;

// Textarea
export function renderTextarea(options?: {
  name: string;
  label?: string;
  placeholder?: string;
  value?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  error?: string;
  id?: string;
}): string;

// Checkbox
export function renderCheckbox(options?: {
  name: string;
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  value?: string;
  id?: string;
}): string;

// Radio
export function renderRadioGroup(options?: {
  name: string;
  label?: string;
  items?: Array<string | { value: string; label: string; disabled?: boolean }>;
  selected?: string;
  disabled?: boolean;
}): string;

// Toggle
export function renderToggle(options?: {
  name: string;
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  id?: string;
}): string;

// Select
export function renderSelect(options?: {
  name: string;
  label?: string;
  items?: Array<string | { value: string; label: string; disabled?: boolean }>;
  selected?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  id?: string;
}): string;

// Alert
export function renderAlert(content: string, options?: {
  variant?: 'info' | 'success' | 'warning' | 'error';
  dismissible?: boolean;
}): string;

// Toast
export interface Toaster {
  position: string;
  duration: number;
  toasts: Signal<Array<{ id: number; message: string; variant: string; duration: number }>>;
}
export function createToaster(options?: { position?: string; duration?: number }): Toaster;
export function showToast(toaster: Toaster, options?: { message?: string; variant?: string; duration?: number }): number;
export function dismissToast(toaster: Toaster, id: number): void;
export function renderToastContainer(position?: string): string;

// Table
export function renderTable(options?: {
  columns?: Array<{ key: string; label: string; sortable?: boolean }>;
  rows?: Array<Record<string, unknown>>;
  emptyMessage?: string;
  caption?: string;
}): string;

// Pagination
export function renderPagination(options?: {
  currentPage?: number;
  totalPages?: number;
  baseUrl?: string;
  window?: number;
}): string;

// Badge
export function renderBadge(content: string, options?: {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}): string;

// Card
export function renderCard(options?: {
  header?: string;
  body?: string;
  footer?: string;
  variant?: string;
}): string;

// Progress & Spinner
export function renderProgress(options?: { value?: number; max?: number; label?: string }): string;
export function renderSpinner(options?: { size?: string; label?: string }): string;

// Skeleton
export function renderSkeleton(options?: {
  width?: string;
  height?: string;
  variant?: 'text' | 'circle';
  count?: number;
}): string;
