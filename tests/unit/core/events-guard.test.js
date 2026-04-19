// tests/unit/core/events-guard.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Events } from '../../../src/core/constants.js'

describe('events.js unknown-event guard', () => {
  beforeEach(() => { vi.resetModules() })
  afterEach(() => { vi.unstubAllEnvs() })

  it('throws in dev when emit() is called with an unknown event name', async () => {
    vi.stubEnv('DEV', true)
    const { emit } = await import('../../../src/core/events.js')
    expect(() => emit('not-a-real-event', {})).toThrow(/unknown event/i)
  })

  it('does not throw in dev for known Events.* constants', async () => {
    vi.stubEnv('DEV', true)
    const { emit } = await import('../../../src/core/events.js')
    const knownEvent = Object.values(Events)[0]
    expect(() => emit(knownEvent, {})).not.toThrow()
  })

  it('does not throw in prod even for unknown event names', async () => {
    vi.stubEnv('DEV', false)
    const { emit } = await import('../../../src/core/events.js')
    expect(() => emit('not-a-real-event', {})).not.toThrow()
  })
})
