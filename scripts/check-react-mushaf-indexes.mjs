import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT as repoRoot } from './data/lib/fs.mjs'
import {
  MUSHAF_FULL_RENDITION_WIDTH,
  MUSHAF_PAGE_COUNT,
  MUSHAF_PREVIEW_RENDITION_WIDTH,
  isMushafEditionAssetUrl,
  isMushafUnitRect,
  mushafEditionAssetUrl,
  mushafRenditionDescriptorFailure,
} from './data/lib/mushaf-contract.mjs'

const indexPath = join(repoRoot, 'public/dataset/indexes/mushaf-assets.json')

function isEditionAwareMushafUrl(url) {
  return isMushafEditionAssetUrl(url)
}

function descriptorFailure(descriptor, page, role) {
  return mushafRenditionDescriptorFailure(descriptor, page, role, `page ${page} ${role}`)
}

export function validateMushafManifestData(manifest) {
  const failures = []
  if (manifest?.version !== 2) return failures
  if (
    manifest.pageCount !== MUSHAF_PAGE_COUNT ||
    !Array.isArray(manifest.pages) ||
    manifest.pages.length !== MUSHAF_PAGE_COUNT
  )
    return [`V2 Mushaf manifest must contain ${MUSHAF_PAGE_COUNT} pages.`]
  for (let index = 0; index < manifest.pages.length; index += 1) {
    const page = index + 1
    const entry = manifest.pages[index]
    if (entry?.page !== page) failures.push(`page ${page} has an invalid page number`)
    if (!Number.isInteger(entry?.firstVerse?.surah) || !Number.isInteger(entry?.firstVerse?.verse))
      failures.push(`page ${page} firstVerse is invalid`)
    if (!isMushafUnitRect(entry?.framing?.textFrame))
      failures.push(`page ${page} textFrame is not contained by the Full frame`)
    if (!['left', 'right', 'none'].includes(entry?.framing?.sideLane)) failures.push(`page ${page} sideLane is invalid`)
    if (entry?.media?.kind !== 'external-image') failures.push(`page ${page} media kind is invalid`)
    const sourceDescriptors = entry?.media?.sources
    if (!Array.isArray(sourceDescriptors) || sourceDescriptors.length !== 2) {
      failures.push(`page ${page} sources are incomplete`)
      continue
    }
    const preview = sourceDescriptors.find((descriptor) => descriptor?.width === MUSHAF_PREVIEW_RENDITION_WIDTH)
    const full = sourceDescriptors.find((descriptor) => descriptor?.width === MUSHAF_FULL_RENDITION_WIDTH)
    for (const [role, descriptor] of [
      ['preview', preview],
      ['full', full],
    ]) {
      const failure = descriptorFailure(descriptor, page, role)
      if (failure) failures.push(failure)
    }
    if (JSON.stringify(entry.media.fallback) !== JSON.stringify(full))
      failures.push(`page ${page} fallback must be the 2136-wide source`)
  }
  return failures
}

export function validateMushafIndexManifestAgreement(indexData, manifestsByUrl = {}) {
  const failures = []
  if (!Array.isArray(indexData.assets)) return ['Mushaf index must be a version-1 { defaults, assets } payload.']
  for (const pack of indexData.assets) {
    const manifest = manifestsByUrl[pack.manifestUrl]
    if (manifest?.version !== 2) continue
    const packId = pack.mushafEditionId
    if (manifest.riwayah !== pack.riwayah || manifest.mushafEditionId !== pack.mushafEditionId) {
      failures.push(`${packId}: manifest identity disagrees with its asset index`)
    }
    for (let index = 0; index < manifest.pages.length; index += 1) {
      const page = manifest.pages[index]
      const expectedFallbackUrl = mushafEditionAssetUrl(
        { riwayah: pack.riwayah, mushafEditionId: pack.mushafEditionId },
        page.media?.fallback?.assetPath,
      )
      if (!Array.isArray(pack.pageUrls) || pack.pageUrls[index] !== expectedFallbackUrl) {
        failures.push(`${packId}: page ${page.page} fallback URL disagrees with its asset index`)
      }
      for (const descriptor of page.media.sources) {
        const url = mushafEditionAssetUrl(
          { riwayah: pack.riwayah, mushafEditionId: pack.mushafEditionId },
          descriptor.assetPath,
        )
        const file = pack.files?.find((entry) => entry.url === url)
        if (
          !file ||
          file.bytes !== descriptor.bytes ||
          file.sha256 !== descriptor.sha256 ||
          file.width !== descriptor.width ||
          file.height !== descriptor.height ||
          file.mimeType !== descriptor.mimeType
        ) {
          failures.push(`${packId}: page ${page.page} descriptor disagrees with its asset index`)
        }
      }
    }
  }
  return failures
}

export function validateMushafIndexData(data) {
  const failures = []
  if (!Array.isArray(data.assets)) return ['Mushaf index must be a version-1 { defaults, assets } payload.']
  for (const pack of data.assets) {
    const packId = `mushaf-pages:${pack.riwayah}:${pack.mushafEditionId}`
    if ('deliveryMode' in pack && pack.deliveryMode !== 'on-demand-pack')
      failures.push(`${packId}: deliveryMode must be on-demand-pack`)
    if (pack.pageCount !== MUSHAF_PAGE_COUNT) failures.push(`${packId}: pageCount must be ${MUSHAF_PAGE_COUNT}`)
    if (!isEditionAwareMushafUrl(pack.manifestUrl)) failures.push(`${packId}: manifestUrl must be edition-aware`)
    if (pack.pageUrlTemplate && !isEditionAwareMushafUrl(pack.pageUrlTemplate.replace('{page}', '001')))
      failures.push(`${packId}: pageUrlTemplate must be edition-aware`)
    for (const url of pack.pageUrls ?? []) {
      if (!isEditionAwareMushafUrl(url)) failures.push(`${packId}: page URL must be edition-aware: ${url}`)
    }
    for (const file of pack.files ?? []) {
      if (!isEditionAwareMushafUrl(file.url)) failures.push(`${packId}: file URL must be edition-aware: ${file.url}`)
    }
    if (pack.version === 'v2' && (!Array.isArray(pack.pageUrls) || pack.pageUrls.length !== MUSHAF_PAGE_COUNT))
      failures.push(`${packId}: V2 requires one fallback URL per page`)
  }
  return failures
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!existsSync(indexPath)) {
    process.exit(0)
  }
  const indexData = JSON.parse(readFileSync(indexPath, 'utf8'))
  const failures = []
  const manifestsByUrl = {}
  for (const pack of indexData.assets ?? []) {
    const manifestPath = join(
      repoRoot,
      'public',
      new URL(pack.manifestUrl, 'https://quranatlas.local').pathname.replace(/^\//, ''),
    )
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      manifestsByUrl[pack.manifestUrl] = manifest
      failures.push(...validateMushafManifestData(manifest))
    }
  }
  failures.push(
    ...validateMushafIndexData(indexData),
    ...validateMushafIndexManifestAgreement(indexData, manifestsByUrl),
  )
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('react-mushaf-indexes: ok')
}
