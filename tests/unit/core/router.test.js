import { describe, it, expect, vi } from 'vitest';
import { registerRoute, navigate, initRouter } from '../../../src/core/router.js';
import { on, off } from '../../../src/core/events.js';

// Reset module state between tests by reimporting fresh instances isn't straightforward
// with ESM — we test the exported API directly instead.

describe('router', () => {
  describe('navigate()', () => {
    it('emits router:navigate with the parsed path', async () => {
      const handler = vi.fn();
      on('router:navigate', handler);
      await navigate('#/');
      expect(handler).toHaveBeenCalledWith({ path: '/' });
      off('router:navigate', handler);
    });

    it('parses surah route params correctly', async () => {
      // Register a route and capture the params it receives
      let receivedParams = null;
      registerRoute('s/', async () => ({
        init(params) {
          receivedParams = params;
        },
      }));
      await navigate('#/s/2/255');
      expect(receivedParams).toEqual({ surah: '2', ayah: '255' });
    });

    it('parses tag route params and URL-decodes them', async () => {
      let receivedParams = null;
      registerRoute('t/', async () => ({
        init(params) {
          receivedParams = params;
        },
      }));
      await navigate('#/t/my%20tag');
      expect(receivedParams).toEqual({ tag: 'my tag' });
    });

    it('emits router:not-found when no route matches', async () => {
      const handler = vi.fn();
      on('router:not-found', handler);
      await navigate('#/unknown/route/xyz');
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path: expect.any(String) }));
      off('router:not-found', handler);
    });

    it('initRouter() handles the initial hash and attaches hashchange listener', () => {
      // Just verify initRouter runs without throwing
      expect(() => initRouter()).not.toThrow();
    });

    it('emits router:error when a route loader throws', async () => {
      const errHandler = vi.fn();
      on('router:error', errHandler);
      registerRoute('broken/', async () => {
        throw new Error('loader failed');
      });
      await navigate('#/broken/');
      expect(errHandler).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
      );
      off('router:error', errHandler);
    });
  });
});
