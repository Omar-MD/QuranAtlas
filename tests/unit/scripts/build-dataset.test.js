import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { splitRiwayah, computeSurahsMeta, AYAT_COUNTS, buildTranslationSplits, buildManifestPayload } from '../../../scripts/data/build-dataset.mjs'

describe('splitRiwayah', () => {
  const sampleHafs = [
    { id: 1, jozz: 1, sora: 1, sora_name_en: 'Al-Fātiḥah', sora_name_ar: 'الفَاتِحة', page: '1', line_start: 2, line_end: 2, aya_no: 1, aya_text: 'بسم الله ١', aya_text_emlaey: 'بسم الله ١' },
    { id: 2, jozz: 1, sora: 1, sora_name_en: 'Al-Fātiḥah', sora_name_ar: 'الفَاتِحة', page: '1', line_start: 3, line_end: 3, aya_no: 2, aya_text: 'الحمد لله ٢', aya_text_emlaey: 'الحمد لله ٢' },
    { id: 3, jozz: 1, sora: 2, sora_name_en: 'Al-Baqarah', sora_name_ar: 'البَقَرَة', page: '2', line_start: 3, line_end: 3, aya_no: 1, aya_text: 'الم ١', aya_text_emlaey: 'الم ١' },
  ]

  it('groups ayat by surah, normalises sora→sura_no', () => {
    const split = splitRiwayah('hafs', sampleHafs)
    expect(Object.keys(split).sort()).toEqual(['001', '002'])
    const s1 = split['001']
    expect(s1.riwayah).toBe('hafs')
    expect(s1.sura_no).toBe(1)
    expect(s1.sura_name_en).toBe('Al-Fātiḥah')
    expect(s1.ayat).toHaveLength(2)
    expect(s1.ayat[0].aya_no).toBe(1)
    expect(s1.ayat[0]).not.toHaveProperty('sora')
    expect(s1.ayat[0]).not.toHaveProperty('sora_name_en')
  })

  it('drops aya_text_emlaey from output', () => {
    const split = splitRiwayah('hafs', sampleHafs)
    expect(split['001'].ayat[0]).not.toHaveProperty('aya_text_emlaey')
    expect(split['001'].ayat[1]).not.toHaveProperty('aya_text_emlaey')
  })

  it('strips trailing Arabic-Indic verse number from aya_text', () => {
    const split = splitRiwayah('hafs', sampleHafs)
    expect(split['001'].ayat[0].aya_text).toBe('بسم الله')
    expect(split['001'].ayat[1].aya_text).toBe('الحمد لله')
    expect(split['002'].ayat[0].aya_text).toBe('الم')
  })

  it('keeps id / line_start / line_end on Hafs', () => {
    const split = splitRiwayah('hafs', sampleHafs)
    expect(split['001'].ayat[0]).toHaveProperty('id')
    expect(split['001'].ayat[0]).toHaveProperty('line_start')
    expect(split['001'].ayat[0]).toHaveProperty('line_end')
  })

  it('throws when captured digit disagrees with aya_no', () => {
    const corrupt = [{ id: 1, jozz: 1, sora: 1, sora_name_en: 'X', sora_name_ar: 'X', page: '1', line_start: 1, line_end: 1, aya_no: 1, aya_text: 'foo ٢' }]
    expect(() => splitRiwayah('hafs', corrupt)).toThrow(/does not match aya_no/)
  })

  it('throws when no trailing Arabic-Indic digit is present', () => {
    const missing = [{ id: 1, jozz: 1, sora: 1, sora_name_en: 'X', sora_name_ar: 'X', page: '1', line_start: 1, line_end: 1, aya_no: 1, aya_text: 'foo' }]
    expect(() => splitRiwayah('hafs', missing)).toThrow(/Expected trailing Arabic-Indic digit/)
  })

  const sampleWarsh = [
    { id: 1, jozz: 1, sura_no: 1, sura_name_en: 'Al-Fātiḥah', sura_name_ar: 'الفَاتِحة', page: '1', line_start: 3, line_end: 3, aya_no: 1, aya_text: 'اِ۬لْحَمْدُ ١' },
  ]

  it('preserves sura_no field-name for Warsh / Qaloon, drops aya_text_emlaey + id + line_*', () => {
    const split = splitRiwayah('warsh', sampleWarsh)
    expect(split['001'].riwayah).toBe('warsh')
    expect(split['001'].ayat[0]).not.toHaveProperty('aya_text_emlaey')
    expect(split['001'].ayat[0]).not.toHaveProperty('id')
    expect(split['001'].ayat[0]).not.toHaveProperty('line_start')
    expect(split['001'].ayat[0]).not.toHaveProperty('line_end')
    expect(split['001'].ayat[0].aya_text).toBe('اِ۬لْحَمْدُ')
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

describe('buildTranslationSplits', () => {
  // Synthetic 114-surah translation source. Verse texts are placeholders; we
  // assert structural invariants only (no real translation content needed for
  // the unit test).
  function makeFakeSource(perSurahCounts, mutate) {
    const surahs = {}
    for (let n = 1; n <= 114; n++) {
      const k = String(n).padStart(3, '0')
      const cnt = perSurahCounts[n - 1]
      const verses = Array.from({ length: cnt }, (_, i) => ({ key: `${n}:${i + 1}`, text: `placeholder-${n}-${i + 1}` }))
      surahs[k] = { intro: [], verses, footnotes: {} }
    }
    const src = {
      translationId: 'fake', translationVersion: 'v0', surahs,
      counts: { surahs: 114, verses: perSurahCounts.reduce((a, b) => a + b, 0), footnotes: 0 },
    }
    if (mutate) { mutate(src) }
    return src
  }

  const HAFS_TINY = Array(114).fill(2)

  it('happy path — 114 surahs with matching counts produce per-surah payloads', () => {
    const src = makeFakeSource(HAFS_TINY)
    const { perSurah, totals } = buildTranslationSplits(src, HAFS_TINY)
    expect(Object.keys(perSurah)).toHaveLength(114)
    expect(perSurah['001']).toMatchObject({ translationId: 'fake', translationVersion: 'v0', surahNo: 1, intro: [], footnotes: {} })
    expect(perSurah['001'].verses).toEqual([{ key: '1:1', text: 'placeholder-1-1' }, { key: '1:2', text: 'placeholder-1-2' }])
    expect(totals.verses).toBe(228)
    expect(totals.footnotes).toBe(0)
  })

  it('throws when verse count drifts from Hafs count', () => {
    const src = makeFakeSource(HAFS_TINY, (s) => { s.surahs['001'].verses.pop() })
    expect(() => buildTranslationSplits(src, HAFS_TINY)).toThrow(/verse count/)
  })

  it('throws when verse keys are misaligned', () => {
    const src = makeFakeSource(HAFS_TINY, (s) => { s.surahs['001'].verses[0].key = '99:99' })
    expect(() => buildTranslationSplits(src, HAFS_TINY)).toThrow(/expected 1:1/)
  })

  it('throws when surah count is wrong', () => {
    const src = makeFakeSource(HAFS_TINY, (s) => { delete s.surahs['114'] })
    expect(() => buildTranslationSplits(src, HAFS_TINY)).toThrow(/expected 114/)
  })

  it('resolves [N] markers and accepts contiguous footnote map', () => {
    const src = makeFakeSource(HAFS_TINY, (s) => {
      s.surahs['001'].verses[0].text = 'before[1] middle[2] end'
      s.surahs['001'].footnotes = { '1': 'first note', '2': 'second note' }
    })
    const { perSurah } = buildTranslationSplits(src, HAFS_TINY)
    expect(perSurah['001'].footnotes).toEqual({ '1': 'first note', '2': 'second note' })
    expect(perSurah['001'].verses[0].text).toBe('before[1] middle[2] end')
  })

  it('throws when a [N] marker has no matching footnote (orphan)', () => {
    const src = makeFakeSource(HAFS_TINY, (s) => {
      s.surahs['001'].verses[0].text = 'lonely[1] marker'
      s.surahs['001'].footnotes = {}
    })
    expect(() => buildTranslationSplits(src, HAFS_TINY)).toThrow(/no matching footnote/)
  })

  it('throws when footnote keys are non-contiguous', () => {
    const src = makeFakeSource(HAFS_TINY, (s) => {
      s.surahs['001'].verses[0].text = 'a[1] b[3]'
      s.surahs['001'].footnotes = { '1': 'x', '3': 'y' }
    })
    expect(() => buildTranslationSplits(src, HAFS_TINY)).toThrow(/non-contiguous/)
  })

  it('throws when a defined footnote is unreferenced', () => {
    const src = makeFakeSource(HAFS_TINY, (s) => {
      s.surahs['001'].verses[0].text = 'only[1] used'
      s.surahs['001'].footnotes = { '1': 'used', '2': 'orphan' }
    })
    expect(() => buildTranslationSplits(src, HAFS_TINY)).toThrow(/non-contiguous|never referenced/)
  })
})

describe('buildManifestPayload', () => {
  it('includes knowledge files in manifest hashes and byte sizes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-manifest-'))
    const provenance = {
      packageVersion: 'test',
      profile: 'baseline',
      builtAt: '2026-05-03T00:00:00.000Z',
      corpus: {},
      riwayat: [],
      translations: [],
      tafsir: [],
      fonts: {},
    }

    try {
      await mkdir(join(root, 'knowledge', 'ayah'), { recursive: true })
      await mkdir(join(root, 'knowledge', 'passages'), { recursive: true })
      await mkdir(join(root, 'knowledge', 'indexes'), { recursive: true })
      await mkdir(join(root, 'riwayat'), { recursive: true })
      await mkdir(join(root, 'translations'), { recursive: true })
      await writeFile(join(root, 'knowledge', 'ayah', '001.json'), '{"surah":1,"ayahs":[]}', 'utf8')
      await writeFile(join(root, 'knowledge', 'passages', '001.json'), '{"surah":1,"passages":[]}', 'utf8')
      await writeFile(join(root, 'knowledge', 'indexes', 'theme-to-ayah.json'), '{"guidance":["1:6"]}', 'utf8')
      await writeFile(join(root, 'provenance.json'), JSON.stringify(provenance), 'utf8')
      await writeFile(join(root, 'manifest.json'), '{"old":true}', 'utf8')
      await writeFile(join(root, 'riwayat', 'source.json'), '{"buildOnly":true}', 'utf8')
      await writeFile(join(root, 'translations', 'source.json'), '{"buildOnly":true}', 'utf8')

      const manifest = await buildManifestPayload({
        datasetDir: root,
        riwayatDir: join(root, 'riwayat'),
        translationsDir: join(root, 'translations'),
        provenance,
        packageVersion: 'test',
        profileName: 'baseline',
      })

      expect(manifest.files).toHaveProperty('knowledge/ayah/001.json')
      expect(manifest.files).toHaveProperty('knowledge/passages/001.json')
      expect(manifest.files).toHaveProperty('knowledge/indexes/theme-to-ayah.json')
      expect(manifest.fileSizes['knowledge/ayah/001.json']).toBeGreaterThan(0)
      expect(manifest.files).not.toHaveProperty('manifest.json')
      expect(manifest.files).not.toHaveProperty('riwayat/source.json')
      expect(manifest.files).not.toHaveProperty('translations/source.json')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
