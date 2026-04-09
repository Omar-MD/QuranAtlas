import 'fake-indexeddb/auto'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { logger } from '../../../src/core/logger.js'

// Mock BroadcastChannel
class MockBroadcastChannel {
  constructor(name) {
    this.name = name
    this.onmessage = null
    this.postMessage = vi.fn()
    this.close = vi.fn()
    MockBroadcastChannel.instances.push(this)
  }
  static instances = []
  static reset() { MockBroadcastChannel.instances = [] }
}
globalThis.BroadcastChannel = MockBroadcastChannel

import { clear as clearEvents } from '../../../src/core/events.js'

let sync

beforeEach(() => {
  MockBroadcastChannel.reset()
  clearEvents()
  document.body.innerHTML = '<div id="app-shell"></div>'
})

afterEach(async () => {
  if (sync) {
    sync.destroy()
    sync.reset()
  }
})

describe('safety/sync.js', () => {
  beforeEach(async () => {
    sync = await import('../../../src/safety/sync.js')
    sync.reset()
    sync.init()
  })

  describe('broadcastMarkChange()', () => {
    it('posts message with correct payload on the channel', () => {
      sync.broadcastMarkChange(['2:255'])

      const channel = MockBroadcastChannel.instances[0]
      expect(channel.postMessage).toHaveBeenCalledWith({
        type: 'marks:changed',
        verseKeys: ['2:255'],
      })
    })

    it('posts message with multiple verseKeys for bulk operations', () => {
      sync.broadcastMarkChange(['2:255', '3:1', '3:2'])

      const channel = MockBroadcastChannel.instances[0]
      expect(channel.postMessage).toHaveBeenCalledWith({
        type: 'marks:changed',
        verseKeys: ['2:255', '3:1', '3:2'],
      })
    })
  })

  describe('onMarkChange()', () => {
    it('fires callback when incoming message received', () => {
      const callback = vi.fn()
      sync.onMarkChange(callback)

      // Simulate incoming BroadcastChannel message
      const channel = MockBroadcastChannel.instances[0]
      channel.onmessage({ data: { type: 'marks:changed', verseKeys: ['2:255'] } })

      expect(callback).toHaveBeenCalledWith({ verseKeys: ['2:255'] })
    })

    it('ignores messages with unknown type', () => {
      const callback = vi.fn()
      sync.onMarkChange(callback)

      const channel = MockBroadcastChannel.instances[0]
      channel.onmessage({ data: { type: 'unknown:event', verseKeys: ['2:255'] } })

      expect(callback).not.toHaveBeenCalled()
    })

    it('logs handler errors and still notifies remaining handlers and the event bus', async () => {
      const badHandler = vi.fn(() => {
        throw new Error('boom')
      })
      const goodHandler = vi.fn()
      const updateReceived = vi.fn()
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
      const { on } = await import('../../../src/core/events.js')

      sync.onMarkChange(badHandler)
      sync.onMarkChange(goodHandler)
      on('sync:update-received', updateReceived)

      const channel = MockBroadcastChannel.instances[0]
      channel.onmessage({ data: { type: 'marks:changed', verseKeys: ['2:255'] } })

      expect(goodHandler).toHaveBeenCalledWith({ verseKeys: ['2:255'] })
      expect(updateReceived).toHaveBeenCalledWith({ verseKeys: ['2:255'] })
      expect(errorSpy).toHaveBeenCalledWith('Sync handler error:', {
        error: expect.any(Error),
      })
    })
  })

  describe('DB version change banner', () => {
    it('renders a reload banner and blocks app interaction', async () => {
      const { emit } = await import('../../../src/core/events.js')

      emit('db:version-change')

      const backdrop = document.querySelector('.qa-sync-backdrop')
      const banner = document.querySelector('.qa-sync-banner')
      const reloadBtn = document.querySelector('.qa-sync-reload-btn')

      expect(backdrop).not.toBeNull()
      expect(banner).not.toBeNull()
      expect(reloadBtn).not.toBeNull()
      expect(document.getElementById('app-shell').style.pointerEvents).toBe('none')
    })

    it('does not render duplicate banners for repeated version change events', async () => {
      const { emit } = await import('../../../src/core/events.js')

      emit('db:version-change')
      emit('db:version-change')

      expect(document.querySelectorAll('.qa-sync-backdrop')).toHaveLength(1)
    })

    it('removeBanner restores app interaction state', async () => {
      const { emit } = await import('../../../src/core/events.js')

      emit('db:version-change')
      sync.removeBanner()

      expect(document.querySelector('.qa-sync-backdrop')).toBeNull()
      expect(document.getElementById('app-shell').style.pointerEvents).toBe('')
    })
  })

  describe('init()', () => {
    it('returns the same cleanup function on duplicate init calls', () => {
      const firstCleanup = sync.init()
      const secondCleanup = sync.init()

      expect(secondCleanup).toBe(firstCleanup)
      expect(MockBroadcastChannel.instances).toHaveLength(1)
    })
  })

  describe('destroy()', () => {
    it('closes the BroadcastChannel', () => {
      const channel = MockBroadcastChannel.instances[0]
      sync.destroy()

      expect(channel.close).toHaveBeenCalled()
    })
  })

  describe('no BroadcastChannel support', () => {
    it('broadcastMarkChange is a no-op when BroadcastChannel unavailable', async () => {
      sync.destroy()
      sync.reset()

      const original = globalThis.BroadcastChannel
      delete globalThis.BroadcastChannel

      // Re-init without BroadcastChannel
      sync.init()
      // Should not throw
      expect(() => sync.broadcastMarkChange(['2:255'])).not.toThrow()

      globalThis.BroadcastChannel = original
    })
  })
})
