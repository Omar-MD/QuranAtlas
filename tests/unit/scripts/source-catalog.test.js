import { describe, it, expect } from 'vitest'

import {
  validateSourceCatalog,
} from '../../../scripts/data/source-catalog.mjs'

const baseCatalog = () => ({
  authorities: [
    { id: 'qul', label: 'QUL', url: 'https://qul.tarteel.ai/resources' },
    { id: 'quranatlas', label: 'QuranAtlas', url: 'https://quranatlas.test' },
    { id: 'quranic-arabic-corpus', label: 'Quranic Arabic Corpus', url: 'https://corpus.quran.com' },
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

const searchCatalog = () => ({
  ...baseCatalog(),
  searchLicenses: [
    {
      id: 'search-qac-gpl-v3-terms',
      label: 'QAC GPL terms',
      status: 'restricted',
      noticeRequired: true,
      sourceAvailability: 'Official source page and local source-drop path are documented.',
    },
    {
      id: 'search-pack-metadata-quranatlas',
      label: 'QuranAtlas Search metadata',
      status: 'approved',
      noticeRequired: false,
      sourceAvailability: 'Committed pack metadata.',
    },
  ],
  searchSources: [
    {
      id: 'search-qac-morphology-0-4',
      type: 'search-morphology',
      label: 'QAC morphology',
      providerId: 'quranic-arabic-corpus',
      licenseId: 'search-qac-gpl-v3-terms',
      visibility: 'internal',
      sourceRiwayah: 'hafs',
      sourceUrl: 'https://corpus.quran.com/download/',
      outputPath: 'search-packs/packs/{contentHash}/morphology/qac-morphology.qas',
      expectedVersion: '0.4',
      coverage: { surahs: 114, ayahs: 6236, tokens: 77429, rows: 128219 },
      checksums: {
        algorithm: 'sha-256',
        accepted: ['a1d12923815341face765083805d2148ed2d9f5cc3f7d6665219d887675d8c46'],
      },
      manualSource: {
        dropPath: 'data/normalized/search/qac/quranic-corpus-morphology-0.4.txt',
        approvedFilenames: ['quranic-corpus-morphology-0.4.txt'],
      },
      licenseDecision: {
        status: 'resolved',
        mayShipDerivedFeature: true,
        sourceAvailabilityRequired: true,
      },
      sourceAvailability: 'Official source page and accepted checksum are recorded.',
    },
  ],
  searchVerification: {
    requiredSourceIds: ['search-qac-morphology-0-4'],
    requiredLicenseIds: ['search-qac-gpl-v3-terms', 'search-pack-metadata-quranatlas'],
    expectedCoverage: {
      'search-qac-morphology-0-4': { surahs: 114, ayahs: 6236, tokens: 77429, rows: 128219 },
    },
    morphology: {
      sourceId: 'search-qac-morphology-0-4',
      expectedVersion: '0.4',
      approvedFilenames: ['quranic-corpus-morphology-0.4.txt'],
      acceptedSha256: ['a1d12923815341face765083805d2148ed2d9f5cc3f7d6665219d887675d8c46'],
    },
  },
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

  it('validates Quran text asset defaults, slugs, templates, and catalog references', () => {
    const catalog = baseCatalog()
    catalog.quranTextAssets = {
      defaults: { qaloon: 'missing-style-v1' },
      assets: [
        {
          riwayah: 'qaloon',
          textStyleId: 'bad_style',
          providerId: 'missing-provider',
          licenseId: 'missing-license',
          outputPathTemplate: 'quran-text/qaloon/bad_style.json',
        },
      ],
    }

    expect(validateSourceCatalog(catalog).errors).toEqual(expect.arrayContaining([
      'text asset default qaloon references missing text style missing-style-v1',
      'text asset qaloon/bad_style has invalid textStyleId bad_style',
      'text asset qaloon/bad_style references missing provider missing-provider',
      'text asset qaloon/bad_style references missing license missing-license',
      'text asset qaloon/bad_style outputPathTemplate must be quran-text/qaloon/bad_style/{surah}.json',
    ]))
  })

  it('validates Mushaf asset defaults, edition slugs, quran.ws identity, and duplicate editions', () => {
    const catalog = baseCatalog()
    catalog.mushafAssets = {
      defaults: { qaloon: 'missing-edition-v1' },
      assets: [
        {
          riwayah: 'qaloon',
          mushafEditionId: 'bad_edition',
          providerId: 'qul',
          licenseId: 'qul-open',
          sourceSlug: 'qaloon',
          pageCount: 603,
        },
        {
          riwayah: 'qaloon',
          mushafEditionId: 'bad_edition',
          providerId: 'qul',
          licenseId: 'qul-open',
          sourceSlug: 'qaloon',
          pageCount: 603,
        },
      ],
    }

    expect(validateSourceCatalog(catalog).errors).toEqual(expect.arrayContaining([
      'mushaf asset default qaloon references missing edition missing-edition-v1',
      'mushaf asset qaloon/bad_edition has invalid mushafEditionId bad_edition',
      'mushaf asset qaloon/bad_edition pageCount must be 604',
      'mushaf asset qaloon/bad_edition providerId must be quran-ws',
      'mushaf asset qaloon/bad_edition licenseId must be quran-ws-free-use',
      'mushaf asset qaloon/bad_edition sourceSlug must be qalun',
      'mushaf asset qaloon/bad_edition is duplicated within qaloon',
    ]))
  })

  it('validates complete Search source catalog records', () => {
    expect(validateSourceCatalog(searchCatalog()).errors).toEqual([])
  })

  it('fails Search sources with missing checksums', () => {
    const catalog = searchCatalog()
    catalog.searchSources[0].checksums.accepted = []
    expect(validateSourceCatalog(catalog).errors).toContain('search source search-qac-morphology-0-4 missing accepted sha-256 checksum')
  })

  it('fails Search sources with missing licenses', () => {
    const catalog = searchCatalog()
    catalog.searchSources[0].licenseId = 'missing-license'
    expect(validateSourceCatalog(catalog).errors).toContain('search source search-qac-morphology-0-4 references missing license missing-license')
  })

  it('fails Search sources with wrong ayah coverage', () => {
    const catalog = searchCatalog()
    catalog.searchSources[0].coverage.ayahs = 6235
    expect(validateSourceCatalog(catalog).errors).toEqual(expect.arrayContaining([
      'search source search-qac-morphology-0-4 ayah coverage must be 6236',
      'search source search-qac-morphology-0-4 ayahs coverage must be 6236',
    ]))
  })

  it('fails Search morphology with unresolved license decisions', () => {
    const catalog = searchCatalog()
    catalog.searchSources[0].licenseDecision.status = 'pending'
    expect(validateSourceCatalog(catalog).errors).toContain('search morphology source search-qac-morphology-0-4 has unresolved license decision')
  })

  it('fails Search sources missing source availability notes', () => {
    const catalog = searchCatalog()
    catalog.searchSources[0].sourceAvailability = ''
    expect(validateSourceCatalog(catalog).errors).toContain('search source search-qac-morphology-0-4 missing source availability notes')
  })

  it('fails Search morphology with unapproved source filenames', () => {
    const catalog = searchCatalog()
    catalog.searchSources[0].manualSource.approvedFilenames = ['renamed.txt']
    expect(validateSourceCatalog(catalog).errors).toContain('search morphology source search-qac-morphology-0-4 has unapproved source filename renamed.txt')
  })
})
