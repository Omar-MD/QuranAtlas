import { describe, expect, it } from 'vitest'

import { matchReactRoute } from '../../../src-react/app/router/routes'

describe('React route matching', () => {
  it('matches search routes with query strings', () => {
    expect(matchReactRoute('#/search?q=mercy')).toEqual({ type: 'search' })
  })
})
