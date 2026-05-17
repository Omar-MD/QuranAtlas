import 'fake-indexeddb/auto'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { logger } from '../../../../src/core/logger.js'
import { Events } from '../../../../src/core/constants.js'

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

import { clear as clearEvents } from '../../../../src/core/events.js'

let sync

beforeEach(() => {
  MockBroadcastChannel.reset()
  clearEvents()
  document.body.innerHTML = '<div id="app-shell"></div>'
})

afterEach(async () => {
  if (sync) {
    sync.reset()
  }
})

describe('safety/sync.js', () => {
  beforeEach(async () => {
    sync = await import('../../../../src/infra/safety/sync.js')
    sync.reset()
    sync.init()
  })

  describe('broadcastBookmarkChange()', () => {
    it('posts message with correct payload on the channel', () => {
      sync.broadcastBookmarkChange(['2:255'], 'qaloon')

      const channel = MockBroadcastChannel.instances[0]
      expect(channel.postMessage).toHaveBeenCalledWith({
        topic: 'bookmarks',
        payload: { verseKeys: ['2:255'], riwayah: 'qaloon' },
      })
    })

    it('posts message with multiple verseKeys for bulk operations', () => {
      sync.broadcastBookmarkChange(['2:255', '3:1', '3:2'], 'warsh')

      const channel = MockBroadcastChannel.instances[0]
      expect(channel.postMessage).toHaveBeenCalledWith({
        topic: 'bookmarks',
        payload: { verseKeys: ['2:255', '3:1', '3:2'], riwayah: 'warsh' },
      })
    })
  })

  describe('removed scope wrappers', () => {
    it('drops mark and edge sync wrappers from the public API', () => {
      expect(sync.broadcastMarkChange).toBeUndefined()
      expect(sync.broadcastEdgeChange).toBeUndefined()
      expect(sync.onMarkChange).toBeUndefined()
    })
  })

  describe('bookmarks:changed message handling', () => {
    it('fires SYNC_BOOKMARKS_UPDATED when bookmarks:changed message received', async () => {
      const syncBookmarksUpdated = vi.fn()
      const { on } = await import('../../../../src/core/events.js')

      on(Events.SYNC_BOOKMARKS_UPDATED, syncBookmarksUpdated)

      const channel = MockBroadcastChannel.instances[0]
      channel.onmessage({ data: { type: 'bookmarks:changed', verseKeys: ['2:255'], riwayah: 'qaloon' } })

      expect(syncBookmarksUpdated).toHaveBeenCalledWith({ verseKeys: ['2:255'], riwayah: 'qaloon' })
    })

    it('ignores legacy marks and edges messages once those topics are removed', async () => {
      const syncBookmarksUpdated = vi.fn()
      const { on } = await import('../../../../src/core/events.js')

      on(Events.SYNC_BOOKMARKS_UPDATED, syncBookmarksUpdated)

      const channel = MockBroadcastChannel.instances[0]
      channel.onmessage({ data: { type: 'marks:changed', verseKeys: ['2:255'] } })
      channel.onmessage({ data: { type: 'edges:changed', edgeIds: ['e1'] } })

      expect(syncBookmarksUpdated).not.toHaveBeenCalled()
    })
  })

  describe('DB version change banner', () => {
    it('renders a reload banner and blocks app interaction', async () => {
      const { emit } = await import('../../../../src/core/events.js')

      emit(Events.DB_VERSION_CHANGE)

      const backdrop = document.querySelector('.qa-sync-backdrop')
      const banner = document.querySelector('.qa-sync-banner')
      const reloadBtn = document.querySelector('.qa-sync-reload-btn')

      expect(backdrop).not.toBeNull()
      expect(banner).not.toBeNull()
      expect(reloadBtn).not.toBeNull()
      expect(document.getElementById('app-shell').style.pointerEvents).toBe('none')
    })

    it('does not render banner when suppressNextVersionChange was called first', async () => {
      const { emit } = await import('../../../../src/core/events.js')

      sync.suppressNextVersionChange()
      emit(Events.DB_VERSION_CHANGE)

      expect(document.querySelector('.qa-sync-backdrop')).toBeNull()
    })

    it('renders banner again after suppression is consumed', async () => {
      const { emit } = await import('../../../../src/core/events.js')

      sync.suppressNextVersionChange()
      emit(Events.DB_VERSION_CHANGE) // suppressed
      emit(Events.DB_VERSION_CHANGE) // should show

      expect(document.querySelector('.qa-sync-backdrop')).not.toBeNull()
    })

    it('does not render duplicate banners for repeated version change events', async () => {
      const { emit } = await import('../../../../src/core/events.js')

      emit(Events.DB_VERSION_CHANGE)
      emit(Events.DB_VERSION_CHANGE)

      expect(document.querySelectorAll('.qa-sync-backdrop')).toHaveLength(1)
    })

    it('removeBanner restores app interaction state', async () => {
      const { emit } = await import('../../../../src/core/events.js')

      emit(Events.DB_VERSION_CHANGE)
      sync.removeBanner()

      expect(document.querySelector('.qa-sync-backdrop')).toBeNull()
      expect(document.getElementById('app-shell').style.pointerEvents).toBe('')
    })
  })

  describe('init()', () => {
    it('returns a fresh cleanup function for each init call', () => {
      const firstCleanup = sync.init()
      const secondCleanup = sync.init()

      expect(typeof firstCleanup).toBe('function')
      expect(typeof secondCleanup).toBe('function')
      expect(secondCleanup).not.toBe(firstCleanup)
    })
  })

  describe('cleanup from init()', () => {
    it('closes the BroadcastChannel when cleanup is called', () => {
      const cleanup = sync.init()
      const channel = MockBroadcastChannel.instances[MockBroadcastChannel.instances.length - 1]
      cleanup()

      expect(channel.close).toHaveBeenCalled()
    })
  })

  describe('no BroadcastChannel support', () => {
    it('broadcastBookmarkChange is a no-op when BroadcastChannel unavailable', async () => {
      sync.reset()

      const original = globalThis.BroadcastChannel
      delete globalThis.BroadcastChannel

      // Re-init without BroadcastChannel
      sync.init()
      // Should not throw
      expect(() => sync.broadcastBookmarkChange(['2:255'], 'qaloon')).not.toThrow()

      globalThis.BroadcastChannel = original
    })
  })
})
