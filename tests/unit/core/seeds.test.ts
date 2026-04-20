import { describe, it, expect } from 'vitest'
import { getSeedsForLayer, LAYER_SEEDS } from '../../../src/core/seeds'

describe('seeds', () => {
  it('returns seeds for every declared layer', () => {
    for (const layer of Object.keys(LAYER_SEEDS)) {
      expect(getSeedsForLayer(layer as any).length).toBeGreaterThan(0)
    }
  })
  it('threads contains mercy + tawhid', () => {
    expect(getSeedsForLayer('threads')).toContain('mercy')
    expect(getSeedsForLayer('threads')).toContain('tawhid')
  })
  it('audience preserves rank distinctions', () => {
    const a = getSeedsForLayer('audience')
    expect(a).toContain('muminin')
    expect(a).toContain('muslimin')
    expect(a).toContain('muttaqin')
  })
})
