import { describe, it, expect } from 'vitest'

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function srgbToLinear(c) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function relLuminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map(srgbToLinear)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function contrast(hex1, hex2) {
  const l1 = relLuminance(hexToRgb(hex1))
  const l2 = relLuminance(hexToRgb(hex2))
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

function blend(fgRgbA, bgRgb) {
  const [fr, fg, fb, fa] = fgRgbA
  const [br, bg, bb] = bgRgb
  return [
    Math.round(fr * fa + br * (1 - fa)),
    Math.round(fg * fa + bg * (1 - fa)),
    Math.round(fb * fa + bb * (1 - fa)),
  ]
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
}

const themes = {
  light: {
    bgPrimary: '#fbf8f0',
    ambientAccent: '#78592e',
    ambientAccentSoftFg: [120, 89, 46, 0.08], // --qa-selection-bg: rgba(120,89,46,0.08)
    ambientSurface: '#faf1d8',
    onAccent: '#faf1d8',
  },
  sepia: {
    bgPrimary: '#f7ebd0',
    ambientAccent: '#78592e',
    ambientAccentSoftFg: [120, 89, 46, 0.08], // --qa-selection-bg: rgba(120,89,46,0.08)
    ambientSurface: '#faf1d8',
    onAccent: '#faf1d8',                       // same as light — both share #78592e accent
  },
  dark: {
    bgPrimary: '#0f1215',
    ambientAccent: '#d4a253',
    ambientAccentSoftFg: [212, 162, 83, 0.18],
    ambientSurface: '#1c2128',
    onAccent: '#15110a',
  },
}

describe('theme tokens pass WCAG AA', () => {
  for (const [name, t] of Object.entries(themes)) {
    describe(name, () => {
      it('--qa-on-accent on --qa-ambient-accent (primary button) >= 4.5:1', () => {
        expect(contrast(t.onAccent, t.ambientAccent)).toBeGreaterThanOrEqual(4.5)
      })

      it('--qa-selection-text on --qa-selection-bg (selection pill) >= 4.5:1', () => {
        const effectiveBg = rgbToHex(
          blend(t.ambientAccentSoftFg, hexToRgb(t.ambientSurface))
        )
        expect(contrast(t.ambientAccent, effectiveBg)).toBeGreaterThanOrEqual(4.5)
      })

      it('--qa-ambient-accent on --qa-bg-primary (non-text UI) >= 3:1', () => {
        expect(contrast(t.ambientAccent, t.bgPrimary)).toBeGreaterThanOrEqual(3)
      })
    })
  }
})
