import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = new URL('..', import.meta.url).pathname
const indexPath = join(repoRoot, 'public/dataset/indexes/mushaf-assets.json')

function isEditionAwareMushafUrl(url) {
  const pathname = new URL(url, 'https://quranatlas.local').pathname
  return /^\/dataset\/mushaf-pages\/[^/]+\/[^/]+\/(?:manifest\.json|pages\/(?:\d{3}|\{page\})(?:\.svg|-\d+\.webp))$/.test(pathname)
}

function isUnitRect(value) {
  return value && typeof value === 'object'
    && ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(value[key]))
    && value.x >= 0 && value.y >= 0 && value.width > 0 && value.height > 0
    && value.x + value.width <= 1 && value.y + value.height <= 1
}

function descriptorFailure(descriptor, page, role) {
  if (!descriptor || typeof descriptor !== 'object') return `page ${page} ${role} descriptor is missing`
  const expectedPath = `pages/${String(page).padStart(3, '0')}-${descriptor.width}.webp`
  if (descriptor.assetPath !== expectedPath) return `page ${page} ${role} assetPath is invalid`
  if (!Number.isInteger(descriptor.bytes) || descriptor.bytes <= 0) return `page ${page} ${role} bytes are invalid`
  if (!/^[a-f0-9]{64}$/.test(descriptor.sha256 ?? '')) return `page ${page} ${role} sha256 is invalid`
  if (!Number.isInteger(descriptor.width) || descriptor.width <= 0 || !Number.isInteger(descriptor.height) || descriptor.height <= 0) return `page ${page} ${role} dimensions are invalid`
  if (descriptor.mimeType !== 'image/webp') return `page ${page} ${role} MIME type is invalid`
  return null
}

export function validateMushafManifestData(manifest) {
  const failures = []
  if (manifest?.version !== 2) return failures
  if (manifest.pageCount !== 604 || !Array.isArray(manifest.pages) || manifest.pages.length !== 604) return ['V2 Mushaf manifest must contain 604 pages.']
  for (let index = 0; index < manifest.pages.length; index += 1) {
    const page = index + 1
    const entry = manifest.pages[index]
    if (entry?.page !== page) failures.push(`page ${page} has an invalid page number`)
    if (!Number.isInteger(entry?.firstVerse?.surah) || !Number.isInteger(entry?.firstVerse?.verse)) failures.push(`page ${page} firstVerse is invalid`)
    if (!isUnitRect(entry?.framing?.textFrame)) failures.push(`page ${page} textFrame is not contained by the Full frame`)
    if (!['left', 'right', 'none'].includes(entry?.framing?.sideLane)) failures.push(`page ${page} sideLane is invalid`)
    if (entry?.media?.kind !== 'external-image') failures.push(`page ${page} media kind is invalid`)
    const sourceDescriptors = entry?.media?.sources
    if (!Array.isArray(sourceDescriptors) || sourceDescriptors.length !== 2) {
      failures.push(`page ${page} sources are incomplete`)
      continue
    }
    const preview = sourceDescriptors.find((descriptor) => descriptor?.width === 1280)
    const full = sourceDescriptors.find((descriptor) => descriptor?.width === 2136)
    for (const [role, descriptor] of [['preview', preview], ['full', full]]) {
      const failure = descriptorFailure(descriptor, page, role)
      if (failure) failures.push(failure)
    }
    if (JSON.stringify(entry.media.fallback) !== JSON.stringify(full)) failures.push(`page ${page} fallback must be the 2136-wide source`)
  }
  return failures
}

export function validateMushafIndexManifestAgreement(indexData, manifestsByUrl = {}) {
  const packs = indexData.packs ?? indexData.assets ?? indexData
  const failures = []
  if (!Array.isArray(packs)) return ['Mushaf index must be an array or { packs: [] }.']
  for (const pack of packs) {
    const manifest = manifestsByUrl[pack.manifestUrl]
    if (!manifest || manifest.version !== 2) continue
    const packId = pack.packId ?? pack.mushafEditionId
    if (manifest.riwayah !== pack.riwayah || manifest.mushafEditionId !== pack.mushafEditionId) {
      failures.push(`${packId}: manifest identity disagrees with its asset index`)
    }
    for (let index = 0; index < manifest.pages.length; index += 1) {
      const page = manifest.pages[index]
      const expectedFallbackUrl = `/dataset/mushaf-pages/${pack.riwayah}/${pack.mushafEditionId}/${page.media?.fallback?.assetPath}`
      if (pack.pageUrls?.[index] !== expectedFallbackUrl) {
        failures.push(`${packId}: page ${page.page} fallback URL disagrees with its asset index`)
      }
      for (const descriptor of page.media.sources) {
        const url = `/dataset/mushaf-pages/${pack.riwayah}/${pack.mushafEditionId}/${descriptor.assetPath}`
        const file = pack.files?.find((entry) => entry.url === url)
        if (!file || file.bytes !== descriptor.bytes || file.sha256 !== descriptor.sha256 || file.width !== descriptor.width || file.height !== descriptor.height || file.mimeType !== descriptor.mimeType) {
          failures.push(`${packId}: page ${page.page} descriptor disagrees with its asset index`)
        }
      }
    }
  }
  return failures
}

export function validateMushafIndexData(data) {
  const packs = data.packs ?? data.assets ?? data
  const failures = []
  if (!Array.isArray(packs)) return ['Mushaf index must be an array or { packs: [] }.']
  for (const pack of packs) {
    const packId = pack.packId ?? `mushaf-pages:${pack.riwayah}:${pack.mushafEditionId}`
    if ('deliveryMode' in pack && pack.deliveryMode !== 'on-demand-pack') failures.push(`${packId}: deliveryMode must be on-demand-pack`)
    if (pack.pageCount !== 604) failures.push(`${packId}: pageCount must be 604`)
    if (!isEditionAwareMushafUrl(pack.manifestUrl)) failures.push(`${packId}: manifestUrl must be edition-aware`)
    if (pack.pageUrlTemplate && !isEditionAwareMushafUrl(pack.pageUrlTemplate.replace('{page}', '001'))) failures.push(`${packId}: pageUrlTemplate must be edition-aware`)
    for (const url of pack.pageUrls ?? []) {
      if (!isEditionAwareMushafUrl(url)) failures.push(`${packId}: page URL must be edition-aware: ${url}`)
    }
    for (const file of pack.files ?? []) {
      if (!isEditionAwareMushafUrl(file.url)) failures.push(`${packId}: file URL must be edition-aware: ${file.url}`)
    }
    if (pack.version === 'v2' && (!Array.isArray(pack.pageUrls) || pack.pageUrls.length !== 604)) failures.push(`${packId}: V2 requires one fallback URL per page`)
  }
  return failures
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(indexPath)) {
    console.log('react-mushaf-indexes: no public/dataset/indexes/mushaf-assets.json present')
    process.exit(0)
  }
  const indexData = JSON.parse(readFileSync(indexPath, 'utf8'))
  const failures = []
  const manifestsByUrl = {}
  for (const pack of indexData.assets ?? []) {
    const manifestPath = join(repoRoot, 'public', new URL(pack.manifestUrl, 'https://quranatlas.local').pathname.replace(/^\//, ''))
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      manifestsByUrl[pack.manifestUrl] = manifest
      failures.push(...validateMushafManifestData(manifest))
    }
  }
  failures.push(...validateMushafIndexData(indexData), ...validateMushafIndexManifestAgreement(indexData, manifestsByUrl))
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('react-mushaf-indexes: ok')
}
