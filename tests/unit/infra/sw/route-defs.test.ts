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
        'text-index',
        'text-knowledge',
        'pages',
        'search',
        null,
      ]).toContain(def.category)
    }
  })

  it('text routes are source-aware and exclude removed audio routes plus mushaf-pages/search-index', () => {
    expect(categoryFor(u('/dataset/riwayat/qaloon/001.json'))).toBe('text-riwayah')
    expect(categoryFor(u('/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json'))).toBe('text-riwayah')
    expect(categoryFor(u('/dataset/translations/bridges/001.json'))).toBe('text-translation')
    expect(categoryFor(u('/dataset/tafsir/muyassar/001.json'))).toBeNull()
    expect(ROUTE_DEFS.map((def) => def.category)).not.toContain('text-tafsir')
    expect(categoryFor(u('/dataset/indexes/sources.json'))).toBe('text-index')
    expect(categoryFor(u('/dataset/indexes/source-assets.json'))).toBe('text-index')
    expect(categoryFor(u('/dataset/indexes/riwayah-packages.json'))).toBe('text-index')
    expect(categoryFor(u('/dataset/indexes/text-assets.json'))).toBe('text-index')
    expect(categoryFor(u('/dataset/indexes/mushaf-assets.json'))).toBe('text-index')
    expect(categoryFor(u('/dataset/surahs.json'))).toBe('text-core')
    expect(categoryFor(u('/dataset/knowledge/ayah/002.json'))).toBe('text-knowledge')
    expect(categoryFor(u('/dataset/knowledge/passages/002.json'))).toBe('text-knowledge')
    expect(categoryFor(u('/dataset/knowledge/indexes/theme-to-ayah.json'))).toBe('text-knowledge')
    expect(categoryFor(u('/dataset/audio/alafasy/001.mp3'))).toBeNull()
    expect(categoryFor(u('/dataset/mushaf-pages/hafs/pages/001.svg'))).toBe('pages')
    expect(categoryFor(u('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg'))).toBe('pages')
    expect(categoryFor(u('/dataset/search-index.json'))).toBe('search')
  })

  it('removed audio URLs no longer produce route matches or cache names', () => {
    expect(routeFor(u('/dataset/audio/alafasy/001.mp3'))).toBeNull()
    expect(routeFor(u('/dataset/audio/alafasy/timing/001.json'))).toBeNull()
    expect(routeFor(u('/dataset/audio/index.json'))).toBeNull()
    expect(routeFor(u('/dataset/audio/alafasy/manifest.json'))).toBeNull()
    expect(cacheNameFor(u('/dataset/audio/alafasy/001.mp3'))).toBeNull()
  })

  it('source-aware text routes use CACHE_DATASET (existing constant — no rename)', () => {
    expect(cacheNameFor(u('/dataset/surahs.json'))).toBe(CACHE_DATASET)
    expect(cacheNameFor(u('/dataset/tafsir/muyassar/001.json'))).toBeNull()
    expect(cacheNameFor(u('/dataset/indexes/riwayah-packages.json'))).toBe(CACHE_DATASET)
    expect(cacheNameFor(u('/dataset/indexes/text-assets.json'))).toBe(CACHE_DATASET)
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

  it('uses coherent expiration caps for routes sharing a cache name', () => {
    const capsByCache = new Map<string, number>()
    for (const def of ROUTE_DEFS) {
      if (typeof def.cacheName !== 'string') continue
      const previous = capsByCache.get(def.cacheName)
      if (previous !== undefined) {
        expect(def.maxEntries).toBe(previous)
      } else {
        capsByCache.set(def.cacheName, def.maxEntries)
      }
    }
  })

  it('keeps legacy and edition-aware Mushaf page caches distinct', () => {
    expect(cacheNameFor(u('/dataset/mushaf-pages/qaloon/manifest.json'))).toBe('qa-pages-qaloon-v1')
    expect(cacheNameFor(u('/dataset/mushaf-pages/qaloon/pages/001.svg'))).toBe('qa-pages-qaloon-v1')
    expect(cacheNameFor(u('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json'))).toBe('qa-pages-qaloon-qalun-quran-ws-v1-v1')
  })

  it('first matching route wins — table order disambiguates overlap', () => {
    // source-assets/riwayah-packages are index routes, not generic text-core.
    expect(routeFor(u('/dataset/indexes/source-assets.json'))?.name).toBe('text-index')
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
      { path: 'quran-text/qaloon/uthmani-kfgqpc-v1/001.json', lane: 'text', category: 'text-riwayah', bytes: 1600 },
      { path: 'translations/bridges/001.json', lane: 'text', category: 'text-translation', bytes: 1400 },
      { path: 'surahs.json', lane: 'text', category: 'text-core', bytes: 800 },
      { path: 'indexes/sources.json', lane: 'text', category: 'text-index', bytes: 200 },
      { path: 'indexes/riwayah-packages.json', lane: 'text', category: 'text-index', bytes: 250 },
      { path: 'indexes/text-assets.json', lane: 'text', category: 'text-index', bytes: 260 },
      { path: 'indexes/mushaf-assets.json', lane: 'text', category: 'text-index', bytes: 270 },
      { path: 'knowledge/ayah/001.json', lane: 'knowledge', category: 'knowledge-ayah', bytes: 900 },
      { path: 'knowledge/passages/001.json', lane: 'knowledge', category: 'knowledge-passages', bytes: 600 },
      { path: 'knowledge/indexes/theme-to-ayah.json', lane: 'knowledge', category: 'knowledge-index', bytes: 300 },
      { path: 'mushaf-pages/qaloon/pages/001.svg', lane: 'pages', category: 'pages', bytes: 80_000 },
      { path: 'mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg', lane: 'pages', category: 'pages', bytes: 90_000 },
      { path: 'search-index.json', lane: 'search', category: 'search-index', bytes: 1_000_000 },
    ],
  }

  it.each<[Category, number]>([
    ['text',   1500 + 1600 + 1400 + 800 + 200 + 250 + 260 + 270 + 900 + 600 + 300],
    ['pages',  80_000 + 90_000],
    ['search', 1_000_000],
  ])('sums bytes for category %s', (cat, expected) => {
    const { totalBytes } = sumBytesForCategory(manifest, cat)
    expect(totalBytes).toBe(expected)
  })

  it('emits matching URL list per category', () => {
    const { urls } = sumBytesForCategory(manifest, 'text')
    expect(urls).toEqual(expect.arrayContaining([
      '/dataset/riwayat/hafs/001.json',
      '/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json',
      '/dataset/translations/bridges/001.json',
      '/dataset/indexes/sources.json',
      '/dataset/indexes/riwayah-packages.json',
      '/dataset/indexes/text-assets.json',
      '/dataset/indexes/mushaf-assets.json',
      '/dataset/surahs.json',
      '/dataset/knowledge/ayah/001.json',
      '/dataset/knowledge/passages/001.json',
      '/dataset/knowledge/indexes/theme-to-ayah.json',
    ]))
    expect(urls).not.toEqual(expect.arrayContaining([
      '/dataset/audio/alafasy/001.mp3',
      '/dataset/tafsir/muyassar/001.json',
    ]))
  })

  it('treats missing entry bytes as zero', () => {
    const manifestWithoutBytes = { files: manifest.files.map(({ bytes, ...entry }) => entry) }
    const { urls, totalBytes } = sumBytesForCategory(manifestWithoutBytes, 'text')
    expect(totalBytes).toBe(0)
    expect(urls.length).toBeGreaterThan(0)
  })
})
