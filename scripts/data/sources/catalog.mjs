#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readJson } from '../lib/json.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const CATALOG_DIR = join(REPO_ROOT, 'data', 'catalog')

const SOURCE_FILES = [
  'quran-sources.json',
  'translation-sources.json',
  'tafsir-sources.json',
]

const SEARCH_SOURCE_FILE = 'search-sources.json'
const SEARCH_LICENSE_FILE = 'search-licenses.json'
const SEARCH_VERIFICATION_FILE = 'search-verification.json'

const RIWAYAH_SOURCE_SLUGS = {
  qaloon: 'qalun',
  hafs: 'hafs',
  warsh: 'warsh',
}

const VERSIONED_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+$/

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function loadSourceCatalog(catalogDir = CATALOG_DIR) {
  const [
    authorities,
    licenses,
    verificationRules,
    quranTextAssets,
    mushafAssets,
    searchSources,
    searchLicenses,
    searchVerification,
    ...sourceGroups
  ] = await Promise.all([
    readJson(join(catalogDir, 'authorities.json')),
    readJson(join(catalogDir, 'licenses.json')),
    readJson(join(catalogDir, 'verification-rules.json')),
    readJson(join(catalogDir, 'quran-text-assets.json')),
    readJson(join(catalogDir, 'mushaf-assets.json')),
    readJson(join(catalogDir, SEARCH_SOURCE_FILE)),
    readJson(join(catalogDir, SEARCH_LICENSE_FILE)),
    readJson(join(catalogDir, SEARCH_VERIFICATION_FILE)),
    ...SOURCE_FILES.map((name) => readJson(join(catalogDir, name))),
  ])
  return {
    authorities,
    licenses,
    verificationRules,
    quranTextAssets,
    mushafAssets,
    searchSources,
    searchLicenses,
    searchVerification,
    sources: sourceGroups.flatMap((group) => Array.isArray(group) ? group : []),
  }
}

export function validateSourceCatalog(catalog) {
  const errors = []
  const authorities = Array.isArray(catalog.authorities) ? catalog.authorities : []
  const licenses = Array.isArray(catalog.licenses) ? catalog.licenses : []
  const sources = Array.isArray(catalog.sources) ? catalog.sources : []
  const rules = isRecord(catalog.verificationRules) ? catalog.verificationRules : {}
  const allowedStatuses = new Set(
    Array.isArray(rules.allowedLicenseStatuses) ? rules.allowedLicenseStatuses : ['approved', 'restricted'],
  )
  const allowedVisibility = new Set(
    Array.isArray(rules.visibility) ? rules.visibility : ['baseline', 'optional', 'internal'],
  )

  const authorityIds = new Set(authorities.map((authority) => authority?.id).filter(Boolean))
  const licenseById = new Map(licenses.map((license) => [license?.id, license]).filter(([id]) => Boolean(id)))

  for (const source of sources) {
    if (!isRecord(source) || typeof source.id !== 'string' || !source.id) {
      errors.push('source missing id')
      continue
    }
    if (!authorityIds.has(source.providerId)) {
      errors.push(`source ${source.id} references missing provider ${source.providerId}`)
    }
    const license = licenseById.get(source.licenseId)
    if (!license) {
      errors.push(`source ${source.id} references missing license ${source.licenseId}`)
    } else if (!allowedStatuses.has(license.status)) {
      errors.push(`source ${source.id} uses disallowed license status ${license.status}`)
    }
    if (!allowedVisibility.has(source.visibility)) {
      errors.push(`source ${source.id} has invalid visibility ${source.visibility}`)
    }
    if (source.default === true && source.visibility !== 'baseline') {
      errors.push(`source ${source.id} is default but visibility is ${source.visibility}`)
    }
    if (typeof source.outputPath !== 'string' || !source.outputPath) {
      errors.push(`source ${source.id} missing outputPath`)
    }
    if (source.fetch !== undefined) {
      if (!isRecord(source.fetch)) {
        errors.push(`source ${source.id} fetch must be an object`)
      } else {
        if (typeof source.fetch.provider !== 'string' || !source.fetch.provider) {
          errors.push(`source ${source.id} fetch missing provider`)
        }
        if (typeof source.fetch.normalizedPath !== 'string' || !source.fetch.normalizedPath) {
          errors.push(`source ${source.id} fetch missing normalizedPath`)
        }
        if (source.fetch.provider === 'quran-db-translation') {
          if (typeof source.fetch.url !== 'string' || !source.fetch.url) {
            errors.push(`source ${source.id} fetch missing url`)
          }
          if (typeof source.fetch.field !== 'string' || !source.fetch.field) {
            errors.push(`source ${source.id} fetch missing field`)
          }
        }
        if (source.fetch.provider === 'qul-translation') {
          if (!Number.isInteger(source.fetch.resourceId)) {
            errors.push(`source ${source.id} fetch missing resourceId`)
          }
          if (!Number.isInteger(source.fetch.contentResourceId)) {
            errors.push(`source ${source.id} fetch missing contentResourceId`)
          }
          if (typeof source.fetch.resourceUrl !== 'string' || !source.fetch.resourceUrl) {
            errors.push(`source ${source.id} fetch missing resourceUrl`)
          }
        }
        if (source.fetch.provider === 'qul-tafsir') {
          if (!Number.isInteger(source.fetch.resourceId)) {
            errors.push(`source ${source.id} fetch missing resourceId`)
          }
          if (!Number.isInteger(source.fetch.contentResourceId)) {
            errors.push(`source ${source.id} fetch missing contentResourceId`)
          }
          if (typeof source.fetch.resourceUrl !== 'string' || !source.fetch.resourceUrl) {
            errors.push(`source ${source.id} fetch missing resourceUrl`)
          }
        }
      }
    }
  }

  validateQuranTextAssets(catalog.quranTextAssets, { errors, authorityIds, licenseById, allowedVisibility })
  validateMushafAssets(catalog.mushafAssets, { errors, authorityIds, licenseById, allowedVisibility })
  validateSearchCatalog(catalog, { errors, authorityIds, allowedVisibility })

  return { ok: errors.length === 0, errors }
}

function validateSearchCatalog(catalog, context) {
  if (
    catalog.searchSources === undefined &&
    catalog.searchLicenses === undefined &&
    catalog.searchVerification === undefined
  ) {
    return
  }

  const sources = Array.isArray(catalog.searchSources) ? catalog.searchSources : []
  const licenses = Array.isArray(catalog.searchLicenses) ? catalog.searchLicenses : []
  const verification = isRecord(catalog.searchVerification) ? catalog.searchVerification : {}
  const licenseById = new Map(licenses.map((license) => [license?.id, license]).filter(([id]) => Boolean(id)))
  const sourceById = new Map()

  for (const license of licenses) {
    if (!isRecord(license) || typeof license.id !== 'string' || !license.id) {
      context.errors.push('search license missing id')
      continue
    }
    if (typeof license.status !== 'string') {
      context.errors.push(`search license ${license.id} missing status`)
    }
    if (license.noticeRequired === true && typeof license.sourceAvailability !== 'string') {
      context.errors.push(`search license ${license.id} missing source availability notes`)
    }
  }

  for (const source of sources) {
    if (!isRecord(source) || typeof source.id !== 'string' || !source.id) {
      context.errors.push('search source missing id')
      continue
    }
    sourceById.set(source.id, source)
    if (!context.authorityIds.has(source.providerId)) {
      context.errors.push(`search source ${source.id} references missing provider ${source.providerId}`)
    }
    const license = licenseById.get(source.licenseId)
    if (!license) {
      context.errors.push(`search source ${source.id} references missing license ${source.licenseId}`)
    }
    if (!context.allowedVisibility.has(source.visibility)) {
      context.errors.push(`search source ${source.id} has invalid visibility ${source.visibility}`)
    }
    if (source.sourceRiwayah !== 'hafs') {
      context.errors.push(`search source ${source.id} sourceRiwayah must be hafs`)
    }
    if (typeof source.sourceUrl !== 'string' || !source.sourceUrl) {
      context.errors.push(`search source ${source.id} missing sourceUrl`)
    }
    if (typeof source.outputPath !== 'string' || !source.outputPath.includes('search-packs/packs/{contentHash}/')) {
      context.errors.push(`search source ${source.id} outputPath must target search-packs/packs/{contentHash}/**`)
    }
    if (typeof source.sourceAvailability !== 'string' || !source.sourceAvailability.trim()) {
      context.errors.push(`search source ${source.id} missing source availability notes`)
    }
    if (!hasAcceptedSha256(source.checksums)) {
      context.errors.push(`search source ${source.id} missing accepted sha-256 checksum`)
    }
    validateSearchCoverage(source, verification, context)
    if (source.type === 'search-morphology') {
      validateSearchMorphologySource(source, verification, context)
    }
  }

  for (const id of arrayOrEmpty(verification.requiredSourceIds)) {
    if (!sourceById.has(id)) {
      context.errors.push(`search verification requires missing source ${id}`)
    }
  }
  for (const id of arrayOrEmpty(verification.requiredLicenseIds)) {
    if (!licenseById.has(id)) {
      context.errors.push(`search verification requires missing license ${id}`)
    }
  }
}

function validateSearchCoverage(source, verification, context) {
  const coverage = isRecord(source.coverage) ? source.coverage : {}
  if (coverage.ayahs !== 6236) {
    context.errors.push(`search source ${source.id} ayah coverage must be 6236`)
  }
  if (coverage.surahs !== 114) {
    context.errors.push(`search source ${source.id} surah coverage must be 114`)
  }
  const expected = verification.expectedCoverage?.[source.id]
  if (isRecord(expected)) {
    for (const [field, value] of Object.entries(expected)) {
      if (coverage[field] !== value) {
        context.errors.push(`search source ${source.id} ${field} coverage must be ${value}`)
      }
    }
  }
}

function validateSearchMorphologySource(source, verification, context) {
  const manualSource = isRecord(source.manualSource) ? source.manualSource : {}
  const licenseDecision = isRecord(source.licenseDecision) ? source.licenseDecision : {}
  const morphology = isRecord(verification.morphology) ? verification.morphology : {}
  const approvedFilenames = arrayOrEmpty(manualSource.approvedFilenames)
  const verificationFilenames = arrayOrEmpty(morphology.approvedFilenames)
  const approvedName = approvedFilenames[0]

  if (licenseDecision.status !== 'resolved') {
    context.errors.push(`search morphology source ${source.id} has unresolved license decision`)
  }
  if (licenseDecision.sourceAvailabilityRequired !== true) {
    context.errors.push(`search morphology source ${source.id} must require source availability`)
  }
  if (licenseDecision.mayShipDerivedFeature !== true) {
    context.errors.push(`search morphology source ${source.id} must allow derived Search features before Phase 2 ships`)
  }
  if (typeof manualSource.dropPath !== 'string' || !manualSource.dropPath) {
    context.errors.push(`search morphology source ${source.id} missing manual source-drop path`)
  }
  if (!approvedName || !verificationFilenames.includes(approvedName)) {
    context.errors.push(`search morphology source ${source.id} has unapproved source filename ${approvedName}`)
  }
  if (morphology.sourceId !== source.id) {
    context.errors.push(`search morphology verification must reference ${source.id}`)
  }
  if (morphology.expectedVersion !== source.expectedVersion) {
    context.errors.push(`search morphology source ${source.id} expected version must match verification`)
  }
  if (!hasAcceptedSha256({ algorithm: 'sha-256', accepted: arrayOrEmpty(morphology.acceptedSha256) })) {
    context.errors.push(`search morphology source ${source.id} verification missing accepted sha-256 checksum`)
  }
}

function hasAcceptedSha256(checksums) {
  if (!isRecord(checksums) || checksums.algorithm !== 'sha-256') return false
  return arrayOrEmpty(checksums.accepted).some((checksum) => (
    checksum === 'normalized-source-checksum-bound-at-build' || /^[a-f0-9]{64}$/.test(checksum)
  ))
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : []
}

function validateQuranTextAssets(textCatalog, context) {
  if (textCatalog === undefined) return
  const assets = Array.isArray(textCatalog?.assets) ? textCatalog.assets : []
  const defaults = isRecord(textCatalog?.defaults) ? textCatalog.defaults : {}
  const seenByRiwayah = new Set()
  const assetKeys = new Set()

  for (const asset of assets) {
    const riwayah = asset?.riwayah
    const textStyleId = asset?.textStyleId
    const key = `${riwayah}/${textStyleId}`
    if (!isRecord(asset) || typeof riwayah !== 'string' || typeof textStyleId !== 'string') {
      context.errors.push('text asset missing riwayah or textStyleId')
      continue
    }

    if (!VERSIONED_SLUG_PATTERN.test(textStyleId)) {
      context.errors.push(`text asset ${key} has invalid textStyleId ${textStyleId}`)
    }
    const duplicateKey = `${riwayah}:${textStyleId}`
    if (seenByRiwayah.has(duplicateKey)) {
      context.errors.push(`text asset ${key} is duplicated within ${riwayah}`)
    }
    seenByRiwayah.add(duplicateKey)
    assetKeys.add(duplicateKey)

    if (!context.authorityIds.has(asset.providerId)) {
      context.errors.push(`text asset ${key} references missing provider ${asset.providerId}`)
    }
    if (!context.licenseById.has(asset.licenseId)) {
      context.errors.push(`text asset ${key} references missing license ${asset.licenseId}`)
    }
    if (!context.allowedVisibility.has(asset.visibility)) {
      context.errors.push(`text asset ${key} has invalid visibility ${asset.visibility}`)
    }

    const expectedTemplate = `quran-text/${riwayah}/${textStyleId}/{surah}.json`
    if (asset.outputPathTemplate !== expectedTemplate) {
      context.errors.push(`text asset ${key} outputPathTemplate must be ${expectedTemplate}`)
    }
  }

  for (const [riwayah, textStyleId] of Object.entries(defaults)) {
    if (!assetKeys.has(`${riwayah}:${textStyleId}`)) {
      context.errors.push(`text asset default ${riwayah} references missing text style ${textStyleId}`)
    }
  }
}

function validateMushafAssets(mushafCatalog, context) {
  if (mushafCatalog === undefined) return
  const assets = Array.isArray(mushafCatalog?.assets) ? mushafCatalog.assets : []
  const defaults = isRecord(mushafCatalog?.defaults) ? mushafCatalog.defaults : {}
  const seenByRiwayah = new Set()
  const assetKeys = new Set()

  for (const asset of assets) {
    const riwayah = asset?.riwayah
    const mushafEditionId = asset?.mushafEditionId
    const key = `${riwayah}/${mushafEditionId}`
    if (!isRecord(asset) || typeof riwayah !== 'string' || typeof mushafEditionId !== 'string') {
      context.errors.push('mushaf asset missing riwayah or mushafEditionId')
      continue
    }

    if (!VERSIONED_SLUG_PATTERN.test(mushafEditionId)) {
      context.errors.push(`mushaf asset ${key} has invalid mushafEditionId ${mushafEditionId}`)
    }
    const duplicateKey = `${riwayah}:${mushafEditionId}`
    if (seenByRiwayah.has(duplicateKey)) {
      context.errors.push(`mushaf asset ${key} is duplicated within ${riwayah}`)
    }
    seenByRiwayah.add(duplicateKey)
    assetKeys.add(duplicateKey)

    if (asset.pageCount !== 604) {
      context.errors.push(`mushaf asset ${key} pageCount must be 604`)
    }
    if (!context.allowedVisibility.has(asset.visibility)) {
      context.errors.push(`mushaf asset ${key} has invalid visibility ${asset.visibility}`)
    }
    validateMushafAssetSourceKind(asset, key, riwayah, context)
  }

  for (const [riwayah, mushafEditionId] of Object.entries(defaults)) {
    if (!assetKeys.has(`${riwayah}:${mushafEditionId}`)) {
      context.errors.push(`mushaf asset default ${riwayah} references missing edition ${mushafEditionId}`)
    }
  }
}

function validateMushafAssetSourceKind(asset, key, riwayah, context) {
  if (asset.sourceKind === 'quran-ws') {
    if (asset.providerId !== 'quran-ws') {
      context.errors.push(`mushaf asset ${key} providerId must be quran-ws`)
    } else if (!context.authorityIds.has(asset.providerId)) {
      context.errors.push(`mushaf asset ${key} references missing provider ${asset.providerId}`)
    }
    if (asset.licenseId !== 'quran-ws-free-use') {
      context.errors.push(`mushaf asset ${key} licenseId must be quran-ws-free-use`)
    } else if (!context.licenseById.has(asset.licenseId)) {
      context.errors.push(`mushaf asset ${key} references missing license ${asset.licenseId}`)
    }
    const expectedSlug = RIWAYAH_SOURCE_SLUGS[riwayah]
    if (expectedSlug && asset.sourceSlug !== expectedSlug) {
      context.errors.push(`mushaf asset ${key} sourceSlug must be ${expectedSlug}`)
    }
    return
  }

  if (asset.sourceKind === 'local-pdf') {
    if (asset.providerId !== 'private-local-pdf') {
      context.errors.push(`mushaf asset ${key} providerId must be private-local-pdf`)
    } else if (!context.authorityIds.has(asset.providerId)) {
      context.errors.push(`mushaf asset ${key} references missing provider ${asset.providerId}`)
    }
    if (asset.licenseId !== 'private-local-pdf-restricted') {
      context.errors.push(`mushaf asset ${key} licenseId must be private-local-pdf-restricted`)
    } else if (!context.licenseById.has(asset.licenseId)) {
      context.errors.push(`mushaf asset ${key} references missing license ${asset.licenseId}`)
    }
    if (asset.visibility !== 'internal') {
      context.errors.push(`mushaf asset ${key} visibility must be internal`)
    }
    if (asset.shipped !== false) {
      context.errors.push(`mushaf asset ${key} shipped must be false`)
    }
    const prefix = `mushaf-editions/${asset.mushafEditionId}/`
    const expected = {
      sourceContractPath: `${prefix}source.json`,
      pageStartReviewPath: `${prefix}page-start-review.json`,
      framingPath: `${prefix}framing.json`,
      mediaPolicyPath: `${prefix}media.json`,
    }
    for (const [field, value] of Object.entries(expected)) {
      if (asset[field] !== value) {
        context.errors.push(`mushaf asset ${key} ${field} must be ${value}`)
      }
    }
    return
  }

  context.errors.push(`mushaf asset ${key} has unsupported sourceKind ${asset.sourceKind}`)
}

export async function main() {
  if (!existsSync(CATALOG_DIR)) {
    throw new Error(`Missing catalog directory: ${CATALOG_DIR}`)
  }
  const catalog = await loadSourceCatalog()
  const result = validateSourceCatalog(catalog)
  if (!result.ok) {
    for (const error of result.errors) console.error(`[source-catalog] ${error}`)
    process.exitCode = 1
    return
  }
  console.log(`[source-catalog] ok (${catalog.sources.length} sources)`)
}
