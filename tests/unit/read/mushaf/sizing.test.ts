import { describe, expect, it } from 'vitest'
import {
  choosePageChipPlacement,
  fitViewBoxIntoRect,
  parseViewBox,
} from '../../../../src/read/mushaf/sizing'

describe('mushaf sizing helpers', () => {
  it('parses a valid SVG viewBox with non-zero origin', () => {
    expect(parseViewBox('-10 20 500 1000')).toEqual({
      minX: -10,
      minY: 20,
      width: 500,
      height: 1000,
    })
  })

  it('rejects invalid SVG viewBox values', () => {
    expect(() => parseViewBox('0 0 100')).toThrow(/Invalid SVG viewBox/)
    expect(() => parseViewBox('0 0 100 200 300')).toThrow(/Invalid SVG viewBox/)
    expect(() => parseViewBox('0 0 Infinity 200')).toThrow(/Invalid SVG viewBox/)
    expect(() => parseViewBox('0 0 0 200')).toThrow(/Invalid SVG viewBox dimensions/)
    expect(() => parseViewBox('0 0 100 -200')).toThrow(/Invalid SVG viewBox dimensions/)
  })

  it('fits a tall page by height when height is the smaller constraint', () => {
    const fit = fitViewBoxIntoRect(parseViewBox('0 0 500 1000'), { width: 600, height: 800 })

    expect(fit).toEqual({
      width: 400,
      height: 800,
      scale: 0.8,
      x: 100,
      y: 0,
    })
  })

  it('allows a wide desktop page to exceed the old 760px cap when height budget permits it', () => {
    const fit = fitViewBoxIntoRect(parseViewBox('0 0 1000 1400'), { width: 1200, height: 1500 })

    expect(fit.width).toBeGreaterThan(760)
    expect(fit.height).toBe(1500)
  })

  it('returns a zero fit when available size is unavailable', () => {
    expect(fitViewBoxIntoRect(parseViewBox('0 0 500 1000'), { width: 0, height: 800 })).toEqual({
      width: 0,
      height: 0,
      scale: 0,
      x: 0,
      y: 0,
    })
    expect(fitViewBoxIntoRect(parseViewBox('0 0 500 1000'), { width: Number.NaN, height: 800 })).toEqual({
      width: 0,
      height: 0,
      scale: 0,
      x: 0,
      y: 0,
    })
  })

  it('keeps the page chip at bottom center when there is room below the page', () => {
    expect(
      choosePageChipPlacement({
        available: { width: 1000, height: 1200 },
        pageFit: { width: 500, height: 900, scale: 1, x: 250, y: 80 },
        chip: { width: 96, height: 40 },
        margin: 24,
      }),
    ).toBe('bottom-center')
  })

  it('moves the page chip when the fitted page collides with the default bottom slot', () => {
    expect(
      choosePageChipPlacement({
        available: { width: 1000, height: 1200 },
        pageFit: { width: 560, height: 1080, scale: 1, x: 220, y: 50 },
        chip: { width: 96, height: 40 },
        margin: 24,
      }),
    ).toBe('below-page')
  })

  it('uses the inside safe-bottom placement when no outside slot can hold the chip', () => {
    expect(
      choosePageChipPlacement({
        available: { width: 390, height: 760 },
        pageFit: { width: 390, height: 750, scale: 1, x: 0, y: 0 },
        chip: { width: 96, height: 44 },
        margin: 16,
      }),
    ).toBe('inside-safe-bottom')
  })
})
