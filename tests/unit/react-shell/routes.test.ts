import { describe, expect, it } from 'vitest'

import { getInitialReactHash, matchReactRoute } from '../../../src-react/app/router/routes'

describe('React route matching', () => {
  it('keeps empty launch hashes distinct so storage can decide onboarding or restore', () => {
    expect(getInitialReactHash('')).toBe('#/')
    expect(matchReactRoute('#/')).toEqual({ type: 'launch' })
  })

  it('matches search routes with query strings', () => {
    expect(matchReactRoute('#/search?q=mercy')).toEqual({ type: 'search' })
  })
})
