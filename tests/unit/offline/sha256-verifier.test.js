import { describe, it, expect } from 'vitest'
import { verify } from '../../../src/offline/sha256-verifier.js'

describe('sha256-verifier.js', () => {
  it('returns true for matching digest', async () => {
    const encoder = new TextEncoder()
    const data = encoder.encode('hello world')
    // SHA-256 of "hello world"
    const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'

    const result = await verify(data.buffer, expected)
    expect(result).toBe(true)
  })

  it('returns false for non-matching digest', async () => {
    const encoder = new TextEncoder()
    const data = encoder.encode('hello world')
    const wrong = '0000000000000000000000000000000000000000000000000000000000000000'

    const result = await verify(data.buffer, wrong)
    expect(result).toBe(false)
  })

  it('returns false for tampered data', async () => {
    const encoder = new TextEncoder()
    const data = encoder.encode('tampered')
    const expected = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'

    const result = await verify(data.buffer, expected)
    expect(result).toBe(false)
  })
})
