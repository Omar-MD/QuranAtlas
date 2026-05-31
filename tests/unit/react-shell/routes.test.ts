import { describe, expect, it } from 'vitest'

import { getInitialReactHash, matchReactRoute } from '../../../src/app/router/routes'

describe('React route matching', () => {
  it('keeps empty launch hashes distinct so storage can decide onboarding or restore', () => {
    expect(getInitialReactHash('')).toBe('#/')
    expect(matchReactRoute('#/')).toEqual({ type: 'launch' })
  })

  it('promotes Search while keeping Reader routes unchanged', () => {
    expect(matchReactRoute('#/search')).toEqual({ type: 'search' })
    expect(matchReactRoute('#/search?q=mercy')).toEqual({ type: 'search' })
    expect(matchReactRoute('#/s/2/255')).toEqual({ type: 'reader', surah: 2, ayah: 255 })
  })

  it('treats the old assets route as a settings-shell compatibility opener', () => {
    expect(matchReactRoute('#/assets')).toEqual({ type: 'settings' })
  })
})
