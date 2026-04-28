/**
 * Unit tests for `resolveTranslationFor` — the runtime helper that decides
 * how to render the translation cell for a (riwayah, surahNo, ayahNo) tuple
 * given the verse-aliases table.
 *
 * Roles asserted:
 *   - identity:     1:1 alias (or surah without aliases) → render translation
 *   - merged:       multiple Hafs ayat → this Madinan ayah → concat translations
 *   - primary:      first half of a Hafs split → render full translation
 *   - continuation: subsequent half of a Hafs split → render "↑ continued"
 *   - none:         no Hafs equivalent (e.g. Warsh / Qaloon surah-1 ayah 1
 *                   doesn't exist as a Hafs ayah — Bismillah carve-out)
 */

import { describe, it, expect } from 'vitest'
import { resolveTranslationFor } from '../../../src/data/verse-aliases.ts'

const fixture = {
  _meta: { version: 1 },
  aliases: {
    // Surah 1 — Bismillah carve-out + Hafs 1:7 split into Warsh 1:6 + 1:7
    '1': [
      { hafs: 1, warsh: null,    qaloon: null    },
      { hafs: 2, warsh: 1,       qaloon: 1       },
      { hafs: 3, warsh: 2,       qaloon: 2       },
      { hafs: 4, warsh: 3,       qaloon: 3       },
      { hafs: 5, warsh: 4,       qaloon: 4       },
      { hafs: 6, warsh: 5,       qaloon: 5       },
      { hafs: 7, warsh: [6, 7],  qaloon: [6, 7]  },
    ],
    // Surah 36 (Yaseen) — Hafs 1 ("Yaseen") + Hafs 2 ("Wa al-Quran") → Warsh 1 (combined)
    '36': [
      { hafs: 1, warsh: 1, qaloon: 1 },
      { hafs: 2, warsh: 1, qaloon: 1 },
      { hafs: 3, warsh: 2, qaloon: 2 },
    ],
  },
  aliasMeta: {},
}

describe('resolveTranslationFor', () => {
  it('Hafs is always identity', () => {
    const r = resolveTranslationFor(fixture, 'hafs', 5, 42)
    expect(r.role).toBe('identity')
    expect(r.hafsKeys).toEqual(['5:42'])
  })

  it('null aliases → identity (surah without entries)', () => {
    const r = resolveTranslationFor(fixture, 'warsh', 99, 5) // surah 99 not in fixture
    expect(r.role).toBe('identity')
    expect(r.hafsKeys).toEqual(['99:5'])
  })

  it('null fixture → identity (offline / no aliases shipped)', () => {
    const r = resolveTranslationFor(null, 'warsh', 1, 1)
    expect(r.role).toBe('identity')
    expect(r.hafsKeys).toEqual(['1:1'])
  })

  describe('Bismillah carve-out (surah 1)', () => {
    it('Warsh 1:1 (= Hafs 1:2 "Al-hamdu lillah") → identity, points to Hafs 1:2', () => {
      const r = resolveTranslationFor(fixture, 'warsh', 1, 1)
      expect(r.role).toBe('identity')
      expect(r.hafsKeys).toEqual(['1:2'])
    })

    it('Qaloon 1:5 → identity → Hafs 1:6', () => {
      const r = resolveTranslationFor(fixture, 'qaloon', 1, 5)
      expect(r.role).toBe('identity')
      expect(r.hafsKeys).toEqual(['1:6'])
    })
  })

  describe('Hafs split → Madinan: primary + continuation', () => {
    it('Warsh 1:6 (first half of Hafs 1:7) → primary, full translation', () => {
      const r = resolveTranslationFor(fixture, 'warsh', 1, 6)
      expect(r.role).toBe('primary')
      expect(r.hafsKeys).toEqual(['1:7'])
      expect(r.primaryAyah).toBeUndefined()
    })

    it('Warsh 1:7 (second half of Hafs 1:7) → continuation, marker shows primary=6', () => {
      const r = resolveTranslationFor(fixture, 'warsh', 1, 7)
      expect(r.role).toBe('continuation')
      expect(r.hafsKeys).toEqual(['1:7'])
      expect(r.primaryAyah).toBe(6)
    })

    it('Qaloon 1:6 / 1:7 mirror Warsh', () => {
      expect(resolveTranslationFor(fixture, 'qaloon', 1, 6).role).toBe('primary')
      expect(resolveTranslationFor(fixture, 'qaloon', 1, 7).role).toBe('continuation')
      expect(resolveTranslationFor(fixture, 'qaloon', 1, 7).primaryAyah).toBe(6)
    })
  })

  describe('Hafs combine → Madinan: merged', () => {
    it('Warsh 36:1 = Hafs 36:1 ("Yaseen") + Hafs 36:2 ("Wa al-Quran al-Hakim") → merged', () => {
      const r = resolveTranslationFor(fixture, 'warsh', 36, 1)
      expect(r.role).toBe('merged')
      expect(r.hafsKeys).toEqual(['36:1', '36:2'])
    })

    it('Warsh 36:2 = Hafs 36:3 → identity', () => {
      const r = resolveTranslationFor(fixture, 'warsh', 36, 2)
      expect(r.role).toBe('identity')
      expect(r.hafsKeys).toEqual(['36:3'])
    })
  })
})
