// Mushaf edition rendition contract shared by the dataset scripts. Mirrors
// src/packs/mushaf-paths.ts, the TS-side grammar owner.
export const MUSHAF_PREVIEW_RENDITION_WIDTH = 1280
export const MUSHAF_FULL_RENDITION_WIDTH = 2136

export function mushafWebpPageAssetPath(page, width) {
  return `pages/${String(page).padStart(3, '0')}-${width}.webp`
}

// Private (local-PDF) edition media contract — the single source for the
// script bodies that used to hardcode these values across five files
// (audit §5, D40).
export const MUSHAF_PRIVATE_EDITION_ID = 'qalun-furatiyyah-2023-v1'
export const MUSHAF_PRIVATE_RELEASE_TAG = 'mushaf-qalun-furatiyyah-2023-v1'
export const MUSHAF_PRIVATE_ASSET_NAME = 'qalun-furatiyyah-2023-v1-normalized-v1.tar'
export const MUSHAF_PRIVATE_MEDIA_KIND = 'external-image'
export const MUSHAF_PRIVATE_MIME_TYPE = 'image/webp'
export const MUSHAF_PRIVATE_RENDER_DPI = 300
export const MUSHAF_PRIVATE_ENCODER = { command: 'cwebp', quality: 88, method: 6 }
export const MUSHAF_PRIVATE_FILE_COUNT = 1209

export function mushafRenditionWidthForRole(role) {
  return role === 'preview' ? MUSHAF_PREVIEW_RENDITION_WIDTH : MUSHAF_FULL_RENDITION_WIDTH
}

export function isMushafPrivateEncoderPolicy(encoder) {
  return (
    encoder?.command === MUSHAF_PRIVATE_ENCODER.command &&
    encoder?.quality === MUSHAF_PRIVATE_ENCODER.quality &&
    encoder?.method === MUSHAF_PRIVATE_ENCODER.method
  )
}

export function isMushafMediaRenditionPolicy(renditions) {
  return (
    Array.isArray(renditions) &&
    renditions.length === 2 &&
    renditions[0]?.role === 'preview' &&
    renditions[0]?.width === MUSHAF_PREVIEW_RENDITION_WIDTH &&
    renditions[1]?.role === 'full' &&
    renditions[1]?.width === MUSHAF_FULL_RENDITION_WIDTH
  )
}

// Union of the four former per-script rendition-descriptor validations
// (mushaf-pages build, release-archive, check-react-mushaf-indexes, sources
// catalog — audit D40). `label` prefixes the failure text, e.g.
// `Private Mushaf page 12 preview` or `page 12 preview`. Rules merged, none
// dropped. `role` is deliberately NOT validated here: the emitted V2
// manifest carries role-less sources selected by width, while the import.json
// descriptors carry `role` — the role-bearing call sites enforce it where the
// field exists.
export function mushafRenditionDescriptorFailure(descriptor, page, role, label) {
  if (!descriptor || typeof descriptor !== 'object') return `${label} rendition descriptor is missing`
  const width = mushafRenditionWidthForRole(role)
  if (descriptor.assetPath !== mushafWebpPageAssetPath(page, width)) return `${label} rendition assetPath is invalid`
  if (!Number.isSafeInteger(descriptor.bytes) || descriptor.bytes <= 0) return `${label} rendition bytes are invalid`
  if (typeof descriptor.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(descriptor.sha256))
    return `${label} rendition sha256 is invalid`
  if (descriptor.width !== width || !Number.isInteger(descriptor.height) || descriptor.height <= 0)
    return `${label} rendition dimensions are invalid`
  if (descriptor.mimeType !== MUSHAF_PRIVATE_MIME_TYPE) return `${label} rendition MIME type is invalid`
  return null
}

export function validateMushafRenditionDescriptor(descriptor, page, role, label) {
  const failure = mushafRenditionDescriptorFailure(descriptor, page, role, label)
  if (failure) throw new Error(failure)
  return {
    assetPath: descriptor.assetPath,
    bytes: descriptor.bytes,
    sha256: descriptor.sha256,
    width: descriptor.width,
    height: descriptor.height,
    mimeType: descriptor.mimeType,
  }
}
