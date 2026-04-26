import { describe, it, expect } from 'vitest'
import { splitRiwayah, computeSurahsMeta, AYAT_COUNTS } from './build-riwayat.mjs'

describe('splitRiwayah', () => {
  const sampleHafs = [
    { id: 1, jozz: 1, sora: 1, sora_name_en: 'Al-Fātiḥah', sora_name_ar: 'الفَاتِحة', page: '1', line_start: 2, line_end: 2, aya_no: 1, aya_text: 'بسم الله', aya_text_emlaey: 'بسم الله' },
    { id: 2, jozz: 1, sora: 1, sora_name_en: 'Al-Fātiḥah', sora_name_ar: 'الفَاتِحة', page: '1', line_start: 3, line_end: 3, aya_no: 2, aya_text: 'الحمد لله', aya_text_emlaey: 'الحمد لله' },
    { id: 3, jozz: 1, sora: 2, sora_name_en: 'Al-Baqarah', sora_name_ar: 'البَقَرَة', page: '2', line_start: 3, line_end: 3, aya_no: 1, aya_text: 'الم', aya_text_emlaey: 'الم' },
  ]

  it('groups ayat by surah, normalises sora→sura_no, preserves aya_text_emlaey for Hafs', () => {
    const split = splitRiwayah('hafs', sampleHafs)
    expect(Object.keys(split).sort()).toEqual(['001', '002'])
    const s1 = split['001']
    expect(s1.riwayah).toBe('hafs')
    expect(s1.sura_no).toBe(1)
    expect(s1.sura_name_en).toBe('Al-Fātiḥah')
    expect(s1.ayat).toHaveLength(2)
    expect(s1.ayat[0].aya_no).toBe(1)
    expect(s1.ayat[0].aya_text_emlaey).toBe('بسم الله')
    expect(s1.ayat[0]).not.toHaveProperty('sora')
    expect(s1.ayat[0]).not.toHaveProperty('sora_name_en')
  })

  const sampleWarsh = [
    { id: 1, jozz: 1, sura_no: 1, sura_name_en: 'Al-Fātiḥah', sura_name_ar: 'الفَاتِحة', page: '1', line_start: 3, line_end: 3, aya_no: 1, aya_text: 'اِ۬لْحَمْدُ', },
  ]

  it('preserves sura_no field-name for Warsh / Qaloon (no aya_text_emlaey)', () => {
    const split = splitRiwayah('warsh', sampleWarsh)
    expect(split['001'].riwayah).toBe('warsh')
    expect(split['001'].ayat[0]).not.toHaveProperty('aya_text_emlaey')
  })
})

describe('computeSurahsMeta', () => {
  it('emits 114 entries with per-Riwayah counts', () => {
    const fakeCounts = { hafs: Array(114).fill(7), warsh: Array(114).fill(7), qaloon: Array(114).fill(7) }
    const meta = computeSurahsMeta(['Al-Fātiḥah'].concat(Array(113).fill('X')), ['الفَاتِحة'].concat(Array(113).fill('X')), fakeCounts)
    expect(meta).toHaveLength(114)
    expect(meta[0]).toMatchObject({ n: 1, name: 'Al-Fātiḥah', name_ar: 'الفَاتِحة', counts: { hafs: 7, warsh: 7, qaloon: 7 } })
  })
})

describe('AYAT_COUNTS', () => {
  it('totals match KFGQPC reference: hafs 6236, warsh 6214, qaloon 6214', () => {
    expect(AYAT_COUNTS.hafs).toBe(6236)
    expect(AYAT_COUNTS.warsh).toBe(6214)
    expect(AYAT_COUNTS.qaloon).toBe(6214)
  })
})
