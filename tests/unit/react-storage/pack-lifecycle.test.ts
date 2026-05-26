import { describe, expect, it } from 'vitest'

import { canActivatePack, createPackLifecycleState, transitionPackState } from '../../../src-react/offline/pack-lifecycle'

describe('React asset pack lifecycle', () => {
  it('keeps install, verify, and activate as separate states', () => {
    const initial = createPackLifecycleState('translation:bridges')
    const installing = transitionPackState(initial, { type: 'install-started' })
    const cached = transitionPackState(installing, { type: 'install-verified', version: 'v1', cachedAt: 1 })
    const active = transitionPackState(cached, { type: 'activated', activatedAt: 2 })

    expect(initial.status).toBe('not-installed')
    expect(installing.status).toBe('installing')
    expect(cached.status).toBe('installed')
    expect(active.status).toBe('active')
    expect(canActivatePack(installing)).toBe(false)
    expect(canActivatePack(cached)).toBe(true)
  })
})
