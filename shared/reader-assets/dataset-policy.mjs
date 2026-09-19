// Keep this callback self-contained: Workbox serializes it into sw.js. It is
// also used by release validation and retirement so their URL rules agree.
// Mushaf discovery has its own NetworkFirst route; all other reader data is
// durable CacheFirst data. Supported installed editions must remain usable
// offline without fetching a new manifest to approve their URLs.
export function readerDatasetCacheMatch({ url, sameOrigin }) {
  if (sameOrigin === false) return false
  return /^\/dataset\/(?:(?:surahs|juz|manifest|provenance)\.json|indexes\/(?:sources|text-assets|riwayah-packages)\.json|translations\/_verse-aliases\.json|(?:quran-text\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*|translations\/[a-z0-9][a-z0-9-]*)\/(?:00[1-9]|0[1-9]\d|10\d|11[0-4])\.json|mushaf-pages\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*\/(?:manifest\.json|pages\/(?:00[1-9]|0[1-9]\d|[1-5]\d\d|60[0-4])(?:\.svg|-(?:1280|2136)\.webp)))$/.test(
    url.pathname,
  )
}

export function isReaderDatasetPath(pathname) {
  return (
    pathname === '/dataset/indexes/mushaf-assets.json' ||
    readerDatasetCacheMatch({ url: new URL(pathname, 'https://quranatlas.local'), sameOrigin: true })
  )
}
