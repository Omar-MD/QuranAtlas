import { createHash, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defaultCommandRunner } from './private-pdf.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const PRIVATE_EDITION_ID = 'qalun-furatiyyah-2023-v1'
const PRIVATE_RELEASE_TAG = 'mushaf-qalun-furatiyyah-2023-v1'
const PRIVATE_ASSET_NAME = 'qalun-furatiyyah-2023-v1-normalized-v1.tar'
const DISTRIBUTION_PATH = join(REPO_ROOT, 'data', 'catalog', 'mushaf-editions', PRIVATE_EDITION_ID, 'distribution.json')
const BLOCK_BYTES = 512

function ensure(condition, message) {
  if (!condition) throw new Error(message)
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function isInside(parent, candidate) {
  const path = relative(resolve(parent), resolve(candidate))
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`))
}

function tarString(header, offset, length) {
  const field = header.subarray(offset, offset + length)
  const end = field.indexOf(0)
  return field.subarray(0, end < 0 ? field.length : end).toString('utf8')
}

function tarOctal(header, offset, length, label) {
  const field = header.subarray(offset, offset + length)
  ensure((field[0] & 0x80) === 0, `Private Mushaf USTAR ${label} uses an unsupported base-256 value`)
  const raw = field.toString('ascii').replace(/\0.*$/, '').trim()
  ensure(raw === '' || /^[0-7]+$/.test(raw), `Private Mushaf USTAR ${label} is not octal`)
  const value = raw === '' ? 0 : Number.parseInt(raw, 8)
  ensure(Number.isSafeInteger(value) && value >= 0, `Private Mushaf USTAR ${label} is invalid`)
  return value
}

function assertHeaderChecksum(header) {
  const expected = tarOctal(header, 148, 8, 'checksum')
  let actual = 0
  for (let index = 0; index < header.length; index += 1) {
    actual += index >= 148 && index < 156 ? 0x20 : header[index]
  }
  ensure(actual === expected, 'Private Mushaf USTAR header checksum is invalid')
}

function safeArchivePath(path) {
  ensure(path.length > 0, 'Private Mushaf USTAR contains an empty entry path')
  ensure(!path.includes('\\') && !path.startsWith('/') && !/^[A-Za-z]:/.test(path), `Private Mushaf USTAR contains an unsafe absolute path: ${path}`)
  const parts = path.replace(/\/$/, '').split('/')
  ensure(parts.every((part) => part && part !== '.' && part !== '..'), `Private Mushaf USTAR contains unsafe traversal: ${path}`)
  return parts.join('/')
}

function readUstarEntries(buffer) {
  ensure(Buffer.isBuffer(buffer), 'Private Mushaf release archive must be a Buffer')
  ensure(buffer.byteLength >= BLOCK_BYTES * 2 && buffer.byteLength % BLOCK_BYTES === 0, 'Private Mushaf release archive is not block-aligned USTAR')
  const entries = []
  let offset = 0
  let ended = false
  while (offset < buffer.byteLength) {
    const header = buffer.subarray(offset, offset + BLOCK_BYTES)
    if (header.every((byte) => byte === 0)) {
      ensure(buffer.subarray(offset).every((byte) => byte === 0), 'Private Mushaf USTAR contains data after its end marker')
      ensure(buffer.byteLength - offset >= BLOCK_BYTES * 2, 'Private Mushaf USTAR is missing its complete end marker')
      ended = true
      break
    }
    ensure(!ended, 'Private Mushaf USTAR contains entries after its end marker')
    assertHeaderChecksum(header)
    const magic = header.subarray(257, 263)
    ensure(magic.equals(Buffer.from('ustar\0')) || magic.equals(Buffer.from('ustar ')), 'Private Mushaf release archive is not USTAR')
    const name = tarString(header, 0, 100)
    const prefix = tarString(header, 345, 155)
    const rawPath = prefix ? `${prefix}/${name}` : name
    const path = safeArchivePath(rawPath)
    const typeByte = header[156]
    const type = typeByte === 0 ? '0' : String.fromCharCode(typeByte)
    ensure(type === '0' || type === '5', `Private Mushaf USTAR entry ${rawPath} has forbidden type ${JSON.stringify(type)}`)
    const size = tarOctal(header, 124, 12, `size for ${rawPath}`)
    ensure(type !== '5' || size === 0, `Private Mushaf USTAR directory ${rawPath} has file bytes`)
    const contentStart = offset + BLOCK_BYTES
    const contentEnd = contentStart + size
    ensure(contentEnd <= buffer.byteLength, `Private Mushaf USTAR entry ${rawPath} is truncated`)
    entries.push({ bytes: buffer.subarray(contentStart, contentEnd), path, type })
    offset = contentStart + Math.ceil(size / BLOCK_BYTES) * BLOCK_BYTES
  }
  ensure(ended, 'Private Mushaf USTAR is missing its end marker')
  return entries
}

function validateDistribution(distribution) {
  ensure(distribution?.version === 1 && distribution.mushafEditionId === PRIVATE_EDITION_ID, 'Private Mushaf distribution identity is invalid')
  ensure(distribution.authorization === 'user-authorized-public-noncommercial-deployment'
    && distribution.repository === 'Omar-MD/QuranAtlas'
    && distribution.releaseTag === PRIVATE_RELEASE_TAG
    && distribution.assetName === PRIVATE_ASSET_NAME, 'Private Mushaf distribution release pointer is invalid')
  ensure(Number.isSafeInteger(distribution.archiveBytes) && distribution.archiveBytes > 0, 'Private Mushaf distribution archive byte count is invalid')
  ensure(/^[a-f0-9]{64}$/.test(distribution.archiveSha256 ?? ''), 'Private Mushaf distribution archive SHA-256 is invalid')
  ensure(/^[a-f0-9]{64}$/.test(distribution.normalizedContentDigest ?? '') && /^[a-f0-9]{64}$/.test(distribution.normalizedContractDigest ?? ''), 'Private Mushaf distribution normalized digests are invalid')
  ensure(Number.isSafeInteger(distribution.fileCount) && distribution.fileCount > 0, 'Private Mushaf distribution file count is invalid')
}

function validateNormalizedMetadata(bytes, distribution) {
  let metadata
  try {
    metadata = JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new Error('Private Mushaf release import.json is invalid JSON')
  }
  ensure(metadata?.version === 1 && metadata.emissionContractVersion === 2 && metadata.riwayah === 'qaloon' && metadata.mushafEditionId === distribution.mushafEditionId, 'Private Mushaf release normalized identity is invalid')
  ensure(/^[a-f0-9]{64}$/.test(metadata.sourcePdfSha256 ?? ''), 'Private Mushaf release source PDF digest is invalid')
  ensure(['pdftocairo', 'cwebp', 'webpinfo'].every((tool) => typeof metadata.toolVersions?.[tool] === 'string' && metadata.toolVersions[tool].length > 0), 'Private Mushaf release tool provenance is incomplete')
  ensure(metadata.contractDigest === distribution.normalizedContractDigest, 'Private Mushaf release normalized contract digest is invalid')
  ensure(metadata.contentDigest === distribution.normalizedContentDigest, 'Private Mushaf release normalized content digest is invalid')
  const { contentDigest, ...unsignedMetadata } = metadata
  ensure(contentDigest === sha256(Buffer.from(jsonText(unsignedMetadata))), 'Private Mushaf release normalized content digest is stale or forged')
  ensure(metadata.media?.kind === 'external-image' && metadata.media.mimeType === 'image/webp' && metadata.media.renderDpi === 300, 'Private Mushaf release media policy is invalid')
  ensure(metadata.media.encoder?.command === 'cwebp' && metadata.media.encoder.quality === 88 && metadata.media.encoder.method === 6, 'Private Mushaf release encoder policy is invalid')
  ensure(Array.isArray(metadata.media.renditions) && metadata.media.renditions.length === 2
    && metadata.media.renditions[0]?.role === 'preview' && metadata.media.renditions[0]?.width === 1280
    && metadata.media.renditions[1]?.role === 'full' && metadata.media.renditions[1]?.width === 2136, 'Private Mushaf release rendition policy is incomplete')
  ensure(Array.isArray(metadata.pages) && metadata.pages.length > 0, 'Private Mushaf release normalized pages are incomplete')
  ensure(distribution.fileCount === 1 + metadata.pages.length * 2, 'Private Mushaf release normalized page count disagrees with its distribution file count')
  const renditions = []
  for (let index = 0; index < metadata.pages.length; index += 1) {
    const page = index + 1
    const row = metadata.pages[index]
    ensure(row?.page === page && Array.isArray(row.renditions) && row.renditions.length === 2, `Private Mushaf release page ${page} renditions are incomplete`)
    ensure(Number.isInteger(row.sourcePdfPage) && Number.isInteger(row.firstVerse?.surah) && Number.isInteger(row.firstVerse?.verse), `Private Mushaf release page ${page} source mapping is invalid`)
    const frame = row.framing?.textFrame
    ensure(frame && ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(frame[key]))
      && frame.x >= 0 && frame.y >= 0 && frame.width > 0 && frame.height > 0
      && frame.x + frame.width <= 1 && frame.y + frame.height <= 1
      && ['left', 'right', 'none'].includes(row.framing?.sideLane), `Private Mushaf release page ${page} framing is invalid`)
    for (let renditionIndex = 0; renditionIndex < row.renditions.length; renditionIndex += 1) {
      const descriptor = row.renditions[renditionIndex]
      const role = renditionIndex === 0 ? 'preview' : 'full'
      const width = renditionIndex === 0 ? 1280 : 2136
      const expectedPath = `pages/${String(page).padStart(3, '0')}-${width}.webp`
      ensure(descriptor?.role === role && descriptor.assetPath === expectedPath && descriptor.width === width
        && Number.isInteger(descriptor.height) && descriptor.height > 0 && descriptor.mimeType === 'image/webp'
        && Number.isSafeInteger(descriptor.bytes) && descriptor.bytes > 0 && /^[a-f0-9]{64}$/.test(descriptor.sha256 ?? ''), `Private Mushaf release page ${page} ${role} rendition contract is invalid`)
      renditions.push(descriptor)
    }
  }
  return { metadata, renditions }
}

export function inspectPrivateMushafTar(buffer, distribution) {
  validateDistribution(distribution)
  ensure(buffer.byteLength === distribution.archiveBytes, 'Private Mushaf release archive byte count does not match its distribution descriptor')
  ensure(sha256(buffer) === distribution.archiveSha256, 'Private Mushaf release archive SHA-256 does not match its distribution descriptor')
  const entries = readUstarEntries(buffer)
  const entryByPath = new Map()
  for (const entry of entries) {
    ensure(!entryByPath.has(entry.path), `Private Mushaf USTAR contains duplicate entry ${entry.path}`)
    ensure(entry.path === distribution.mushafEditionId || entry.path.startsWith(`${distribution.mushafEditionId}/`), `Private Mushaf USTAR contains an unexpected root: ${entry.path}`)
    entryByPath.set(entry.path, entry)
  }
  const editionDir = entryByPath.get(distribution.mushafEditionId)
  const pagesDir = entryByPath.get(`${distribution.mushafEditionId}/pages`)
  ensure(editionDir?.type === '5' && pagesDir?.type === '5', 'Private Mushaf USTAR is missing its exact edition directories')
  const importPath = `${distribution.mushafEditionId}/import.json`
  const importEntry = entryByPath.get(importPath)
  ensure(importEntry?.type === '0', 'Private Mushaf USTAR is missing import.json')
  const { metadata, renditions } = validateNormalizedMetadata(importEntry.bytes, distribution)
  const expectedPaths = new Set([distribution.mushafEditionId, `${distribution.mushafEditionId}/pages`, importPath])
  for (const rendition of renditions) {
    const path = `${distribution.mushafEditionId}/${rendition.assetPath}`
    expectedPaths.add(path)
    const entry = entryByPath.get(path)
    ensure(entry?.type === '0', `Private Mushaf USTAR is missing rendition ${rendition.assetPath}`)
    ensure(entry.bytes.byteLength === rendition.bytes && sha256(entry.bytes) === rendition.sha256, `Private Mushaf USTAR rendition ${rendition.assetPath} bytes are invalid`)
  }
  const regularFiles = entries.filter((entry) => entry.type === '0')
  ensure(regularFiles.length === distribution.fileCount, 'Private Mushaf USTAR file count does not match its distribution descriptor')
  ensure(entryByPath.size === expectedPaths.size && [...entryByPath.keys()].every((path) => expectedPaths.has(path)), 'Private Mushaf USTAR contains an unexpected file or incomplete inventory')
  return {
    editionId: distribution.mushafEditionId,
    fileCount: regularFiles.length,
    importBytes: importEntry.bytes,
    metadata,
    renditions,
  }
}

async function runChecked(runCommand, command, args) {
  const result = await runCommand(command, args)
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${(result.stderr || result.stdout || `status ${result.status}`).trim()}`)
  }
  return result.stdout ?? ''
}

function parseWebpDimensions(output, assetPath) {
  const dimensions = output.match(/Canvas size\s*:?\s*(\d+)\s*x\s*(\d+)/i)
    ?? output.match(/(?:width|canvas)\s*[:=]\s*(\d+)\D+(?:height)?\s*[:=]?\s*(\d+)/i)
  ensure(dimensions, `${assetPath} webpinfo did not report dimensions`)
  return { width: Number(dimensions[1]), height: Number(dimensions[2]) }
}

async function extractedInventory(root) {
  const files = new Set()
  const directories = new Set()
  async function visit(relativePath = '') {
    const entries = await readdir(join(root, relativePath), { withFileTypes: true })
    for (const entry of entries) {
      const path = relativePath ? `${relativePath}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        directories.add(path)
        await visit(path)
      } else if (entry.isFile()) {
        files.add(path)
      } else {
        throw new Error(`Private Mushaf restored output contains forbidden filesystem entry ${path}`)
      }
    }
  }
  await visit()
  return { directories, files }
}

async function validateExtractedEdition(editionDir, inspected, runCommand) {
  const inventory = await extractedInventory(editionDir)
  const expectedFiles = new Set(['import.json', ...inspected.renditions.map((item) => item.assetPath)])
  ensure(inventory.directories.size === 1 && inventory.directories.has('pages'), 'Private Mushaf restored output contains unexpected directories')
  ensure(inventory.files.size === expectedFiles.size && [...inventory.files].every((path) => expectedFiles.has(path)), 'Private Mushaf restored output contains an unexpected file or incomplete inventory')
  const importBytes = await readFile(join(editionDir, 'import.json'))
  ensure(importBytes.equals(inspected.importBytes), 'Private Mushaf restored import.json differs from the verified archive')
  for (const descriptor of inspected.renditions) {
    const path = join(editionDir, descriptor.assetPath)
    ensure(isInside(editionDir, path), `Private Mushaf restored rendition path is unsafe: ${descriptor.assetPath}`)
    const bytes = await readFile(path)
    ensure(bytes.byteLength === descriptor.bytes && sha256(bytes) === descriptor.sha256, `Private Mushaf restored rendition ${descriptor.assetPath} bytes are invalid`)
    const dimensions = parseWebpDimensions(await runChecked(runCommand, 'webpinfo', [path]), descriptor.assetPath)
    ensure(dimensions.width === descriptor.width && dimensions.height === descriptor.height, `Private Mushaf restored rendition ${descriptor.assetPath} dimensions are invalid`)
  }
}

async function readDistribution() {
  return JSON.parse(await readFile(DISTRIBUTION_PATH, 'utf8'))
}

export async function validatePrivateMushafRelease({
  normalizedRoot,
  runCommand = defaultCommandRunner,
  distribution,
}) {
  ensure(typeof normalizedRoot === 'string' && isAbsolute(normalizedRoot), 'Private Mushaf release validation requires an absolute normalized root')
  const descriptor = distribution ?? await readDistribution()
  validateDistribution(descriptor)
  const normalizedDir = join(normalizedRoot, descriptor.mushafEditionId)
  ensure(isInside(normalizedRoot, normalizedDir), 'Private Mushaf normalized output path is unsafe')
  const importBytes = await readFile(join(normalizedDir, 'import.json')).catch((error) => {
    if (error?.code === 'ENOENT') throw new Error('Private Mushaf normalized release output is missing import.json')
    throw error
  })
  const { metadata, renditions } = validateNormalizedMetadata(importBytes, descriptor)
  await validateExtractedEdition(normalizedDir, { importBytes, metadata, renditions }, runCommand)
  return { normalizedDir, status: 'current' }
}

export async function restorePrivateMushafReleaseArchive({
  archivePath,
  normalizedRoot,
  runCommand = defaultCommandRunner,
  distribution,
}) {
  ensure(typeof archivePath === 'string' && isAbsolute(archivePath), 'Private Mushaf release restore requires an absolute local archive path')
  ensure(typeof normalizedRoot === 'string' && isAbsolute(normalizedRoot), 'Private Mushaf release restore requires an absolute normalized root')
  const descriptor = distribution ?? await readDistribution()
  const archive = await readFile(archivePath)
  const inspected = inspectPrivateMushafTar(archive, descriptor)
  const normalizedDir = join(normalizedRoot, inspected.editionId)
  ensure(isInside(normalizedRoot, normalizedDir), 'Private Mushaf normalized output path is unsafe')
  await mkdir(normalizedRoot, { recursive: true })
  const stageRoot = join(normalizedRoot, `.${inspected.editionId}.restore-${randomUUID()}`)
  const extractRoot = join(stageRoot, 'extract')
  const verifiedArchivePath = join(stageRoot, descriptor.assetName)
  await mkdir(extractRoot, { recursive: true })
  try {
    await writeFile(verifiedArchivePath, archive, { flag: 'wx' })
    await runChecked(runCommand, 'tar', ['-xf', verifiedArchivePath, '-C', extractRoot])
    const stagedEdition = join(extractRoot, inspected.editionId)
    ensure(existsSync(stagedEdition), 'Private Mushaf release extraction did not produce the edition root')
    await validateExtractedEdition(stagedEdition, inspected, runCommand)
    if (existsSync(normalizedDir)) {
      try {
        await validateExtractedEdition(normalizedDir, inspected, runCommand)
      } catch (error) {
        throw new Error(`Private Mushaf immutable output already exists with different bytes: ${error instanceof Error ? error.message : String(error)}`)
      }
      return { normalizedDir, status: 'current' }
    }
    try {
      await rename(stagedEdition, normalizedDir)
    } catch (error) {
      if (!existsSync(normalizedDir)) throw error
      try {
        await validateExtractedEdition(normalizedDir, inspected, runCommand)
      } catch (validationError) {
        throw new Error(`Private Mushaf immutable output appeared with different bytes: ${validationError instanceof Error ? validationError.message : String(validationError)}`)
      }
      return { normalizedDir, status: 'current' }
    }
    return { normalizedDir, status: 'promoted' }
  } finally {
    await rm(stageRoot, { recursive: true, force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const archivePath = args.find((arg) => arg.startsWith('--archive='))?.slice('--archive='.length)
  const normalizedRoot = join(REPO_ROOT, 'data', 'normalized', 'mushaf-pages', 'qaloon')
  const action = args.length === 1 && args[0] === '--check'
    ? validatePrivateMushafRelease({ normalizedRoot })
    : restorePrivateMushafReleaseArchive({ archivePath, normalizedRoot })
  action.then((result) => {
    console.log(`[mushaf-pages] private release archive ${result.status}: ${result.normalizedDir}`)
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
