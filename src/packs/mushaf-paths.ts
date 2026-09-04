export const MUSHAF_PAGE_COUNT = 604

export type MushafPackIdentity = {
  riwayah: string
  mushafEditionId: string
}

export function mushafManifestUrl({ riwayah, mushafEditionId }: MushafPackIdentity): string {
  return `/dataset/mushaf-pages/${riwayah}/${mushafEditionId}/manifest.json`
}

export function mushafPageUrl({ riwayah, mushafEditionId }: MushafPackIdentity, page: number): string {
  if (!Number.isInteger(page) || page < 1 || page > MUSHAF_PAGE_COUNT) {
    throw new Error(`Invalid Mushaf page number: ${page}`)
  }
  return `/dataset/mushaf-pages/${riwayah}/${mushafEditionId}/pages/${String(page).padStart(3, '0')}.svg`
}

export function resolveMushafEditionAssetUrl(
  { riwayah, mushafEditionId }: MushafPackIdentity,
  assetPath: string,
): string {
  if (!isMushafIdentityPart(riwayah) || !isMushafIdentityPart(mushafEditionId)) {
    throw new Error('Invalid React Mushaf edition identity')
  }
  if (!/^pages\/\d{3}-\d+\.webp$/.test(assetPath)) {
    throw new Error(`Invalid external Mushaf asset path: ${assetPath}`)
  }
  return `/dataset/mushaf-pages/${riwayah}/${mushafEditionId}/${assetPath}`
}

function isMushafIdentityPart(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(value)
}

function mushafPathname(url: string): string {
  const parsed = new URL(url, 'https://quranatlas.local')
  if (parsed.origin !== 'https://quranatlas.local') {
    throw new Error(`React Mushaf URLs must be same-origin dataset paths: ${url}`)
  }
  let pathname = parsed.pathname
  try {
    pathname = decodeURIComponent(pathname)
  } catch {
    throw new Error(`Invalid React Mushaf URL: ${url}`)
  }
  if (pathname.includes('..')) throw new Error(`Invalid React Mushaf URL: ${url}`)
  return pathname
}

export function isLegacyMushafPageUrl(url: string): boolean {
  return /^\/dataset\/mushaf-pages\/[^/]+\/(?:manifest\.json|pages\/\d{3}\.svg)$/.test(mushafPathname(url))
}

export function assertReactMushafUrl(url: string): void {
  if (isLegacyMushafPageUrl(url)) throw new Error(`React Mushaf paths must be edition-aware: ${url}`)
  if (!/^\/dataset\/mushaf-pages\/[^/]+\/[^/]+\/(?:manifest\.json|pages\/\d{3}(?:\.svg|-\d+\.webp))$/.test(mushafPathname(url))) {
    throw new Error(`Invalid React Mushaf URL: ${url}`)
  }
}
