import { describe, expect, it } from 'vitest'

import { getInitialReactHash, matchReactRoute } from '../../../src-react/app/router/routes'

describe('React route matching', () => {
  it('keeps empty launch hashes distinct so storage can decide onboarding or restore', () => {
    expect(getInitialReactHash('')).toBe('#/')
    expect(matchReactRoute('#/')).toEqual({ type: 'launch' })
  })

  it('keeps preview search out of the production route contract', () => {
    expect(matchReactRoute('#/search')).toEqual({ type: 'unsupported' })
    expect(matchReactRoute('#/search?q=mercy')).toEqual({ type: 'unsupported' })
  })

  it('treats the old assets route as a settings-shell compatibility opener', () => {
    expect(matchReactRoute('#/assets')).toEqual({ type: 'settings' })
  })
})
