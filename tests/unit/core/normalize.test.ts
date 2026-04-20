import { describe, it, expect } from 'vitest'
import { normalize } from '../../../src/core/normalize'

describe('normalize', () => {
  it('trims outer whitespace and collapses inner whitespace', () => {
    expect(normalize('  ahl   al kitab  ')).toBe('ahl al kitab')
  })
})
