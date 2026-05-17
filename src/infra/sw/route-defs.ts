/**
 * Per-asset-class route definitions for the QuranAtlas service worker.
 * Pure module — no workbox imports — so window-side code (offline-selector,
 * data/offline.ts) can read the same table the SW uses for registration.
 *
 * Audit P2.14 / R-11 / C-4 / CC-7: single declarative source replaces the
 * pre-N21 ad-hoc registerRoute calls inline in sw.js.
 */

import { CACHE_DATASET, DATASET_RIWAYAH_PACKAGES_PATH } from '../../core/constants'

export type Category = 'text' | 'pages' | 'search'
export type TextCategory =
  | 'text-core'
  | 'text-riwayah'
  | 'text-translation'
  | 'text-tafsir'
  | 'text-index'
  | 'text-knowledge'
export type RouteCategory = Category | TextCategory

/** Categories the offline-selector exposes. `null` route category = always-on. */
export const CATEGORIES: readonly Category[] = ['text', 'pages', 'search'] as const
export const TEXT_ROUTE_CATEGORIES: readonly TextCategory[] = [
  'text-core',
  'text-riwayah',
  'text-translation',
  'text-tafsir',
  'text-index',
  'text-knowledge',
] as const

export type StrategyKind = 'NetworkFirst' | 'CacheFirst'

export type RouteDef = {
  /** Stable identifier — debug, tests. */
  name: string
  /** URL predicate. Same shape workbox accepts. */
  match: (ctx: { url: URL }) => boolean
  strategy: StrategyKind
  /** Static cache name OR derive from the URL (for per-riwayah asset groups). */
  cacheName: string | ((url: URL) => string)
  maxEntries: number
  /** Days. Workbox uses seconds — multiplied at registration time. */
  maxAgeDays: number
  purgeOnQuotaError?: boolean
  /** Selector category. `null` = always-on (e.g. fonts). */
  category: RouteCategory | null
  /** True for routes registered ahead of their consumer (for example search-index). */
  roadmap?: boolean
}

const pagesRiwayahFromUrl = (url: URL): string => {
  const parts = url.pathname.split('/')
  return parts[3] || 'unknown'
}

export const ROUTE_DEFS: readonly RouteDef[] = [
  {
    name: 'text-riwayah',
    match: ({ url }) => /^\/dataset\/riwayat\/[^/]+\/\d{3}\.json$/.test(url.pathname),
    strategy: 'NetworkFirst',
    cacheName: CACHE_DATASET,
    maxEntries: 140,
    maxAgeDays: 365,
    category: 'text-riwayah',
  },
  {
    name: 'text-translation',
    match: ({ url }) => /^\/dataset\/translations\/[^/]+\/\d{3}\.json$/.test(url.pathname),
    strategy: 'NetworkFirst',
    cacheName: CACHE_DATASET,
    maxEntries: 140,
    maxAgeDays: 365,
    category: 'text-translation',
  },
  {
    name: 'text-tafsir',
    match: ({ url }) => /^\/dataset\/tafsir\/[^/]+\/\d{3}\.json$/.test(url.pathname),
    strategy: 'NetworkFirst',
    cacheName: CACHE_DATASET,
    maxEntries: 140,
    maxAgeDays: 365,
    category: 'text-tafsir',
  },
  {
    name: 'text-index',
    match: ({ url }) =>
      url.pathname === '/dataset/indexes/sources.json' ||
      url.pathname === '/dataset/indexes/source-assets.json' ||
      url.pathname === DATASET_RIWAYAH_PACKAGES_PATH ||
      url.pathname === '/dataset/provenance.json' ||
      url.pathname === '/dataset/manifest.json',
    strategy: 'NetworkFirst',
    cacheName: CACHE_DATASET,
    maxEntries: 16,
    maxAgeDays: 365,
    category: 'text-index',
  },
  {
    name: 'text-core',
    match: ({ url }) =>
      url.pathname === '/dataset/surahs.json' ||
      url.pathname === '/dataset/juz.json' ||
      url.pathname === '/dataset/translations/_verse-map.json' ||
      url.pathname === '/dataset/translations/_verse-aliases.json',
    strategy: 'NetworkFirst',
    cacheName: CACHE_DATASET,
    maxEntries: 16,
    maxAgeDays: 365,
    category: 'text-core',
  },
  {
    name: 'text-knowledge',
    match: ({ url }) =>
      /^\/dataset\/knowledge\/(?:ayah|passages)\/\d{3}\.json$/.test(url.pathname) ||
      /^\/dataset\/knowledge\/indexes\/[^/]+\.json$/.test(url.pathname),
    strategy: 'NetworkFirst',
    cacheName: CACHE_DATASET,
    maxEntries: 260,
    maxAgeDays: 365,
    category: 'text-knowledge',
  },
  {
    name: 'pages',
    match: ({ url }) => /^\/dataset\/mushaf-pages\/[^/]+\/.+$/.test(url.pathname),
    strategy: 'CacheFirst',
    cacheName: (url) => `qa-pages-${pagesRiwayahFromUrl(url)}-v1`,
    maxEntries: 700,
    maxAgeDays: 365,
    purgeOnQuotaError: true,
    category: 'pages',
  },
  {
    name: 'search',
    match: ({ url }) => url.pathname === '/dataset/search-index.json',
    strategy: 'CacheFirst',
    cacheName: 'qa-search-v1',
    maxEntries: 4,
    maxAgeDays: 90,
    category: 'search',
    roadmap: true,
  },
  {
    name: 'fonts',
    match: ({ url }) => url.pathname.startsWith('/fonts/') && url.pathname.endsWith('.woff2'),
    strategy: 'CacheFirst',
    cacheName: 'qa-fonts-v1',
    maxEntries: 10,
    maxAgeDays: 365,
    category: null,
  },
] as const

/**
 * Cache-name prefixes that activate-cleanup must preserve. Union of every
 * static cacheName plus dynamic-cacheName prefixes for active asset groups.
 */
export const CACHE_PREFIXES: readonly string[] = [
  'workbox-precache',
  CACHE_DATASET,
  'qa-fonts-',
  'qa-pages-',
  'qa-search-',
] as const

/** First matching route wins (table order). null when no route matches. */
export function routeFor(url: URL): RouteDef | null {
  for (const def of ROUTE_DEFS) {
    if (def.match({ url })) return def
  }
  return null
}

export function categoryFor(url: URL): RouteCategory | null {
  const def = routeFor(url)
  return def ? def.category : null
}

export function cacheNameFor(url: URL): string | null {
  const def = routeFor(url)
  if (!def) return null
  return typeof def.cacheName === 'function' ? def.cacheName(url) : def.cacheName
}

/**
 * Sum bytes for every manifest entry whose URL routes to the given category.
 * Inventory manifests carry bytes on each file entry.
 */
export function sumBytesForCategory(
  manifest: { files: Array<{ path: string; lane: string; category: string; bytes?: number }> },
  category: Category,
  origin = 'http://localhost'
): { urls: string[]; totalBytes: number } {
  const urls: string[] = []
  let totalBytes = 0
  for (const file of manifest.files) {
    const include =
      (category === 'text' && (file.lane === 'text' || file.lane === 'knowledge')) ||
      (category === 'search' && file.lane === 'search') ||
      (category === 'pages' && categoryFor(new URL(`/dataset/${file.path}`, origin)) === category)
    if (include) {
      urls.push(`/dataset/${file.path}`)
      totalBytes += typeof file.bytes === 'number' ? file.bytes : 0
    }
  }
  return { urls, totalBytes }
}
