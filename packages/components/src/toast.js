/**
 * Toast notification system — non-blocking popover-based notifications.
 * Uses the Popover API when available, falls back to positioned div.
 *
 * Client-side usage:
 *   import { createToaster, showToast } from '@basenative/components';
 *   const toaster = createToaster();
 *   showToast(toaster, { message: 'Saved!', variant: 'success' });
 */
import { signal } from '@basenative/runtime';

/**
 * Creates a toast container and manages the toast queue.
 */
export function createToaster(options = {}) {
  const position = options.position || 'top-right';
  const duration = options.duration || 5000;
  const toasts = signal([]);

  return { position, duration, toasts };
}

/**
 * Shows a toast notification.
 */
export function showToast(toaster, options = {}) {
  const toast = {
    id: Date.now() + Math.random(),
    message: options.message || '',
    variant: options.variant || 'info',
    duration: options.duration || toaster.duration,
  };

  toaster.toasts.set((prev) => [...prev, toast]);

  if (toast.duration > 0) {
    setTimeout(() => {
      dismissToast(toaster, toast.id);
    }, toast.duration);
  }

  return toast.id;
}

/**
 * Dismisses a toast by ID.
 */
export function dismissToast(toaster, id) {
  toaster.toasts.set((prev) => prev.filter((t) => t.id !== id));
}

/**
 * Server-side render helper for toast container.
 */
export function renderToastContainer(position = 'top-right') {
  return `<div data-bn="toast-container" data-position="${position}" role="region" aria-live="polite" aria-label="Notifications"></div>`;
}
