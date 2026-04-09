import { describe, expect, it, vi } from 'vitest'

let importTimeWarnError = null

try {
  console.warn('import-time console guard sentinel')
} catch (error) {
  importTimeWarnError = error
}

describe('tests/setup console guard', () => {
  it('guards console.warn during test module evaluation', () => {
    expect(importTimeWarnError).toBeInstanceOf(Error)
    expect(importTimeWarnError.message).toContain('Unexpected console.warn call in test')
    expect(importTimeWarnError.message).toContain('import-time console guard sentinel')
  })

  it('reinstalls console guards after vi.restoreAllMocks()', () => {
    vi.restoreAllMocks()

    expect(() => {
      console.warn('post-restore warn sentinel')
    }).toThrowError(/Unexpected console\.warn call in test/)

    expect(() => {
      console.error('post-restore error sentinel')
    }).toThrowError(/Unexpected console\.error call in test/)
  })
})