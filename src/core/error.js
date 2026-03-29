/**
 * Global error handling.
 *
 * Registers window-level error handlers and exposes reportError() for
 * module-level error reporting. All errors are logged and emitted on the
 * event bus so the UI layer can show recovery messages.
 *
 * No external reporting — no analytics (X-11 out of scope).
 */

import { emit } from './events.js';

/**
 * Register global uncaught error and unhandled rejection handlers.
 * Call once from app.js before any other module initialises.
 */
export function setupErrorHandlers() {
  window.addEventListener('error', (event) => {
    const { message, filename, lineno, colno, error } = event;
    console.error('[QuranAtlas] Uncaught error:', { message, filename, lineno, colno, error });
    emit('error:fatal', { message, error });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    console.error('[QuranAtlas] Unhandled rejection:', reason);
    emit('error:fatal', { message: String(reason), error: reason });
  });
}

/**
 * Report a caught error from a specific module context.
 * Use this instead of bare console.error throughout the codebase.
 *
 * @param {string} context - e.g. 'marks:editor', 'dataset:verify'
 * @param {Error | unknown} error
 */
export function reportError(context, error) {
  console.error(`[QuranAtlas:${context}]`, error);
  emit('error:reported', { context, error });
}
