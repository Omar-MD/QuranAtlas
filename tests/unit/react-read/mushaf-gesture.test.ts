import { describe, expect, it } from 'vitest'

import {
  applyMushafBoundaryResistance,
  decideMushafSettle,
  mushafDirectionForDelta,
  resolveMushafGestureAxis,
} from '../../../src/components/reader/mushaf-gesture'

describe('Mushaf gesture decisions', () => {
  it('distinguishes clear horizontal intent from clear vertical intent', () => {
    expect(resolveMushafGestureAxis(96, 12)).toBe('horizontal')
    expect(resolveMushafGestureAxis(12, 96)).toBe('vertical')
  })

  it('maps physical right movement to next and left movement to previous', () => {
    expect(mushafDirectionForDelta(80)).toBe('next')
    expect(mushafDirectionForDelta(-80)).toBe('previous')
  })

  it('commits deliberate distance or velocity and cancels slow short movement', () => {
    expect(decideMushafSettle({ deltaX: 150, destinationReady: true, velocityX: 0.1, width: 390 })).toEqual({ direction: 'next', outcome: 'commit' })
    expect(decideMushafSettle({ deltaX: -48, destinationReady: true, velocityX: -0.8, width: 390 })).toEqual({ direction: 'previous', outcome: 'commit' })
    expect(decideMushafSettle({ deltaX: 48, destinationReady: true, velocityX: 0.1, width: 390 })).toEqual({ direction: 'next', outcome: 'cancel' })
  })

  it('cancels an unavailable destination and reduces outward boundary travel', () => {
    expect(decideMushafSettle({ deltaX: 160, destinationReady: false, velocityX: 1, width: 390 }).outcome).toBe('cancel')
    expect(Math.abs(applyMushafBoundaryResistance(100))).toBeLessThan(100)
  })
})
