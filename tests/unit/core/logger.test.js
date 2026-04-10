import { describe, expect, it } from 'vitest'
import { logger } from '../../../src/core/logger.js'

describe('core/logger.js', () => {
  it('exposes debug, info, warn, error methods', () => {
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
  })
})