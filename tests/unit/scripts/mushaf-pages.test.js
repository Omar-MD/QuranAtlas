import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  derivePageMappings,
  editionIdsForProfile,
  firstVerseByPage,
  main as buildMushafPages,
  optimizeSvgForDataset,
  pruneMushafOutput,
  quranWsPagePdfUrl,
  resolveRequiredEditionIds,
  riwayatForProfile,
  validateSvgPageSet,
  writeMushafManifest,
} from '../../../scripts/data/mushaf-pages/build.mjs'
import {
  MUSHAF_COLOR_TOKENS,
  assertThemeableSvgIntegrity,
  themeMushafSvg,
} from '../../../scripts/data/mushaf-pages/theme-svg.mjs'
import { hasReusableSvgDocument } from '../../../scripts/data/mushaf-pages/import.mjs'
import { importPrivatePdfEdition, loadPrivateMushafEditionContract } from '../../../scripts/data/mushaf-pages/private-pdf.mjs'
import * as privatePdfModule from '../../../scripts/data/mushaf-pages/private-pdf.mjs'
import { buildManifestPayload } from '../../../scripts/data/manifest/inventory.mjs'
import { validateMushafManifestData } from '../../../scripts/check-react-mushaf-indexes.mjs'

const TEST_COLOR_MAP = {
  '#000000': 'ink',
  '#231f20': 'ink',
  '#ffffff': 'ground',
  '#7a5b28': 'ornament',
  '#9a6b2f': 'accent',
}

async function readCatalogJson(name) {
  return JSON.parse(await readFile(join(process.cwd(), 'data', 'catalog', name), 'utf8'))
}

async function readDatasetJson(path) {
  return JSON.parse(await readFile(join(process.cwd(), 'public', 'dataset', path), 'utf8'))
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function legacyPrivateContractDigest(contractDir) {
  const [source, review, framing, media] = await Promise.all([
    readFile(join(contractDir, 'source.json'), 'utf8').then(JSON.parse),
    readFile(join(contractDir, 'page-start-review.json'), 'utf8').then(JSON.parse),
    readFile(join(contractDir, 'framing.json'), 'utf8').then(JSON.parse),
    readFile(join(contractDir, 'media.json'), 'utf8').then(JSON.parse),
  ])
  return createHash('sha256').update(jsonText({ source, review, framing, media })).digest('hex')
}

async function treeDigest(root) {
  const hash = createHash('sha256')
  for (const entry of (await readdir(root)).sort()) {
    hash.update(entry)
    hash.update(await readFile(join(root, entry)))
  }
  return hash.digest('hex')
}

async function recursiveTreeDigest(root, relative = '') {
  const hash = createHash('sha256')
  const entries = await readdir(join(root, relative), { withFileTypes: true })
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(relative, entry.name)
    hash.update(path)
    if (entry.isDirectory()) {
      hash.update(await recursiveTreeDigest(root, path))
    } else {
      hash.update(await readFile(join(root, path)))
    }
  }
  return hash.digest('hex')
}

async function writeTransitionFixture(root) {
  const normalizedRoot = join(root, 'normalized')
  const datasetDir = join(root, 'dataset')
  const outRoot = join(datasetDir, 'mushaf-pages')
  const quranPages = join(normalizedRoot, 'qaloon', 'qalun-quran-ws-v1', 'pages')
  const privateRoot = join(normalizedRoot, 'qaloon', 'qalun-furatiyyah-2023-v1')
  const privatePages = join(privateRoot, 'pages')
  await mkdir(quranPages, { recursive: true })
  await mkdir(privatePages, { recursive: true })
  const ayat = JSON.parse(await readFile(join(process.cwd(), 'data', 'normalized', 'quran', 'riwayat', 'qaloon.json'), 'utf8'))
  const mappings = derivePageMappings(ayat)
  const media = await readCatalogJson('mushaf-editions/qalun-furatiyyah-2023-v1/media.json')
  const contract = await loadPrivateMushafEditionContract('qalun-furatiyyah-2023-v1')
  const framing = await readCatalogJson('mushaf-editions/qalun-furatiyyah-2023-v1/framing.json')
  const sourceBytes = Buffer.from('fixture-webp')
  const sourceDigest = createHash('sha256').update(sourceBytes).digest('hex')
  const pages = []
  for (let page = 1; page <= 604; page += 1) {
    const id = String(page).padStart(3, '0')
    await writeFile(join(quranPages, `${id}.svg`), '<svg viewBox="0 0 1 2" xmlns="http://www.w3.org/2000/svg"><path fill="#000000" d="M0 0h1v2H0z"/></svg>')
    const sourceFrame = framing.pages[page - 1]
    const full = sourceFrame.sourceFullFrame
    const text = sourceFrame.sourceTextFrame
    const textFrame = {
      x: (text.x - full.x) / full.width,
      y: (text.y - full.y) / full.height,
      width: text.width / full.width,
      height: text.height / full.height,
    }
    const renditions = [
      { role: 'preview', assetPath: `pages/${id}-1280.webp`, bytes: sourceBytes.byteLength, sha256: sourceDigest, width: 1280, height: 1630, mimeType: 'image/webp' },
      { role: 'full', assetPath: `pages/${id}-2136.webp`, bytes: sourceBytes.byteLength, sha256: sourceDigest, width: 2136, height: 2720, mimeType: 'image/webp' },
    ]
    for (const rendition of renditions) {
      await writeFile(join(privateRoot, rendition.assetPath), sourceBytes)
    }
    pages.push({
      page,
      sourcePdfPage: page + 4,
      firstVerse: mappings.firstVerse.get(page),
      framing: { textFrame, sideLane: sourceFrame.sideLane },
      renditions,
    })
  }
  const importMetadata = {
    version: 1,
    emissionContractVersion: 2,
    riwayah: 'qaloon',
    mushafEditionId: 'qalun-furatiyyah-2023-v1',
    sourcePdfSha256: contract.source.sha256,
    contractDigest: contract.emissionContractDigest,
    toolVersions: {
      pdftocairo: 'pdftocairo fixture version\n',
      cwebp: 'cwebp fixture version\n',
      webpinfo: 'webpinfo fixture version\n',
    },
    media: {
      kind: media.kind,
      mimeType: media.mimeType,
      renderDpi: media.renderDpi,
      encoder: media.encoder,
      renditions: media.renditions,
    },
    pages,
  }
  importMetadata.contentDigest = createHash('sha256').update(jsonText(importMetadata)).digest('hex')
  await writeFile(join(privateRoot, 'import.json'), jsonText(importMetadata))
  return { normalizedRoot, datasetDir, outRoot, refreshManifest: false }
}

async function writeDatasetManifestFixture(paths, profile = 'private') {
  const manifest = await buildManifestPayload({
    datasetDir: paths.datasetDir,
    riwayatDir: join(paths.datasetDir, 'riwayat'),
    translationsDir: join(paths.datasetDir, 'translations'),
    provenance: { builtAt: 'fixture-built-at' },
    packageVersion: 'fixture-version',
    profileName: profile,
  })
  await writeFile(join(paths.datasetDir, 'manifest.json'), JSON.stringify(manifest))
}

describe('mushaf asset catalog', () => {
  it('exposes stable edition variants with compatible defaults', async () => {
    const mushafCatalog = await readCatalogJson('mushaf-assets.json')

    expect(mushafCatalog.defaults.qaloon).toBe('qalun-quran-ws-v1')
    expect(mushafCatalog.assets).toContainEqual(expect.objectContaining({
      riwayah: 'qaloon',
      mushafEditionId: 'qalun-quran-ws-v1',
      visibility: 'baseline',
      shipped: true,
    }))

    for (const asset of mushafCatalog.assets) {
      expect(asset.mushafEditionId).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+$/)
      expect(asset.pageCount).toBe(604)
    }
    expect(mushafCatalog.assets).toContainEqual(expect.objectContaining({
      mushafEditionId: 'qalun-quran-ws-v1', sourceKind: 'quran-ws', providerId: 'quran-ws', licenseId: 'quran-ws-free-use',
    }))
    expect(mushafCatalog.assets).toContainEqual(expect.objectContaining({
      mushafEditionId: 'qalun-furatiyyah-2023-v1', sourceKind: 'local-pdf', providerId: 'private-local-pdf', licenseId: 'private-local-pdf-restricted', visibility: 'internal', shipped: false,
    }))
    for (const [riwayah, mushafEditionId] of Object.entries(mushafCatalog.defaults)) {
      expect(mushafCatalog.assets.some((asset) => asset.riwayah === riwayah && asset.mushafEditionId === mushafEditionId)).toBe(true)
    }
  })
})

function pngHeader(width = 2136, height = 2720) {
  const bytes = Buffer.alloc(24)
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes)
  bytes.writeUInt32BE(width, 16)
  bytes.writeUInt32BE(height, 20)
  return bytes
}

async function privateContractFixture(root) {
  const sourceDir = join(process.cwd(), 'data', 'catalog', 'mushaf-editions', 'qalun-furatiyyah-2023-v1')
  const contractDir = join(root, 'contracts')
  await cp(sourceDir, contractDir, { recursive: true })
  const sourcePath = join(contractDir, 'source.json')
  const reviewPath = join(contractDir, 'page-start-review.json')
  const source = JSON.parse(await readFile(sourcePath, 'utf8'))
  const review = JSON.parse(await readFile(reviewPath, 'utf8'))
  const pdfPath = join(root, 'fixture.pdf')
  await writeFile(pdfPath, 'fixture-pdf')
  const digest = createHash('sha256').update('fixture-pdf').digest('hex')
  source.expectedFilename = 'fixture.pdf'
  source.sha256 = digest
  review.sourcePdfSha256 = digest
  await writeFile(sourcePath, JSON.stringify(source, null, 2))
  await writeFile(reviewPath, JSON.stringify(review, null, 2))
  return { contractDir, pdfPath }
}

async function expectInvalidPrivateContract(mutator, message) {
  const root = await mkdtemp(join(tmpdir(), 'qa-private-contract-'))
  const fixture = await privateContractFixture(root)
  try {
    await mutator(fixture.contractDir)
    await expect(loadPrivateMushafEditionContract('qalun-furatiyyah-2023-v1', { contractDir: fixture.contractDir })).rejects.toThrow(message)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

function privateRunner({ failSourcePdfPage = null, variant = 'same', calls = [] } = {}) {
  return async (command, args) => {
    calls.push({ command, args })
    if (command === 'pdfinfo') {
      return { status: 0, stdout: 'Pages:           630\nPage size:       612 x 792 pts\nCropBox:         0 0 512.545 652.654\n', stderr: '' }
    }
    if (command === 'pdftocairo') {
      if (args[0] === '-v') {
        return { status: 0, stdout: '', stderr: 'pdftocairo fixture version\n' }
      }
      const sourcePage = Number(args[args.indexOf('-f') + 1])
      if (sourcePage === failSourcePdfPage) {
        return { status: 1, stdout: '', stderr: `page ${sourcePage} failed` }
      }
      await writeFile(`${args.at(-1)}.png`, pngHeader())
      return { status: 0, stdout: '', stderr: '' }
    }
    if (command === 'cwebp') {
      if (args[0] === '-version') {
        return { status: 0, stdout: 'cwebp fixture version\n', stderr: '' }
      }
      await writeFile(args.at(-1), `${variant}:${args.at(-1).match(/\d+\.webp$/)?.[0]}`)
      return { status: 0, stdout: '', stderr: '' }
    }
    if (command === 'webpinfo') {
      if (args[0] === '-version') {
        return { status: 0, stdout: 'webpinfo fixture version\n', stderr: '' }
      }
      const width = args[0].includes('-1280.webp') ? 1280 : 2136
      const height = width === 1280 ? 1630 : 2720
      return { status: 0, stdout: `Canvas size: ${width} x ${height}\n`, stderr: '' }
    }
    throw new Error(`unexpected command ${command}`)
  }
}

describe('private PDF Mushaf importer', () => {
  it('parses the pinned PDF CropBox instead of the generic page size', () => {
    expect(privatePdfModule.CURRENT_PRIVATE_EMISSION_CONTRACT_VERSION).toBe(2)
    expect(privatePdfModule.parsePdfCropBox('Page size: 612 x 792 pts\nCropBox: 0 0 512.545 652.654\n')).toEqual({
      height: 652.654,
      width: 512.545,
      x: 0,
      y: 0,
    })
  })

  it('requires the passed release gate and rejects legacy normalized metadata', async () => {
    expect(() => privatePdfModule.validatePassedPrivateMediaGate({ gate: 'pending-runtime' })).toThrow(/passed media gate/i)
    const media = await readCatalogJson('mushaf-editions/qalun-furatiyyah-2023-v1/media.json')
    delete media.runtimeEvidence.privateReadyMedianMs
    expect(() => privatePdfModule.validatePassedPrivateMediaGate(media)).toThrow(/runtime evidence/i)
    expect(() => privatePdfModule.validateLegacyMetadata({ contractDigest: 'a'.repeat(64) })).toThrow(/legacy normalized contract/i)
  })

  it('validates pinned review and framing contracts before importing', async () => {
    const contract = await loadPrivateMushafEditionContract('qalun-furatiyyah-2023-v1')
    expect(contract.pageStartReviews).toHaveLength(604)
    expect(contract.framingPages).toHaveLength(604)
    expect(contract.pageStartReviews.slice(0, 2).map((row) => row.canonicalFirstVerse)).toEqual([{ surah: 1, verse: 1 }, { surah: 2, verse: 1 }])
    expect(contract.pageStartReviews.at(-1).canonicalFirstVerse).toEqual({ surah: 112, verse: 1 })
    expect(contract.source).toMatchObject({
      expectedFilename: 'Noor-Book.com  مصحف رواية قالون عن نافع طبعة جديدة.pdf',
      sha256: '4454431b2662bc10060cc9335ba13baabe1f18a6762c492d41ccf11a4083012f',
      documentPageCount: 630,
      readerPdfPageStart: 5,
      readerPdfPageEnd: 608,
      logicalPageCount: 604,
    })
  })

  it('rejects unsafe or incomplete source contracts before staging', async () => {
    await expectInvalidPrivateContract(async (contractDir) => {
      const framingPath = join(contractDir, 'framing.json')
      const framing = JSON.parse(await readFile(framingPath, 'utf8'))
      framing.pages[0].sourceFullFrame.width = 1.1
      await writeFile(framingPath, JSON.stringify(framing))
    }, /unit CropBox/)
    await expectInvalidPrivateContract(async (contractDir) => {
      const sourcePath = join(contractDir, 'source.json')
      const source = JSON.parse(await readFile(sourcePath, 'utf8'))
      source.readerPdfPageEnd = 607
      await writeFile(sourcePath, JSON.stringify(source))
    }, /page range/)
    await expectInvalidPrivateContract(async (contractDir) => {
      const reviewPath = join(contractDir, 'page-start-review.json')
      const review = JSON.parse(await readFile(reviewPath, 'utf8'))
      review.verseAliasSha256 = '0'.repeat(64)
      await writeFile(reviewPath, JSON.stringify(review))
    }, /alias digest/)
    await expectInvalidPrivateContract(async (contractDir) => {
      const reviewPath = join(contractDir, 'page-start-review.json')
      const review = JSON.parse(await readFile(reviewPath, 'utf8'))
      review.pageMapSource = '../outside.json'
      await writeFile(reviewPath, JSON.stringify(review))
    }, /page-map path/)
    await expectInvalidPrivateContract(async (contractDir) => {
      const mediaPath = join(contractDir, 'media.json')
      const media = JSON.parse(await readFile(mediaPath, 'utf8'))
      media.renditions.pop()
      await writeFile(mediaPath, JSON.stringify(media))
    }, /renditions are incomplete/)
  })

  it('rejects a mismatched PDF before creating normalized output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-private-pdf-'))
    const { contractDir, pdfPath } = await privateContractFixture(root)
    await writeFile(pdfPath, 'different-pdf')
    await expect(importPrivatePdfEdition({ editionId: 'qalun-furatiyyah-2023-v1', pdfPath, paths: { contractDir, normalizedRoot: join(root, 'normalized') } })).rejects.toThrow(/sha256/)
    expect(existsSync(join(root, 'normalized', 'qalun-furatiyyah-2023-v1'))).toBe(false)
    await rm(root, { recursive: true, force: true })
  })

  it('rejects wrong PDF inspection values and invalid contract geometry', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-private-pdf-'))
    const { contractDir, pdfPath } = await privateContractFixture(root)
    const normalizedRoot = join(root, 'normalized')
    const wrongPageCount = privateRunner()
    const wrongCropBox = privateRunner()
    await expect(importPrivatePdfEdition({ editionId: 'qalun-furatiyyah-2023-v1', pdfPath, runCommand: async (command, args) => (command === 'pdfinfo'
      ? { status: 0, stdout: 'Pages:           629\nPage size:       612 x 792 pts\nCropBox:         0 0 512.545 652.654\n', stderr: '' }
      : wrongPageCount(command, args)), paths: { contractDir, normalizedRoot } })).rejects.toThrow(/page count/)
    await expect(importPrivatePdfEdition({ editionId: 'qalun-furatiyyah-2023-v1', pdfPath, runCommand: async (command, args) => (command === 'pdfinfo'
      ? { status: 0, stdout: 'Pages:           630\nPage size:       512.545 x 652.654 pts\nCropBox:         0 0 500 652.654\n', stderr: '' }
      : wrongCropBox(command, args)), paths: { contractDir, normalizedRoot } })).rejects.toThrow(/CropBox/)
    const framingPath = join(contractDir, 'framing.json')
    const framing = JSON.parse(await readFile(framingPath, 'utf8'))
    framing.pages.pop()
    await writeFile(framingPath, JSON.stringify(framing))
    await expect(loadPrivateMushafEditionContract('qalun-furatiyyah-2023-v1', { contractDir })).rejects.toThrow(/exactly 604 rows/)
    await rm(root, { recursive: true, force: true })
  })

  it('stages complete paired WebPs atomically and refuses changed bytes for the same edition id', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-private-pdf-'))
    const { contractDir, pdfPath } = await privateContractFixture(root)
    const normalizedRoot = join(root, 'normalized')
    const calls = []
    const options = { editionId: 'qalun-furatiyyah-2023-v1', pdfPath, paths: { contractDir, normalizedRoot } }
    const first = await importPrivatePdfEdition({ ...options, runCommand: privateRunner({ calls }) })
    expect(first.status).toBe('promoted')
    expect(calls.filter((call) => call.command === 'pdftocairo' && call.args[0] !== '-v')).toHaveLength(604)
    expect(calls.filter((call) => call.command === 'cwebp' && call.args[0] !== '-version')).toHaveLength(1208)
    await expect(importPrivatePdfEdition({ ...options, runCommand: privateRunner() })).resolves.toMatchObject({ status: 'current' })
    const metadataPath = join(first.normalizedDir, 'import.json')
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
    expect(metadata.emissionContractVersion).toBe(2)
    expect(metadata.toolVersions).toEqual({
      pdftocairo: 'pdftocairo fixture version\n',
      cwebp: 'cwebp fixture version\n',
      webpinfo: 'webpinfo fixture version\n',
    })
    const before = await readFile(metadataPath, 'utf8')
    await expect(importPrivatePdfEdition({ ...options, runCommand: privateRunner({ variant: 'changed' }) })).rejects.toThrow(/different bytes/)
    expect(await readFile(metadataPath, 'utf8')).toBe(before)
    await rm(root, { recursive: true, force: true })
  }, 20_000)

  it('keeps normalized private output current after runtime evidence changes but rejects byte-affecting media changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-private-pdf-'))
    const { contractDir, pdfPath } = await privateContractFixture(root)
    const normalizedRoot = join(root, 'normalized')
    const mediaPath = join(contractDir, 'media.json')
    const sourcePath = join(contractDir, 'source.json')
    const reviewPath = join(contractDir, 'page-start-review.json')
    const options = { editionId: 'qalun-furatiyyah-2023-v1', pdfPath, paths: { contractDir, normalizedRoot } }
    try {
      const pendingMedia = JSON.parse(await readFile(mediaPath, 'utf8'))
      pendingMedia.gate = 'pending-runtime'
      delete pendingMedia.runtimeEvidence
      await writeFile(mediaPath, JSON.stringify(pendingMedia, null, 2))
      await expect(importPrivatePdfEdition({ ...options, runCommand: privateRunner() })).rejects.toThrow(/passed media gate/i)

      const passedMedia = await readCatalogJson('mushaf-editions/qalun-furatiyyah-2023-v1/media.json')
      await writeFile(mediaPath, JSON.stringify(passedMedia, null, 2))
      await expect(importPrivatePdfEdition({ ...options, runCommand: privateRunner() })).resolves.toMatchObject({ status: 'promoted' })

      const source = JSON.parse(await readFile(sourcePath, 'utf8'))
      source.editionStatement = 'Corrected edition note'
      await writeFile(sourcePath, JSON.stringify(source, null, 2))
      const review = JSON.parse(await readFile(reviewPath, 'utf8'))
      review.reviewNotes.push('Clarified review note')
      await writeFile(reviewPath, JSON.stringify(review, null, 2))
      await expect(importPrivatePdfEdition({ ...options, runCommand: privateRunner() })).resolves.toMatchObject({ status: 'current' })

      const metadataPath = join(normalizedRoot, 'qalun-furatiyyah-2023-v1', 'import.json')
      const runtimeEvidenceChanged = JSON.parse(await readFile(mediaPath, 'utf8'))
      runtimeEvidenceChanged.runtimeEvidence.privateReadyMedianMs += 1
      await writeFile(mediaPath, JSON.stringify(runtimeEvidenceChanged, null, 2))
      await expect(importPrivatePdfEdition({ ...options, runCommand: privateRunner() })).resolves.toMatchObject({ status: 'current' })
      expect(JSON.parse(await readFile(metadataPath, 'utf8')).emissionContractVersion).toBe(2)

      const byteAffectingMedia = JSON.parse(await readFile(mediaPath, 'utf8'))
      byteAffectingMedia.encoder.quality = 89
      await writeFile(mediaPath, JSON.stringify(byteAffectingMedia, null, 2))
      await expect(importPrivatePdfEdition({ ...options, runCommand: privateRunner() })).rejects.toThrow(/media encoder is invalid/)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 20_000)

  it('retains a promoted directory when a later render command fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-private-pdf-'))
    const { contractDir, pdfPath } = await privateContractFixture(root)
    const normalizedRoot = join(root, 'normalized')
    const options = { editionId: 'qalun-furatiyyah-2023-v1', pdfPath, paths: { contractDir, normalizedRoot } }
    const promoted = await importPrivatePdfEdition({ ...options, runCommand: privateRunner() })
    const metadataPath = join(promoted.normalizedDir, 'import.json')
    const before = await readFile(metadataPath, 'utf8')
    await expect(importPrivatePdfEdition({ ...options, runCommand: privateRunner({ failSourcePdfPage: 47 }) })).rejects.toThrow(/page 47 failed/)
    expect(await readFile(metadataPath, 'utf8')).toBe(before)
    await rm(root, { recursive: true, force: true })
  })

  it('refuses to accept a corrupted existing normalized rendition as current', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-private-pdf-'))
    const { contractDir, pdfPath } = await privateContractFixture(root)
    const normalizedRoot = join(root, 'normalized')
    const options = { editionId: 'qalun-furatiyyah-2023-v1', pdfPath, paths: { contractDir, normalizedRoot } }
    const promoted = await importPrivatePdfEdition({ ...options, runCommand: privateRunner() })
    await writeFile(join(promoted.normalizedDir, 'pages', '001-1280.webp'), 'corrupt')
    await expect(importPrivatePdfEdition({ ...options, runCommand: privateRunner() })).rejects.toThrow(/rendition digest is invalid/)
    await rm(root, { recursive: true, force: true })
  }, 20_000)
})

describe('mushaf asset index output', () => {
  it('emits edition-aware page assets and manifest inventory entries', async () => {
    const mushafAssets = await readDatasetJson('indexes/mushaf-assets.json')
    expect(mushafAssets.defaults.qaloon).toBe('qalun-quran-ws-v1')
    for (const [riwayah, mushafEditionId] of Object.entries(mushafAssets.defaults)) {
      expect(mushafAssets.assets.some((asset) => asset.riwayah === riwayah && asset.mushafEditionId === mushafEditionId)).toBe(true)
    }
    const qaloonMushaf = mushafAssets.assets.find((asset) => asset.riwayah === 'qaloon' && asset.mushafEditionId === 'qalun-quran-ws-v1')
    expect(qaloonMushaf.manifestUrl).toBe('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json')
    expect(qaloonMushaf.files).toHaveLength(605)
    expect(qaloonMushaf.files.reduce((sum, file) => sum + file.bytes, 0)).toBe(qaloonMushaf.totalBytes)

    const manifest = await readDatasetJson('manifest.json')
    expect(manifest.files.some((file) => file.path === 'indexes/mushaf-assets.json')).toBe(true)
  })

  it('emits only the default riwayah package in the MVP index', async () => {
    const packages = await readDatasetJson('indexes/riwayah-packages.json')
    expect(packages.packages.map((entry) => entry.riwayah)).toEqual(['qaloon'])
    expect(packages.packages[0].pages.manifestUrl).toBe('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json')
  })
})

describe('mushaf page dataset builder', () => {
  it('builds quran.ws page PDF URLs with the source slug', () => {
    expect(quranWsPagePdfUrl('qalun', 42)).toBe('https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-42.pdf')
  })

  it('derives first verse by page from normalized riwayah ayat', () => {
    const result = firstVerseByPage([
      { sura_no: 1, aya_no: 1, page: '1' },
      { sura_no: 2, aya_no: 1, page: '2' },
      { sura_no: 2, aya_no: 255, page: '85-86' },
      { sura_no: 2, aya_no: 256, page: '86' },
    ])

    expect(result.get(1)).toEqual({ surah: 1, verse: 1 })
    expect(result.get(85)).toEqual({ surah: 2, verse: 255 })
    expect(result.get(86)).toEqual({ surah: 2, verse: 255 })
  })

  it('maps spanning ayat to their start page for verse-to-page navigation', () => {
    const { verseToPage } = derivePageMappings([
      { sura_no: 2, aya_no: 255, page: '85-86' },
    ])

    expect(verseToPage['2:255']).toBe(85)
  })

  it('keeps baseline and full page output to the default MVP riwayah', () => {
    expect(riwayatForProfile('baseline')).toEqual(['qaloon'])
    expect(riwayatForProfile('full')).toEqual(['qaloon'])
  })

  it('selects explicit standard and private Qaloon edition sets', async () => {
    const catalog = await readCatalogJson('mushaf-assets.json')
    expect(editionIdsForProfile('baseline', catalog)).toEqual(['qalun-quran-ws-v1'])
    expect(editionIdsForProfile('full', catalog)).toEqual(['qalun-quran-ws-v1'])
    expect(editionIdsForProfile('private', catalog)).toEqual(['qalun-quran-ws-v1', 'qalun-furatiyyah-2023-v1'])
    expect(editionIdsForProfile('catalog', catalog)).toEqual([])
    expect(editionIdsForProfile('catalog', {})).toEqual([])
    expect(() => editionIdsForProfile('unexpected', catalog)).toThrow(/Unsupported Mushaf page profile/)
    await expect(buildMushafPages(['--profile=baseline', '--require-edition=qalun-furatiyyah-2023-v1'])).rejects.toThrow(/not part of profile baseline/)
  })

  it('makes every private-profile edition inherently required', () => {
    expect(resolveRequiredEditionIds('private', [])).toEqual([
      'qalun-quran-ws-v1',
      'qalun-furatiyyah-2023-v1',
    ])
    expect(resolveRequiredEditionIds('baseline', ['qalun-quran-ws-v1'])).toEqual(['qalun-quran-ws-v1'])
  })

  it('rejects forged or stale private normalized provenance before emitting output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-private-provenance-'))
    const paths = await writeTransitionFixture(root)
    const metadataPath = join(paths.normalizedRoot, 'qaloon', 'qalun-furatiyyah-2023-v1', 'import.json')
    try {
      const forged = JSON.parse(await readFile(metadataPath, 'utf8'))
      forged.sourcePdfSha256 = '0'.repeat(64)
      forged.contentDigest = createHash('sha256').update(jsonText({ ...forged, contentDigest: undefined })).digest('hex')
      delete forged.contentDigest
      forged.contentDigest = createHash('sha256').update(jsonText(forged)).digest('hex')
      await writeFile(metadataPath, jsonText(forged))

      await expect(buildMushafPages(['--profile=private', '--require-edition=qalun-furatiyyah-2023-v1'], paths)).rejects.toThrow(/source PDF digest/i)

      const stale = JSON.parse(await readFile(metadataPath, 'utf8'))
      stale.sourcePdfSha256 = (await loadPrivateMushafEditionContract('qalun-furatiyyah-2023-v1')).source.sha256
      stale.contractDigest = 'f'.repeat(64)
      const unsigned = { ...stale }
      delete unsigned.contentDigest
      stale.contentDigest = createHash('sha256').update(jsonText(unsigned)).digest('hex')
      await writeFile(metadataPath, jsonText(stale))

      await expect(buildMushafPages(['--profile=private', '--require-edition=qalun-furatiyyah-2023-v1'], paths)).rejects.toThrow(/contract digest/i)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects legacy private metadata even when it carries a 64-hex contract digest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-private-legacy-provenance-'))
    const paths = await writeTransitionFixture(root)
    const metadataPath = join(paths.normalizedRoot, 'qaloon', 'qalun-furatiyyah-2023-v1', 'import.json')
    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
      metadata.contractDigest = await legacyPrivateContractDigest(join(process.cwd(), 'data', 'catalog', 'mushaf-editions', 'qalun-furatiyyah-2023-v1'))
      delete metadata.emissionContractVersion
      const legacyUnsigned = { ...metadata }
      delete legacyUnsigned.contentDigest
      metadata.contentDigest = createHash('sha256').update(jsonText(legacyUnsigned)).digest('hex')
      await writeFile(metadataPath, jsonText(metadata))

      await expect(buildMushafPages(['--profile=private', '--require-edition=qalun-furatiyyah-2023-v1'], paths)).rejects.toThrow(/legacy normalized contract/i)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it.each([
    { kind: 'missing', error: /missing private normalized input/i },
    { kind: 'legacy', error: /legacy normalized contract/i },
    { kind: 'gate-invalid', error: /passed media gate/i },
  ])('preflights every selected edition before plain private profile writes when input is $kind', async ({ kind, error }) => {
    const root = await mkdtemp(join(tmpdir(), `qa-private-preflight-${kind}-`))
    const paths = await writeTransitionFixture(root)
    const privateRoot = join(paths.normalizedRoot, 'qaloon', 'qalun-furatiyyah-2023-v1')
    const metadataPath = join(privateRoot, 'import.json')
    const indexPath = join(paths.datasetDir, 'indexes', 'mushaf-assets.json')
    const stampPath = join(paths.normalizedRoot, 'qaloon', 'qalun-quran-ws-v1-build-stamp.json')
    try {
      await mkdir(join(paths.outRoot, 'qaloon', 'stale-edition'), { recursive: true })
      await mkdir(join(paths.datasetDir, 'indexes'), { recursive: true })
      await writeFile(join(paths.outRoot, 'qaloon', 'manifest.json'), 'seeded legacy manifest')
      await writeFile(join(paths.outRoot, 'qaloon', 'stale-edition', 'sentinel.txt'), 'seeded stale output')
      await writeFile(indexPath, 'seeded index')
      await writeFile(stampPath, '{}\n')

      if (kind === 'missing') {
        await rm(privateRoot, { recursive: true, force: true })
      } else if (kind === 'legacy') {
        const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
        delete metadata.emissionContractVersion
        const unsigned = { ...metadata }
        delete unsigned.contentDigest
        metadata.contentDigest = createHash('sha256').update(jsonText(unsigned)).digest('hex')
        await writeFile(metadataPath, jsonText(metadata))
      } else {
        const sourceContractDir = join(process.cwd(), 'data', 'catalog', 'mushaf-editions', 'qalun-furatiyyah-2023-v1')
        const contractDir = join(root, 'contracts')
        await cp(sourceContractDir, contractDir, { recursive: true })
        const mediaPath = join(contractDir, 'media.json')
        const media = JSON.parse(await readFile(mediaPath, 'utf8'))
        media.gate = 'pending-runtime'
        delete media.runtimeEvidence
        await writeFile(mediaPath, jsonText(media))
        paths.contractDir = contractDir
      }

      const beforeOutput = await recursiveTreeDigest(paths.outRoot)
      const beforeIndex = await readFile(indexPath)
      const beforeStamp = await readFile(stampPath)

      await expect(buildMushafPages(['--profile=private'], paths)).rejects.toThrow(error)

      expect(await recursiveTreeDigest(paths.outRoot)).toBe(beforeOutput)
      expect(await readFile(indexPath)).toEqual(beforeIndex)
      expect(await readFile(stampPath)).toEqual(beforeStamp)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 30_000)

  it('prunes stale editions only after preserving every selected sibling', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-prune-'))
    const riwayahRoot = join(root, 'qaloon')
    const standard = { riwayah: 'qaloon', mushafEditionId: 'qalun-quran-ws-v1', sourceKind: 'quran-ws', pageCount: 1 }
    const privateEdition = { riwayah: 'qaloon', mushafEditionId: 'qalun-furatiyyah-2023-v1', sourceKind: 'local-pdf', pageCount: 1 }
    for (const path of [
      join(riwayahRoot, 'manifest.json'),
      join(riwayahRoot, 'pages', '001.svg'),
      join(riwayahRoot, standard.mushafEditionId, 'manifest.json'),
      join(riwayahRoot, standard.mushafEditionId, 'pages', '001.svg'),
      join(riwayahRoot, privateEdition.mushafEditionId, 'manifest.json'),
      join(riwayahRoot, privateEdition.mushafEditionId, 'pages', '001-1280.webp'),
      join(riwayahRoot, privateEdition.mushafEditionId, 'pages', '001-2136.webp'),
      join(riwayahRoot, 'stale-edition', 'manifest.json'),
    ]) {
      await mkdir(join(path, '..'), { recursive: true })
      await writeFile(path, 'fixture')
    }
    await pruneMushafOutput([standard, privateEdition], { outRoot: root })
    expect(existsSync(join(riwayahRoot, standard.mushafEditionId))).toBe(true)
    expect(existsSync(join(riwayahRoot, privateEdition.mushafEditionId))).toBe(true)
    expect(existsSync(join(riwayahRoot, 'stale-edition'))).toBe(false)
    await pruneMushafOutput([standard], { outRoot: root })
    expect(existsSync(join(riwayahRoot, privateEdition.mushafEditionId))).toBe(false)
    await rm(root, { recursive: true, force: true })
  })

  it('keeps quran.ws V1 stable while a temporary private profile adds then prunes its V2 sibling', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-transition-'))
    const paths = await writeTransitionFixture(root)
    const legacyRoot = join(paths.outRoot, 'qaloon')
    const legacyPages = join(legacyRoot, 'pages')
    const privateRoot = join(legacyRoot, 'qalun-furatiyyah-2023-v1')
    const indexPath = join(paths.datasetDir, 'indexes', 'mushaf-assets.json')
    try {
      await buildMushafPages(['--profile=baseline', '--require-riwayah=qaloon'], paths)
      const baselineDigest = await treeDigest(legacyPages)
      const baselineManifest = await readFile(join(legacyRoot, 'manifest.json'))

      await buildMushafPages(['--profile=private', '--require-edition=qalun-furatiyyah-2023-v1'], paths)
      const privateIndex = JSON.parse(await readFile(indexPath, 'utf8'))
      expect(privateIndex.assets.map((asset) => asset.mushafEditionId)).toEqual(['qalun-quran-ws-v1', 'qalun-furatiyyah-2023-v1'])
      const privateManifest = JSON.parse(await readFile(join(privateRoot, 'manifest.json'), 'utf8'))
      expect(validateMushafManifestData(privateManifest)).toEqual([])
      expect(privateManifest.pages).toHaveLength(604)
      for (const page of privateManifest.pages) {
        expect(page.media.sources).toHaveLength(2)
        await expect(readFile(join(privateRoot, page.media.fallback.assetPath))).resolves.toHaveLength(page.media.fallback.bytes)
      }
      expect(await treeDigest(legacyPages)).toBe(baselineDigest)
      expect(await readFile(join(legacyRoot, 'manifest.json'))).toEqual(baselineManifest)

      await buildMushafPages(['--profile=baseline', '--require-riwayah=qaloon'], paths)
      const restoredIndex = JSON.parse(await readFile(indexPath, 'utf8'))
      expect(restoredIndex.assets.map((asset) => asset.mushafEditionId)).toEqual(['qalun-quran-ws-v1'])
      expect(existsSync(privateRoot)).toBe(false)
      expect(await treeDigest(legacyPages)).toBe(baselineDigest)
      expect(await readFile(join(legacyRoot, 'manifest.json'))).toEqual(baselineManifest)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 30_000)

  it.each([
    'stale-edition',
    'corrupt-index',
    'stale-dataset-manifest',
    'extra-page',
  ])('rejects %s during a read-only private profile check', async (kind) => {
    const root = await mkdtemp(join(tmpdir(), `qa-mushaf-private-check-${kind}-`))
    const paths = await writeTransitionFixture(root)
    const riwayahRoot = join(paths.outRoot, 'qaloon')
    const indexPath = join(paths.datasetDir, 'indexes', 'mushaf-assets.json')
    const datasetManifestPath = join(paths.datasetDir, 'manifest.json')
    try {
      await buildMushafPages(['--profile=private'], paths)
      await writeDatasetManifestFixture(paths)

      if (kind === 'stale-edition') {
        await mkdir(join(riwayahRoot, 'stale-edition'), { recursive: true })
        await writeFile(join(riwayahRoot, 'stale-edition', 'sentinel.txt'), 'stale')
      } else if (kind === 'corrupt-index') {
        await writeFile(indexPath, '{"version":1,"assets":[]}\n')
      } else if (kind === 'stale-dataset-manifest') {
        const manifest = JSON.parse(await readFile(datasetManifestPath, 'utf8'))
        manifest.files = manifest.files.filter((file) => !file.path.endsWith('/pages/604-2136.webp'))
        manifest.lanes.pages.files -= 1
        await writeFile(datasetManifestPath, JSON.stringify(manifest))
      } else {
        await writeFile(join(riwayahRoot, 'qalun-furatiyyah-2023-v1', 'pages', '605-2136.webp'), 'extra')
      }

      const beforeDataset = await recursiveTreeDigest(paths.datasetDir)
      const beforeNormalized = await recursiveTreeDigest(paths.normalizedRoot)
      await expect(buildMushafPages(['--profile=private', '--check'], paths)).rejects.toThrow(/Mushaf .*stale/i)
      expect(await recursiveTreeDigest(paths.datasetDir)).toBe(beforeDataset)
      expect(await recursiveTreeDigest(paths.normalizedRoot)).toBe(beforeNormalized)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }, 30_000)

  it('treats catalog profile as having no Mushaf page body output', () => {
    expect(riwayatForProfile('catalog')).toEqual([])
  })

  it('allows clean-checkout builds to skip missing page artifacts unless strict mode is requested', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const missing = join(root, 'missing')

    await expect(validateSvgPageSet(missing, 2, { missing: 'skip' })).resolves.toEqual([])
    await expect(validateSvgPageSet(missing, 2, { missing: 'error' })).rejects.toThrow(/missing page artifact directory/)

    await rm(root, { recursive: true, force: true })
  })

  it('validates that a page set has every required SVG', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const dir = join(root, 'pages')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, '001.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')

    await expect(validateSvgPageSet(dir, 2)).rejects.toThrow(/missing page 002/)

    await writeFile(join(dir, '002.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    await expect(validateSvgPageSet(dir, 2)).resolves.toHaveLength(2)

    await rm(root, { recursive: true, force: true })
  })

  it('rejects unsafe SVG content and external references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const dir = join(root, 'pages')
    await mkdir(dir, { recursive: true })

    await writeFile(join(dir, '001.svg'), '<svg><script>alert(1)</script></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><foreignObject>html</foreignObject></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><rect onclick="alert(1)"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><style>@import url(https://example.com/a.css)</style></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><image href="https://example.com/001.png"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><image href="data:image/png;base64,AAAA"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><a href="javascript:alert(1)"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><s:script xmlns:s="urn:test">alert(1)</s:script></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><a href="java&#x73;cript:alert(1)"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><image href="https&#x3a;//example.com/001.png"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><style>.x{background:u\\72l(https://example.com/x.png)}</style></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<!DOCTYPE svg [<!ENTITY js "javascript:alert(1)">]><svg><a href="&js;"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<?xml-stylesheet href="https://example.com/a.css"?><svg></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await rm(root, { recursive: true, force: true })
  })

  it('allows same-document SVG url references emitted by pdftocairo', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const dir = join(root, 'pages')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, '001.svg'), `
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="clip-0"><path d="M 0 0 L 1 1"/></clipPath>
        </defs>
        <g clip-path="url(#clip-0)"><path d="M 0 0 L 1 1"/></g>
      </svg>
    `)

    await expect(validateSvgPageSet(dir, 1)).resolves.toHaveLength(1)

    await rm(root, { recursive: true, force: true })
  })

  it('optimizes exported SVGs without removing same-document references', () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10.123456 20.987654">
        <defs>
          <clipPath id="clip-0">
            <path d="M 1.234567 2.345678 L 3.456789 4.567891"/>
          </clipPath>
        </defs>
        <g clip-path="url(#clip-0)">
          <path d="M 5.555555 6.666666 L 7.777777 8.888888"/>
        </g>
      </svg>`

    const optimized = optimizeSvgForDataset(source)

    expect(optimized.length).toBeLessThan(source.length)
    expect(optimized).not.toContain('<?xml')
    expect(optimized).toContain('url(#clip-0)')
    expect(optimized).toContain('10.12')
    expect(optimized).toContain('1.23')
  })

  it('tokenizes theme colors while preserving SVG geometry and references', () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 20">
      <defs><clipPath id="clip-0"><path d="M 0 0 L 1 1" fill="#000000"/></clipPath></defs>
      <g id="page" clip-path="url(#clip-0)" opacity="0.7" transform="translate(1 2)">
        <path d="M 1 2 L 3 4" fill="#000000" fill-rule="evenodd"/>
        <path d="M 5 6 L 7 8" style="fill: #ffffff; stroke: #7a5b28; opacity: 0.5"/>
        <path d="M 8 9 L 9 10" stroke="#9a6b2f"/>
      </g>
    </svg>`

    const themed = themeMushafSvg(source, { filename: '001.svg', colorMap: TEST_COLOR_MAP })

    expect(themed.match(/<path\b/g)).toHaveLength(source.match(/<path\b/g).length)
    expect(themed).toContain('viewBox="0 0 10 20"')
    expect(themed).toContain('d="M 1 2 L 3 4"')
    expect(themed).toContain('d="M 5 6 L 7 8"')
    expect(themed).toContain('fill-rule="evenodd"')
    expect(themed).toContain('clip-path="url(#clip-0)"')
    expect(themed).toContain('opacity="0.7"')
    expect(themed).toContain('transform="translate(1 2)"')
    expect(themed).toContain(`fill="${MUSHAF_COLOR_TOKENS.ink}"`)
    expect(themed).toContain(`fill="${MUSHAF_COLOR_TOKENS.ground}"`)
    expect(themed).toContain(`stroke="${MUSHAF_COLOR_TOKENS.ornament}"`)
    expect(themed).toContain(`stroke="${MUSHAF_COLOR_TOKENS.accent}"`)
    expect(themed).toContain('style="opacity: 0.5"')
    expect(themed).not.toMatch(/#(?:000000|ffffff|7a5b28|9a6b2f)/i)
    expect(() => assertThemeableSvgIntegrity(source, themed, '001.svg')).not.toThrow()
  })

  it('normalizes source CSS percentage colors before token classification', () => {
    const themed = themeMushafSvg('<svg viewBox="0 0 1 1"><path fill="rgb(100%, 100%, 100%)"/><path fill="rgb(13.725281%, 12.156677%, 12.548828%)"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })

    expect(themed).toContain(`fill="${MUSHAF_COLOR_TOKENS.ground}"`)
    expect(themed).toContain(`fill="${MUSHAF_COLOR_TOKENS.ink}"`)
  })

  it('rejects unclassified colors, unsafe attributes, and remote SVG references while tokenizing', () => {
    expect(() => themeMushafSvg('<svg viewBox="0 0 1 1"><path fill="#123456"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })).toThrow(/Unclassified Mushaf SVG color/)

    expect(() => themeMushafSvg('<svg viewBox="0 0 1 1"><path onclick="alert(1)" fill="#000000"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })).toThrow(/unsafe SVG/)

    expect(() => themeMushafSvg('<svg viewBox="0 0 1 1"><image href="https://example.com/page.png"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })).toThrow(/unsafe SVG/)

    expect(() => themeMushafSvg('<svg viewBox="0 0 1 1"><style>.a{fill:#123456}</style><path class="a" d="M0 0"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })).toThrow(/unsafe SVG/)

    expect(() => themeMushafSvg('<svg viewBox="0 0 1 1"><animate attributeName="href" to="https://example.com"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })).toThrow(/unsafe SVG/)
  })

  it('reuses only safe existing SVG imports', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const good = join(root, 'good.svg')
    const unsafe = join(root, 'unsafe.svg')
    const invalid = join(root, 'invalid.svg')
    await writeFile(good, '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    await writeFile(unsafe, '<svg><script>alert(1)</script></svg>')
    await writeFile(invalid, '<html><svg></svg></html>')

    await expect(hasReusableSvgDocument(good)).resolves.toBe(true)
    await expect(hasReusableSvgDocument(unsafe)).resolves.toBe(false)
    await expect(hasReusableSvgDocument(invalid)).resolves.toBe(false)
    await expect(hasReusableSvgDocument(join(root, 'missing.svg'))).resolves.toBe(false)

    await rm(root, { recursive: true, force: true })
  })

  it('writes a manifest with page bytes, viewBoxes, source PDF URLs, and first verse references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const out = join(root, 'public', 'dataset', 'mushaf-pages', 'qaloon')
    const pages = join(out, 'pages')
    await mkdir(pages, { recursive: true })
    const themedSvg = themeMushafSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 20"><path fill="#000000"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })
    await writeFile(join(pages, '001.svg'), themedSvg)

    const manifestPath = await writeMushafManifest({
      outDir: out,
      riwayah: 'qaloon',
      sourceSlug: 'qalun',
      pageCount: 1,
      firstVerse: new Map([[1, { surah: 1, verse: 1 }]]),
      verseToPage: { '1:1': 1 },
      pageViewBoxes: new Map([[1, '0 0 10 20']]),
    })

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    expect(manifest.riwayah).toBe('qaloon')
    expect(manifest.sourceSlug).toBe('qalun')
    expect(manifest.pages[0]).toMatchObject({
      page: 1,
      assetPath: 'pages/001.svg',
      viewBox: '0 0 10 20',
      sourcePdfUrl: 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-1.pdf',
      firstVerse: { surah: 1, verse: 1 },
    })
    expect(manifest.pages[0].bytes).toBeGreaterThan(0)
    expect(themedSvg).toContain(`viewBox="${manifest.pages[0].viewBox}"`)
    expect(manifest.verseToPage).toEqual({ '1:1': 1 })

    await rm(root, { recursive: true, force: true })
  })

  it('inventories Mushaf page assets as the pages lane', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const datasetDir = join(root, 'public', 'dataset')
    const packDir = join(datasetDir, 'mushaf-pages', 'qaloon')
    const pages = join(packDir, 'pages')
    await mkdir(pages, { recursive: true })
    await writeFile(join(packDir, 'manifest.json'), JSON.stringify({ riwayah: 'qaloon' }))
    await writeFile(join(pages, '001.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')

    const manifest = await buildManifestPayload({
      datasetDir,
      riwayatDir: join(datasetDir, 'riwayat'),
      translationsDir: join(datasetDir, 'translations'),
      provenance: { builtAt: 'test' },
      packageVersion: 'test',
      profileName: 'baseline',
    })

    expect(manifest.lanes.pages).toMatchObject({ enabled: true, files: 2 })
    expect(manifest.files).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: 'mushaf-pages/qaloon/manifest.json',
        lane: 'pages',
        category: 'pages',
        bytes: expect.any(Number),
      }),
      expect.objectContaining({
        path: 'mushaf-pages/qaloon/pages/001.svg',
        lane: 'pages',
        category: 'pages',
        bytes: expect.any(Number),
      }),
    ]))
    expect(manifest.lanes.pages.files).toBe(2)

    await rm(root, { recursive: true, force: true })
  })
})
