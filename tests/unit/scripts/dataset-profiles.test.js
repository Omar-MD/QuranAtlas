import { describe, it, expect } from 'vitest'

import {
  getDatasetProfile,
} from '../../../scripts/data/build-dataset.mjs'

describe('dataset build profiles', () => {
  it('baseline emits only the locked default text bodies', () => {
    expect(getDatasetProfile('baseline')).toMatchObject({
      name: 'baseline',
      riwayat: ['qaloon'],
      translations: ['bridges'],
      tafsir: ['muyassar'],
    })
  })

  it('full emits every locally configured approved source', () => {
    const full = getDatasetProfile('full')
    expect(full.riwayat).toEqual(expect.arrayContaining(['hafs', 'warsh', 'qaloon']))
    expect(full.translations).toEqual(expect.arrayContaining([
      'bridges',
      'saheeh',
      'clear-quran',
      'abdel-haleem',
    ]))
    expect(full.tafsir).toEqual(expect.arrayContaining([
      'muyassar',
      'mukhtasar',
      'saadi',
    ]))
  })

  it('catalog emits metadata and indexes without text bodies', () => {
    expect(getDatasetProfile('catalog')).toMatchObject({
      name: 'catalog',
      riwayat: [],
      translations: [],
      tafsir: [],
    })
  })
})
