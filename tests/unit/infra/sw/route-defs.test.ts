import { describe, it, expect } from 'vitest'
import {
  ROUTE_DEFS,
  CACHE_PREFIXES,
  routeFor,
  categoryFor,
  cacheNameFor,
  sumBytesForCategory,
  type Category,
} from '../../../../src/infra/sw/route-defs'
import { CACHE_DATASET } from '../../../../src/core/constants'

const u = (path: string) => new URL(path, 'http://example.test')

describe('ROUTE_DEFS table', () => {
  it('every route declares a category (null for always-on routes like fonts)', () => {
    for (const def of ROUTE_DEFS) {
      expect([
        'text-core',
        'text-riwayah',
        'text-translation',
        'text-tafsir',
        'text-index',
        'text-knowledge',
        'audio',
        'pages',
        'search',
        null,
      ]).toContain(def.category)
    }
  })

  it('text routes are source-aware and exclude audio, mushaf-pages, search-index', () => {
    expect(categoryFor(u('/dataset/riwayat/qaloon/001.json'))).toBe('text-riwayah')
    expect(categoryFor(u('/dataset/translations/saheeh/001.json'))).toBe('text-translation')
    expect(categoryFor(u('/dataset/tafsir/muyassar/001.json'))).toBe('text-tafsir')
    expect(categoryFor(u('/dataset/indexes/sources.json'))).toBe('text-index')
    expect(categoryFor(u('/dataset/indexes/source-assets.json'))).toBe('text-index')
    expect(categoryFor(u('/dataset/surahs.json'))).toBe('text-core')
    expect(categoryFor(u('/dataset/knowledge/ayah/002.json'))).toBe('text-knowledge')
    expect(categoryFor(u('/dataset/knowledge/passages/002.json'))).toBe('text-knowledge')
    expect(categoryFor(u('/dataset/knowledge/indexes/theme-to-ayah.json'))).toBe('text-knowledge')
    expect(categoryFor(u('/dataset/audio/alafasy/001.mp3'))).toBe('audio')
    expect(categoryFor(u('/dataset/mushaf-pages/hafs/pages/001.svg'))).toBe('pages')
    expect(categoryFor(u('/dataset/search-index.json'))).toBe('search')
  })

  it('audio routes split into mp3, timing, meta — all category=audio', () => {
    expect(categoryFor(u('/dataset/audio/alafasy/001.mp3'))).toBe('audio')
    expect(categoryFor(u('/dataset/audio/alafasy/timing/001.json'))).toBe('audio')
    expect(categoryFor(u('/dataset/audio/index.json'))).toBe('audio')
    expect(categoryFor(u('/dataset/audio/alafasy/manifest.json'))).toBe('audio')
  })

  it('per-reciter cacheName is a function that derives the reciter segment', () => {
    const def = routeFor(u('/dataset/audio/alafasy/001.mp3'))
    expect(def?.name).toBe('audio-mp3')
    expect(typeof def?.cacheName).toBe('function')
    expect(cacheNameFor(u('/dataset/audio/alafasy/001.mp3'))).toBe('qa-audio-alafasy-v1')
    expect(cacheNameFor(u('/dataset/audio/husary/001.mp3'))).toBe('qa-audio-husary-v1')
  })

  it('source-aware text routes use CACHE_DATASET (existing constant — no rename)', () => {
    expect(cacheNameFor(u('/dataset/surahs.json'))).toBe(CACHE_DATASET)
    expect(cacheNameFor(u('/dataset/tafsir/muyassar/001.json'))).toBe(CACHE_DATASET)
  })

  it('fonts route is always-on (category=null)', () => {
    const def = routeFor(u('/fonts/hafs.woff2'))
    expect(def?.name).toBe('fonts')
    expect(def?.category).toBeNull()
  })

  it('pages routes are active ship routes', () => {
    expect(ROUTE_DEFS.find(d => d.name === 'pages')?.roadmap).toBeFalsy()
  })

  it('roadmap routes keep only future route markers', () => {
    expect(ROUTE_DEFS.find(d => d.name === 'search')?.roadmap).toBe(true)
    expect(ROUTE_DEFS.find(d => d.name === 'text-core')?.roadmap).toBeFalsy()
  })

  it('CACHE_PREFIXES catches every cacheName the table emits', () => {
    const samples: { url: URL; expectedPrefix: string }[] = [
      { url: u('/dataset/surahs.json'), expectedPrefix: CACHE_DATASET },
      { url: u('/dataset/audio/alafasy/001.mp3'), expectedPrefix: 'qa-audio-' },
      { url: u('/dataset/mushaf-pages/hafs/pages/001.svg'), expectedPrefix: 'qa-pages-' },
      { url: u('/dataset/search-index.json'), expectedPrefix: 'qa-search-' },
      { url: u('/fonts/hafs.woff2'), expectedPrefix: 'qa-fonts-' },
    ]
    for (const { url, expectedPrefix } of samples) {
      const name = cacheNameFor(url)
      expect(name).not.toBeNull()
      expect(CACHE_PREFIXES.some(p => name!.startsWith(p))).toBe(true)
      expect(name!.startsWith(expectedPrefix)).toBe(true)
    }
  })

  it('first matching route wins — table order disambiguates overlap', () => {
    // /dataset/audio/index.json should match audio-meta, NOT text.
    expect(routeFor(u('/dataset/audio/index.json'))?.name).toBe('audio-meta')
  })

  it('returns null for unmatched URLs', () => {
    expect(routeFor(u('/api/v1/users'))).toBeNull()
    expect(categoryFor(u('/api/v1/users'))).toBeNull()
    expect(cacheNameFor(u('/api/v1/users'))).toBeNull()
  })
})

describe('sumBytesForCategory', () => {
  const manifest = {
    files: [
      { path: 'riwayat/hafs/001.json', lane: 'text', category: 'text-riwayah', bytes: 1500 },
      { path: 'translations/saheeh/001.json', lane: 'text', category: 'text-translation', bytes: 1400 },
      { path: 'surahs.json', lane: 'text', category: 'text-core', bytes: 800 },
      { path: 'tafsir/muyassar/001.json', lane: 'text', category: 'text-tafsir', bytes: 700 },
      { path: 'indexes/sources.json', lane: 'text', category: 'text-index', bytes: 200 },
      { path: 'knowledge/ayah/001.json', lane: 'knowledge', category: 'knowledge-ayah', bytes: 900 },
      { path: 'knowledge/passages/001.json', lane: 'knowledge', category: 'knowledge-passages', bytes: 600 },
      { path: 'knowledge/indexes/theme-to-ayah.json', lane: 'knowledge', category: 'knowledge-index', bytes: 300 },
      { path: 'mushaf-pages/qaloon/pages/001.svg', lane: 'pages', category: 'pages', bytes: 80_000 },
      { path: 'search-index.json', lane: 'search', category: 'search-index', bytes: 1_000_000 },
    ],
  }

  it.each<[Category, number]>([
    ['text',   1500 + 1400 + 800 + 700 + 200 + 900 + 600 + 300],
    ['audio',  0],
    ['pages',  80_000],
    ['search', 1_000_000],
  ])('sums bytes for category %s', (cat, expected) => {
    const { totalBytes } = sumBytesForCategory(manifest, cat)
    expect(totalBytes).toBe(expected)
  })

  it('emits matching URL list per category', () => {
    const { urls } = sumBytesForCategory(manifest, 'text')
    expect(urls).toEqual(expect.arrayContaining([
      '/dataset/riwayat/hafs/001.json',
      '/dataset/translations/saheeh/001.json',
      '/dataset/tafsir/muyassar/001.json',
      '/dataset/indexes/sources.json',
      '/dataset/surahs.json',
      '/dataset/knowledge/ayah/001.json',
      '/dataset/knowledge/passages/001.json',
      '/dataset/knowledge/indexes/theme-to-ayah.json',
    ]))
    expect(urls).not.toEqual(expect.arrayContaining([
      '/dataset/audio/alafasy/001.mp3',
    ]))
  })

  it('treats missing entry bytes as zero', () => {
    const manifestWithoutBytes = { files: manifest.files.map(({ bytes, ...entry }) => entry) }
    const { urls, totalBytes } = sumBytesForCategory(manifestWithoutBytes, 'text')
    expect(totalBytes).toBe(0)
    expect(urls.length).toBeGreaterThan(0)
  })
})
