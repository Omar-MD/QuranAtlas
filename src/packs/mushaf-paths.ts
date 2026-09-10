export const MUSHAF_PAGE_COUNT = 604

export const MUSHAF_PREVIEW_RENDITION_WIDTH = 1280
export const MUSHAF_FULL_RENDITION_WIDTH = 2136

export type MushafPackIdentity = {
  riwayah: string
  mushafEditionId: string
}

export function isMushafIdentityPart(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(value)
}

export function mushafEditionAssetUrl({ riwayah, mushafEditionId }: MushafPackIdentity, assetPath: string): string {
  return `/dataset/mushaf-pages/${riwayah}/${mushafEditionId}/${assetPath}`
}

export function mushafManifestUrl(identity: MushafPackIdentity): string {
  return mushafEditionAssetUrl(identity, 'manifest.json')
}

export function mushafSvgPageAssetPath(page: number): string {
  return `pages/${String(page).padStart(3, '0')}.svg`
}

export function mushafWebpPageAssetPath(page: number, width: number): string {
  return `pages/${String(page).padStart(3, '0')}-${width}.webp`
}

export function mushafPageUrl(identity: MushafPackIdentity, page: number): string {
  if (!Number.isInteger(page) || page < 1 || page > MUSHAF_PAGE_COUNT) {
    throw new Error(`Invalid Mushaf page number: ${page}`)
  }
  return mushafEditionAssetUrl(identity, mushafSvgPageAssetPath(page))
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
  return mushafEditionAssetUrl({ riwayah, mushafEditionId }, assetPath)
}

// Matches every URL shape an edition pack can contain: the manifest, one
// inline SVG per page (v1 editions), and a preview (1280px) plus full
// (2136px) WebP pair per page (v2 editions).
export function mushafPagesUrlPattern(identity: MushafPackIdentity): RegExp {
  return new RegExp(
    `^/dataset/mushaf-pages/${escapeRegExp(identity.riwayah)}/${escapeRegExp(identity.mushafEditionId)}/` +
      `(?:manifest\\.json|pages/\\d{3}\\.svg|pages/\\d{3}-(?:${MUSHAF_PREVIEW_RENDITION_WIDTH}|${MUSHAF_FULL_RENDITION_WIDTH})\\.webp)$`,
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
