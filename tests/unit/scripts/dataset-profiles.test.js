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
      tafsir: [],
    })
  })

  it('full remains locked to the current MVP runtime assets', () => {
    expect(getDatasetProfile('full')).toMatchObject({
      name: 'full',
      riwayat: ['qaloon'],
      translations: ['bridges'],
      tafsir: [],
    })
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
