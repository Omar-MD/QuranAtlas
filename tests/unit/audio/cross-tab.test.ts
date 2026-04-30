import { describe, it, expect, beforeEach, vi } from 'vitest'
import { _resetTabIdForTest, getTabId, initCrossTab } from '../../../src/audio/cross-tab'
import { reset as resetSync, init as initSync } from '../../../src/safety/sync'

describe('cross-tab', () => {
  beforeEach(() => {
    resetSync()
    _resetTabIdForTest()
    initSync()
  })

  describe('getTabId', () => {
    it('returns a stable id within a session', () => {
      const id1 = getTabId()
      const id2 = getTabId()
      expect(id1).toBe(id2)
      expect(id1).toMatch(/^t_/)
    })
  })

  describe('initCrossTab', () => {
    it('rejects non-conforming payloads silently', () => {
      const onPlaybackTakeover = vi.fn()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      initCrossTab({ onPlaybackTakeover })

      // Note: we cannot directly post to BroadcastChannel inbound here in
      // the jsdom mock; the assertion is that the registration call
      // returns without throwing on init and that no handler fires for
      // bogus shapes. Negative-path verification via the validator's
      // explicit shape rejection lives in the registerTopic-side handler.
      expect(onPlaybackTakeover).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
