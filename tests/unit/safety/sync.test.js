import 'fake-indexeddb/auto'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

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
