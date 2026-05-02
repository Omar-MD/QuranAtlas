import { describe, expect, it } from 'vitest'

import { normalizeQulTafsirEntries, normalizeQuranDbTranslation } from '../../../scripts/data/fetch-source.mjs'

describe('Quran DB Saheeh normalization', () => {
  it('converts Quran DB surah JSON into the committed translation source schema', () => {
    const source = {
      '1': {
        SurahTransliteratedName: 'al-Fatihah',
        SurahArabicName: 'الفَاتِحَة',
        SurahEnglishNames: 'The Opening',
        Ayahs: {
          '1': { 'Umm Muhammad (Sahih International)': 'In the name of Allah' },
          '2': { 'Umm Muhammad (Sahih International)': '&#91;All&#93; praise is &#91;due&#93; to Allah ' },
        },
      },
    }

    const normalized = normalizeQuranDbTranslation(source, {
      id: 'saheeh',
      field: 'Umm Muhammad (Sahih International)',
      label: 'Saheeh International',
      translationVersion: 'quran-db-test',
      fetchedAt: '2026-05-02T00:00:00.000Z',
      sourceUrl: 'https://example.test/saheeh.json',
    })

    expect(normalized).toMatchObject({
      translationId: 'saheeh',
      translationVersion: 'quran-db-test',
      source: {
        provider: 'quran_db',
        name: 'Umm Muhammad (Sahih International)',
      },
      counts: {
        surahs: 1,
        verses: 2,
        footnotes: 0,
      },
    })
    expect(normalized.surahs['001']).toEqual({
      intro: [],
      verses: [
        { key: '1:1', text: 'In the name of Allah' },
        { key: '1:2', text: '[All] praise is [due] to Allah' },
      ],
      footnotes: {},
      source: {
        transliteratedName: 'al-Fatihah',
        arabicName: 'الفَاتِحَة',
        englishNames: 'The Opening',
      },
    })
  })
})

describe('QUL tafsir normalization', () => {
  it('preserves grouped tafsir ranges in the normalized source schema', () => {
    const normalized = normalizeQulTafsirEntries([
      { verses: ['73:1', '73:2', '73:3', '73:4'], text: 'grouped text' },
      { verses: ['73:1', '73:2', '73:3', '73:4'], text: 'duplicate grouped text' },
      { verses: ['73:5'], text: 'single ayah' },
    ], {
      id: 'muyassar',
      tafsirVersion: 'qul-resource-test',
      language: 'ar',
      resourceUrl: 'https://example.test/tafsir',
      resourceId: 38,
      contentResourceId: 16,
    })

    expect(normalized).toMatchObject({
      tafsirId: 'muyassar',
      tafsirVersion: 'qul-resource-test',
      language: 'ar',
    })
    expect(normalized.entries).toEqual([
      {
        id: '73:1',
        startKey: '73:1',
        endKey: '73:4',
        ayahKeys: ['73:1', '73:2', '73:3', '73:4'],
        sourceGranularity: 'range',
        text: 'duplicate grouped text',
      },
      {
        id: '73:5',
        startKey: '73:5',
        endKey: '73:5',
        ayahKeys: ['73:5'],
        sourceGranularity: 'ayah',
        text: 'single ayah',
      },
    ])
    expect(normalized.sourceChecksum).toMatchObject({ algorithm: 'sha256' })
  })
})
