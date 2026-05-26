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

function mushafPathname(url: string): string {
  return new URL(url, 'https://quranatlas.local').pathname
}

export function isLegacyMushafPageUrl(url: string): boolean {
  return /^\/dataset\/mushaf-pages\/[^/]+\/(?:manifest\.json|pages\/\d{3}\.svg)$/.test(mushafPathname(url))
}

export function assertReactMushafUrl(url: string): void {
  if (isLegacyMushafPageUrl(url)) throw new Error(`React Mushaf paths must be edition-aware: ${url}`)
  if (!/^\/dataset\/mushaf-pages\/[^/]+\/[^/]+\/(?:manifest\.json|pages\/\d{3}\.svg)$/.test(mushafPathname(url))) {
    throw new Error(`Invalid React Mushaf URL: ${url}`)
  }
}
