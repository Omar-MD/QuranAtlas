export const MUSHAF_PAGE_COUNT = 604

export const MUSHAF_PREVIEW_RENDITION_WIDTH = 1280
export const MUSHAF_FULL_RENDITION_WIDTH = 2136

export type MushafRenditionWidth = 1280 | 2136

export type MushafUnitRect = {
  x: number
  y: number
  width: number
  height: number
}

export type MushafPackIdentity = {
  riwayah: string
  mushafEditionId: string
}

const MUSHAF_PAGE_NUMBER_PATTERN = '(?:00[1-9]|0[1-9]\\d|[1-5]\\d\\d|60[0-4])'
const MUSHAF_RENDITION_WIDTH_PATTERN = `(?:${MUSHAF_PREVIEW_RENDITION_WIDTH}|${MUSHAF_FULL_RENDITION_WIDTH})`
const MUSHAF_ASSET_PATH_PATTERN = new RegExp(
  `^(?:manifest\\.json|pages/${MUSHAF_PAGE_NUMBER_PATTERN}\\.svg|pages/${MUSHAF_PAGE_NUMBER_PATTERN}-(?:${MUSHAF_RENDITION_WIDTH_PATTERN})\\.webp)$`,
)

export function isMushafIdentityPart(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(value)
}

export function isMushafUnitRect(value: unknown): value is MushafUnitRect {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const rect = value as Partial<MushafUnitRect>
  return (
    [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    (rect.x ?? 0) >= 0 &&
    (rect.y ?? 0) >= 0 &&
    (rect.width ?? 0) > 0 &&
    (rect.height ?? 0) > 0 &&
    (rect.x ?? 0) + (rect.width ?? 0) <= 1 &&
    (rect.y ?? 0) + (rect.height ?? 0) <= 1
  )
}

export function assertMushafUnitRect(value: unknown, label = 'Mushaf unit rect'): asserts value is MushafUnitRect {
  if (!isMushafUnitRect(value)) throw new Error(`${label} must be a non-empty unit rectangle`)
}

export function isMushafAssetPath(value: string): boolean {
  return MUSHAF_ASSET_PATH_PATTERN.test(value)
}

export function mushafEditionAssetUrl({ riwayah, mushafEditionId }: MushafPackIdentity, assetPath: string): string {
  if (!isMushafIdentityPart(riwayah) || !isMushafIdentityPart(mushafEditionId)) {
    throw new Error('Invalid Mushaf edition identity')
  }
  if (!isMushafAssetPath(assetPath)) throw new Error(`Invalid Mushaf asset path: ${assetPath}`)
  return `/dataset/mushaf-pages/${riwayah}/${mushafEditionId}/${assetPath}`
}

export function mushafManifestUrl(identity: MushafPackIdentity): string {
  return mushafEditionAssetUrl(identity, 'manifest.json')
}

export function mushafSvgPageAssetPath(page: number): string {
  assertMushafPageNumber(page)
  return `pages/${String(page).padStart(3, '0')}.svg`
}

export function mushafWebpPageAssetPath(page: number, width: number): string {
  assertMushafPageNumber(page)
  if (!isMushafRenditionWidth(width)) throw new Error(`Invalid Mushaf rendition width: ${width}`)
  return `pages/${String(page).padStart(3, '0')}-${width}.webp`
}

export function isMushafRenditionWidth(value: number): value is MushafRenditionWidth {
  return value === MUSHAF_PREVIEW_RENDITION_WIDTH || value === MUSHAF_FULL_RENDITION_WIDTH
}

export function mushafPageUrl(identity: MushafPackIdentity, page: number): string {
  assertMushafPageNumber(page)
  return mushafEditionAssetUrl(identity, mushafSvgPageAssetPath(page))
}

export function resolveMushafEditionAssetUrl(
  { riwayah, mushafEditionId }: MushafPackIdentity,
  assetPath: string,
): string {
  if (!isMushafIdentityPart(riwayah) || !isMushafIdentityPart(mushafEditionId)) {
    throw new Error('Invalid React Mushaf edition identity')
  }
  if (!isMushafAssetPath(assetPath) || !assetPath.startsWith('pages/') || !assetPath.endsWith('.webp')) {
    throw new Error(`Invalid external Mushaf asset path: ${assetPath}`)
  }
  return mushafEditionAssetUrl({ riwayah, mushafEditionId }, assetPath)
}

// Matches every URL shape an edition pack can contain: the manifest, one
// inline SVG per page (v1 editions), and a preview (1280px) plus full
// (2136px) WebP pair per page (v2 editions).
export function mushafPagesUrlPattern(identity: MushafPackIdentity): RegExp {
  if (!isMushafIdentityPart(identity.riwayah) || !isMushafIdentityPart(identity.mushafEditionId)) {
    throw new Error('Invalid Mushaf edition identity')
  }
  return new RegExp(
    `^/dataset/mushaf-pages/${escapeRegExp(identity.riwayah)}/${escapeRegExp(identity.mushafEditionId)}/` +
      `(?:manifest\\.json|pages/${MUSHAF_PAGE_NUMBER_PATTERN}\\.svg|pages/${MUSHAF_PAGE_NUMBER_PATTERN}-(?:${MUSHAF_RENDITION_WIDTH_PATTERN})\\.webp)$`,
  )
}

function assertMushafPageNumber(page: number): asserts page is number {
  if (!Number.isInteger(page) || page < 1 || page > MUSHAF_PAGE_COUNT) {
    throw new Error(`Invalid Mushaf page number: ${page}`)
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
