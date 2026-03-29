import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupErrorHandlers, reportError } from '../../../src/core/error.js';
import { on, off } from '../../../src/core/events.js';

describe('error', () => {
  describe('reportError()', () => {
    it('emits error:reported event with context and error', () => {
      const handler = vi.fn();
      on('error:reported', handler);

      const err = new Error('test error');
      reportError('marks:editor', err);

      expect(handler).toHaveBeenCalledWith({ context: 'marks:editor', error: err });
      off('error:reported', handler);
    });

    it('logs to console.error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      reportError('dataset:verify', new Error('hash mismatch'));
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('setupErrorHandlers()', () => {
    let fatalEvents = [];
    let fatalHandler;

    beforeEach(() => {
      fatalEvents = [];
      fatalHandler = (data) => fatalEvents.push(data);
      on('error:fatal', fatalHandler);
      // Suppress console.error output in these tests
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      off('error:fatal', fatalHandler);
      vi.restoreAllMocks();
    });

    it('emits error:fatal on unhandledrejection', () => {
      setupErrorHandlers();
      const reason = new Error('rejected');
      // Use a dummy resolved promise to avoid creating a real unhandled rejection
      const event = new PromiseRejectionEvent('unhandledrejection', {
        reason,
        promise: Promise.resolve(),
      });
      window.dispatchEvent(event);
      expect(fatalEvents.length).toBeGreaterThan(0);
      expect(fatalEvents[0]).toMatchObject({ message: expect.any(String) });
    });
  });
});
