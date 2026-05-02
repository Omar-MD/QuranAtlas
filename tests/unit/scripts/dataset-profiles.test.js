import { describe, it, expect } from 'vitest'

import {
  getDatasetProfile,
} from '../../../scripts/data/build-dataset.mjs'

describe('dataset build profiles', () => {
  it('baseline emits only the locked default text bodies', () => {
    expect(getDatasetProfile('baseline')).toMatchObject({
      name: 'baseline',
      riwayat: ['qaloon'],
      translations: ['saheeh'],
      tafsir: ['muyassar'],
    })
  })

  it('full emits every locally configured approved source', () => {
    const full = getDatasetProfile('full')
    expect(full.riwayat).toEqual(expect.arrayContaining(['hafs', 'warsh', 'qaloon']))
    expect(full.translations).toEqual(expect.arrayContaining(['saheeh']))
    expect(full.tafsir).toEqual(expect.arrayContaining(['muyassar']))
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
