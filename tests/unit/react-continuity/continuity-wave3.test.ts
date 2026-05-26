import { describe, expect, it } from 'vitest'

import { resolveLaunchRoute, shouldPersistLastSurface } from '../../../src-react/continuity/launch-restore'
import { createBookmarkSyncMessage } from '../../../src-react/continuity/bookmarks/sync'

describe('React continuity parity', () => {
  it('routes incomplete onboarding first', () => {
    expect(resolveLaunchRoute({ onboardingComplete: false, lastSurface: '#/s/2', currentPosition: { surah: 3, verse: 4 } })).toBe('#/onboarding')
  })

  it('uses valid launchable lastSurface before saved position', () => {
    expect(resolveLaunchRoute({ onboardingComplete: true, lastSurface: '#/m/12', currentPosition: { surah: 3, verse: 4 } })).toBe('#/m/12')
  })

  it('excludes operational routes from launch surfaces', () => {
    expect(shouldPersistLastSurface('#/assets')).toBe(false)
    expect(shouldPersistLastSurface('#/settings')).toBe(false)
    expect(shouldPersistLastSurface('#/onboarding')).toBe(false)
    expect(shouldPersistLastSurface('#/search')).toBe(false)
  })

  it('falls back to currentPosition then Al-Fatihah', () => {
    expect(resolveLaunchRoute({ onboardingComplete: true, lastSurface: '#/assets', currentPosition: { surah: 2, verse: 255 } })).toBe('#/s/2/255')
    expect(resolveLaunchRoute({ onboardingComplete: true })).toBe('#/s/1')
  })

  it('creates scoped bookmark sync messages', () => {
    expect(createBookmarkSyncMessage('qaloon', '2:255')).toEqual({ type: 'bookmarks:changed', riwayah: 'qaloon', verseKey: '2:255' })
  })
})
