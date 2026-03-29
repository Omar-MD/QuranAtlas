import { describe, it, expect, vi, beforeEach } from 'vitest';
import { on, off, emit, once } from '../../../src/core/events.js';

describe('events', () => {
  beforeEach(() => {
    // Handlers are module-level state — test isolation handled by off() calls
  });

  it('calls a registered handler when the event is emitted', () => {
    const handler = vi.fn();
    on('test:basic', handler);
    emit('test:basic', { value: 42 });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ value: 42 });
    off('test:basic', handler);
  });

  it('does not call a handler after it is removed', () => {
    const handler = vi.fn();
    on('test:off', handler);
    off('test:off', handler);
    emit('test:off', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls multiple handlers for the same event', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    on('test:multi', h1);
    on('test:multi', h2);
    emit('test:multi', 'payload');
    expect(h1).toHaveBeenCalledWith('payload');
    expect(h2).toHaveBeenCalledWith('payload');
    off('test:multi', h1);
    off('test:multi', h2);
  });

  it('does not throw when emitting an event with no handlers', () => {
    expect(() => emit('test:no-handlers')).not.toThrow();
  });

  it('once() fires exactly once then unsubscribes', () => {
    const handler = vi.fn();
    once('test:once', handler);
    emit('test:once');
    emit('test:once');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('emits with no data argument without error', () => {
    const handler = vi.fn();
    on('test:no-data', handler);
    emit('test:no-data');
    expect(handler).toHaveBeenCalledWith(undefined);
    off('test:no-data', handler);
  });
});
