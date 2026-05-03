import { describe, it, expect } from 'vitest'

import {
  validateSourceCatalog,
} from '../../../scripts/data/source-catalog.mjs'

const baseCatalog = () => ({
  authorities: [
    { id: 'qul', label: 'QUL', url: 'https://qul.tarteel.ai/resources' },
    { id: 'quranatlas', label: 'QuranAtlas', url: 'https://quranatlas.test' },
  ],
  licenses: [
    { id: 'qul-open', label: 'QUL open resource', status: 'approved' },
    { id: 'blocked', label: 'Blocked source', status: 'disallowed' },
  ],
  verificationRules: {
    allowedLicenseStatuses: ['approved', 'restricted'],
    visibility: ['baseline', 'optional', 'internal'],
  },
  sources: [
    {
      id: 'qaloon',
      type: 'riwayah',
      label: 'Qaloon',
      providerId: 'qul',
      licenseId: 'qul-open',
      visibility: 'baseline',
      default: true,
      sourceUrl: 'https://example.test/qaloon.json',
      outputPath: 'riwayat/qaloon/{surah}.json',
    },
  ],
})

describe('source catalog validation', () => {
  it('accepts a complete approved baseline source', () => {
    expect(validateSourceCatalog(baseCatalog()).errors).toEqual([])
  })

  it('fails when a source references a missing provider', () => {
    const catalog = baseCatalog()
    catalog.sources[0].providerId = 'missing'
    expect(validateSourceCatalog(catalog).errors).toContain('source qaloon references missing provider missing')
  })

  it('fails when a source uses a disallowed license status', () => {
    const catalog = baseCatalog()
    catalog.sources[0].licenseId = 'blocked'
    expect(validateSourceCatalog(catalog).errors).toContain('source qaloon uses disallowed license status disallowed')
  })

  it('accepts sources without checksum metadata', () => {
    const catalog = baseCatalog()
    expect(validateSourceCatalog(catalog).errors).toEqual([])
  })

  it('fails when a default source is not baseline-visible', () => {
    const catalog = baseCatalog()
    catalog.sources[0].visibility = 'optional'
    expect(validateSourceCatalog(catalog).errors).toContain('source qaloon is default but visibility is optional')
  })

  it('fails when a fetchable source is missing normalized output metadata', () => {
    const catalog = baseCatalog()
    catalog.sources[0].fetch = {
      provider: 'quran-db-translation',
      url: 'https://example.test/qaloon.json',
    }
    expect(validateSourceCatalog(catalog).errors).toContain('source qaloon fetch missing normalizedPath')
  })

  it('requires QUL translation fetch metadata to identify resource and content ids', () => {
    const catalog = baseCatalog()
    catalog.sources[0].fetch = {
      provider: 'qul-translation',
      normalizedPath: 'data/normalized/translations/bridges.json',
      resourceUrl: 'https://qul.tarteel.ai/resources/translation/179',
      resourceId: 179,
    }
    expect(validateSourceCatalog(catalog).errors).toContain('source qaloon fetch missing contentResourceId')
  })
})
