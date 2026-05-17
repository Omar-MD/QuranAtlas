import { beforeEach, describe, expect, it, vi } from 'vitest'

const { put } = vi.hoisted(() => ({
  put: vi.fn(async () => {}),
}))

vi.mock('../../../src/core/db.js', () => ({
  put,
}))

import { persistLastSurface } from '../../../src/continuity/last-surface'

describe('configure/state-last-surface', () => {
  beforeEach(() => {
    put.mockClear()
  })

  it('persists launchable hashes', async () => {
    await persistLastSurface('#/about')

    expect(put).toHaveBeenCalledWith('settings', { key: 'lastSurface', value: '#/about' })
  })

  it('skips onboarding and settings hashes plus settings variants', async () => {
    await persistLastSurface('#/onboarding')
    await persistLastSurface('#/settings')
    await persistLastSurface('#/settings?x=1')
    await persistLastSurface('#/settings/extra')

    expect(put).not.toHaveBeenCalled()
  })
})
