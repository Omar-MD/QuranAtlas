import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const PRIVATE_EDITION_ID = 'qalun-furatiyyah-2023-v1'
const RIWAYAH = 'qaloon'
const PAGE_COUNT = 604
const CONTRACT_DIR = join(REPO_ROOT, 'data', 'catalog', 'mushaf-editions', PRIVATE_EDITION_ID)
const NORMALIZED_ROOT = join(REPO_ROOT, 'data', 'normalized', 'mushaf-pages', RIWAYAH)

function ensure(condition, message) {
  if (!condition) throw new Error(message)
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function pad3(page) {
  return String(page).padStart(3, '0')
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function isInside(parent, candidate) {
  const path = relative(resolve(parent), resolve(candidate))
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`))
}

function contractPath(contractDir, name) {
  const path = join(contractDir, name)
  ensure(isInside(contractDir, path), `Unsafe private Mushaf contract path: ${name}`)
  return path
}

function assertRect(rect, label) {
  ensure(rect && typeof rect === 'object', `${label} must be an object`)
  for (const key of ['x', 'y', 'width', 'height']) {
    ensure(Number.isFinite(rect[key]), `${label}.${key} must be finite`)
  }
  ensure(rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0, `${label} must be a non-empty unit rectangle`)
  ensure(rect.x + rect.width <= 1 && rect.y + rect.height <= 1, `${label} must stay within the unit CropBox`)
}

function assertContained(inner, outer, label) {
  ensure(inner.x >= outer.x && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height, `${label} must be contained by sourceFullFrame`)
}

function reviewFixturePresent(notes, printed, canonical) {
  return notes.some((note) => String(note).includes(printed) && String(note).includes(canonical))
}

/**
 * Loads and validates the pinned, local-only source contracts. The optional
 * second argument is test-only root injection; production uses repo paths.
 */
export async function loadPrivateMushafEditionContract(editionId, { contractDir = CONTRACT_DIR, repoRoot = REPO_ROOT } = {}) {
  ensure(editionId === PRIVATE_EDITION_ID, `Unsupported private Mushaf edition: ${editionId}`)
  const [source, review, framing, media] = await Promise.all([
    readJson(contractPath(contractDir, 'source.json')),
    readJson(contractPath(contractDir, 'page-start-review.json')),
    readJson(contractPath(contractDir, 'framing.json')),
    readJson(contractPath(contractDir, 'media.json')),
  ])

  ensure(source?.mushafEditionId === editionId && source.sourceKind === 'local-pdf', 'Private Mushaf source contract identity is invalid')
  ensure(typeof source.sha256 === 'string' && /^[a-f0-9]{64}$/.test(source.sha256), 'Private Mushaf source contract is missing sha256')
  ensure(source.documentPageCount === 630 && source.readerPdfPageStart === 5 && source.readerPdfPageEnd === 608 && source.logicalPageCount === PAGE_COUNT, 'Private Mushaf source page range is invalid')
  ensure(source.cropBoxPoints?.width === 512.545 && source.cropBoxPoints?.height === 652.654, 'Private Mushaf source CropBox is invalid')
  ensure(typeof source.expectedFilename === 'string' && source.expectedFilename.length > 0, 'Private Mushaf source expectedFilename is invalid')

  const pageMapPath = join(repoRoot, review.pageMapSource ?? '')
  const aliasesPath = join(repoRoot, review.verseAliasSource ?? '')
  ensure(review?.mushafEditionId === editionId && review.sourcePdfSha256 === source.sha256, 'Private Mushaf review source digest is invalid')
  ensure(review.pageMapSource === 'data/normalized/quran/riwayat/qaloon.json' && isInside(repoRoot, pageMapPath), 'Private Mushaf review page-map path is invalid')
  ensure(review.verseAliasSource === 'public/dataset/translations/_verse-aliases.json' && isInside(repoRoot, aliasesPath), 'Private Mushaf review alias path is invalid')
  ensure(review.pageMapSha256 === sha256(await readFile(pageMapPath)), 'Private Mushaf review page-map digest is invalid')
  ensure(review.verseAliasSha256 === sha256(await readFile(aliasesPath)), 'Private Mushaf review alias digest is invalid')
  ensure(reviewFixturePresent(review.reviewNotes ?? [], '2:49', '2:48')
    && reviewFixturePresent(review.reviewNotes ?? [], '18:98', '18:94')
    && reviewFixturePresent(review.reviewNotes ?? [], '19:12', '19:11'), 'Private Mushaf review alias fixtures are incomplete')

  const pageStartReviews = review.pageStartReviews
  ensure(Array.isArray(pageStartReviews) && pageStartReviews.length === PAGE_COUNT, 'Private Mushaf review must contain exactly 604 rows')
  for (let index = 0; index < pageStartReviews.length; index += 1) {
    const row = pageStartReviews[index]
    const page = index + 1
    ensure(row?.page === page && row.sourcePdfPage === source.readerPdfPageStart + index, `Private Mushaf review row ${page} has an invalid page range`)
    ensure(row.result === 'wording-match', `Private Mushaf review row ${page} is not wording-match`)
    ensure(Number.isInteger(row.canonicalFirstVerse?.surah) && Number.isInteger(row.canonicalFirstVerse?.verse), `Private Mushaf review row ${page} has an invalid canonical verse`)
  }

  ensure(framing?.mushafEditionId === editionId && framing.coordinateSpace === 'pdf-crop-box-normalized', 'Private Mushaf framing contract identity is invalid')
  const framingPages = framing.pages
  ensure(Array.isArray(framingPages) && framingPages.length === PAGE_COUNT, 'Private Mushaf framing must contain exactly 604 rows')
  for (let index = 0; index < framingPages.length; index += 1) {
    const row = framingPages[index]
    const page = index + 1
    ensure(row?.page === page && row.sourcePdfPage === source.readerPdfPageStart + index, `Private Mushaf framing row ${page} has an invalid page range`)
    assertRect(row.sourceFullFrame, `Private Mushaf framing row ${page} sourceFullFrame`)
    assertRect(row.sourceTextFrame, `Private Mushaf framing row ${page} sourceTextFrame`)
    assertContained(row.sourceTextFrame, row.sourceFullFrame, `Private Mushaf framing row ${page} sourceTextFrame`)
    ensure(['left', 'right', 'none'].includes(row.sideLane), `Private Mushaf framing row ${page} has an invalid sideLane`)
  }

  ensure(media?.mushafEditionId === editionId && media.kind === 'external-image' && media.mimeType === 'image/webp' && media.renderDpi === 300, 'Private Mushaf media policy is invalid')
  ensure(media.encoder?.command === 'cwebp' && media.encoder.quality === 88 && media.encoder.method === 6, 'Private Mushaf media encoder is invalid')
  ensure(Array.isArray(media.renditions) && media.renditions.length === 2
    && media.renditions[0]?.role === 'preview' && media.renditions[0]?.width === 1280
    && media.renditions[1]?.role === 'full' && media.renditions[1]?.width === 2136, 'Private Mushaf media renditions are incomplete')

  return {
    source,
    pageStartReviews,
    framingPages,
    mediaPolicy: media,
    contractDigest: sha256(Buffer.from(jsonText({ source, review, framing, media }))),
  }
}

export async function defaultCommandRunner(command, args) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.once('error', rejectCommand)
    child.once('close', (status) => resolveCommand({ status: status ?? 1, stdout, stderr }))
  })
}

async function run(runCommand, command, args) {
  const result = await runCommand(command, args)
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${(result.stderr || result.stdout || `status ${result.status}`).trim()}`)
  }
  return result.stdout
}

function parsePdfInfo(output) {
  const pages = Number.parseInt(output.match(/^Pages:\s+(\d+)$/m)?.[1] ?? '', 10)
  const size = output.match(/^Page size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts$/m)
  return { pages, width: Number(size?.[1]), height: Number(size?.[2]) }
}

function pngDimensions(bytes, filename) {
  ensure(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${filename} is not a PNG`)
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  ensure(width > 0 && height > 0, `${filename} has invalid PNG dimensions`)
  return { width, height }
}

function parseWebpDimensions(output, filename) {
  const dimensions = output.match(/Canvas size:\s*(\d+)\s*x\s*(\d+)/i)
    ?? output.match(/(?:width|canvas)\s*[:=]\s*(\d+)\D+(?:height)?\s*[:=]?\s*(\d+)/i)
  ensure(dimensions, `${filename} webpinfo did not report dimensions`)
  return { width: Number(dimensions[1]), height: Number(dimensions[2]) }
}

function cropPixels(rect, dimensions, label) {
  const x = Math.floor(rect.x * dimensions.width)
  const y = Math.floor(rect.y * dimensions.height)
  const right = Math.ceil((rect.x + rect.width) * dimensions.width)
  const bottom = Math.ceil((rect.y + rect.height) * dimensions.height)
  const width = right - x
  const height = bottom - y
  ensure(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= dimensions.width && y + height <= dimensions.height, `${label} produces an invalid pixel crop`)
  return { x, y, width, height }
}

function runtimeTextFrame(text, full) {
  const result = {
    x: (text.x - full.x) / full.width,
    y: (text.y - full.y) / full.height,
    width: text.width / full.width,
    height: text.height / full.height,
  }
  assertRect(result, 'Private Mushaf emitted textFrame')
  return result
}

async function fileDescriptor(path, expectedWidth, expectedHeight, runCommand) {
  const info = await run(runCommand, 'webpinfo', [path])
  const dimensions = parseWebpDimensions(info, basename(path))
  ensure(dimensions.width === expectedWidth && dimensions.height === expectedHeight, `${basename(path)} dimensions do not match the configured rendition`)
  const bytes = await readFile(path)
  ensure(bytes.byteLength > 0, `${basename(path)} is empty`)
  return { bytes: bytes.byteLength, sha256: sha256(bytes), width: dimensions.width, height: dimensions.height, mimeType: 'image/webp' }
}

async function existingImportDigest(normalizedDir) {
  try {
    const metadata = await readJson(join(normalizedDir, 'import.json'))
    ensure(typeof metadata.contentDigest === 'string' && /^[a-f0-9]{64}$/.test(metadata.contentDigest), 'Existing private Mushaf normalized output has no contentDigest')
    const { contentDigest, ...unsignedMetadata } = metadata
    ensure(contentDigest === sha256(Buffer.from(jsonText(unsignedMetadata))), 'Existing private Mushaf normalized output has an invalid contentDigest')
    ensure(metadata.mushafEditionId === PRIVATE_EDITION_ID && metadata.riwayah === RIWAYAH && Array.isArray(metadata.pages) && metadata.pages.length === PAGE_COUNT, 'Existing private Mushaf normalized output is incomplete')
    for (let index = 0; index < metadata.pages.length; index += 1) {
      const page = index + 1
      const row = metadata.pages[index]
      ensure(row?.page === page && Array.isArray(row.renditions) && row.renditions.length === 2, `Existing private Mushaf page ${page} is incomplete`)
      for (const rendition of row.renditions) {
        const expectedPath = `pages/${pad3(page)}-${rendition.width}.webp`
        ensure(rendition.assetPath === expectedPath && rendition.mimeType === 'image/webp' && Number.isInteger(rendition.bytes) && rendition.bytes > 0 && /^[a-f0-9]{64}$/.test(rendition.sha256), `Existing private Mushaf page ${page} has invalid rendition metadata`)
        const path = join(normalizedDir, rendition.assetPath)
        ensure(isInside(normalizedDir, path), `Existing private Mushaf page ${page} has an unsafe rendition path`)
        const bytes = await readFile(path).catch((error) => {
          if (error?.code === 'ENOENT') throw new Error(`Existing private Mushaf page ${page} rendition is missing`)
          throw error
        })
        ensure(bytes.byteLength === rendition.bytes && sha256(bytes) === rendition.sha256, `Existing private Mushaf page ${page} rendition digest is invalid`)
      }
    }
    return metadata.contentDigest
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

/**
 * Renders the sole pinned edition into an ignored immutable normalized sibling.
 * `paths` is intentionally test-only injection for temporary roots.
 */
export async function importPrivatePdfEdition({ editionId, pdfPath, runCommand = defaultCommandRunner, paths = {} }) {
  const contractDir = paths.contractDir ?? CONTRACT_DIR
  const repoRoot = paths.repoRoot ?? REPO_ROOT
  const normalizedRoot = paths.normalizedRoot ?? NORMALIZED_ROOT
  const contract = await loadPrivateMushafEditionContract(editionId, { contractDir, repoRoot })
  ensure(typeof pdfPath === 'string' && pdfPath.length > 0 && existsSync(pdfPath), 'Private Mushaf PDF path does not exist')
  ensure(basename(pdfPath) === contract.source.expectedFilename, 'Private Mushaf PDF filename does not match the pinned source contract')
  ensure(sha256(await readFile(pdfPath)) === contract.source.sha256, 'Private Mushaf PDF sha256 does not match the pinned source contract')

  const pdfInfo = parsePdfInfo(await run(runCommand, 'pdfinfo', ['-box', pdfPath]))
  ensure(pdfInfo.pages === contract.source.documentPageCount, 'Private Mushaf PDF page count does not match the pinned source contract')
  ensure(Math.abs(pdfInfo.width - contract.source.cropBoxPoints.width) < 0.001 && Math.abs(pdfInfo.height - contract.source.cropBoxPoints.height) < 0.001, 'Private Mushaf PDF CropBox does not match the pinned source contract')

  const normalizedDir = join(normalizedRoot, editionId)
  ensure(isInside(normalizedRoot, normalizedDir), 'Unsafe private Mushaf normalized output path')
  await mkdir(normalizedRoot, { recursive: true })
  const stageDir = join(normalizedRoot, `.${editionId}.stage-${randomUUID()}`)
  const pagesDir = join(stageDir, 'pages')
  const renderDir = join(stageDir, 'render')
  await mkdir(pagesDir, { recursive: true })
  await mkdir(renderDir, { recursive: true })

  try {
    const pages = []
    for (let index = 0; index < PAGE_COUNT; index += 1) {
      const page = index + 1
      const review = contract.pageStartReviews[index]
      const frame = contract.framingPages[index]
      ensure(review.sourcePdfPage === frame.sourcePdfPage, `Private Mushaf page ${page} review and framing source pages disagree`)
      const stem = join(renderDir, pad3(page))
      const pngPath = `${stem}.png`
      await run(runCommand, 'pdftocairo', ['-f', String(review.sourcePdfPage), '-l', String(review.sourcePdfPage), '-cropbox', '-png', '-r', String(contract.mediaPolicy.renderDpi), '-singlefile', pdfPath, stem])
      const rendered = pngDimensions(await readFile(pngPath), basename(pngPath))
      const crop = cropPixels(frame.sourceFullFrame, rendered, `Private Mushaf page ${page} Full frame`)
      const textFrame = runtimeTextFrame(frame.sourceTextFrame, frame.sourceFullFrame)
      const renditions = []
      for (const rendition of contract.mediaPolicy.renditions) {
        const filename = `${pad3(page)}-${rendition.width}.webp`
        const output = join(pagesDir, filename)
        await run(runCommand, 'cwebp', ['-q', String(contract.mediaPolicy.encoder.quality), '-m', String(contract.mediaPolicy.encoder.method), '-crop', String(crop.x), String(crop.y), String(crop.width), String(crop.height), '-resize', String(rendition.width), '0', pngPath, '-o', output])
        const expectedHeight = Math.round((crop.height * rendition.width) / crop.width)
        renditions.push({ role: rendition.role, assetPath: `pages/${filename}`, ...await fileDescriptor(output, rendition.width, expectedHeight, runCommand) })
      }
      await rm(pngPath, { force: true })
      pages.push({ page, sourcePdfPage: review.sourcePdfPage, firstVerse: review.canonicalFirstVerse, framing: { textFrame, sideLane: frame.sideLane }, renditions })
    }

    await rm(renderDir, { recursive: true, force: true })

    const output = {
      version: 1,
      riwayah: RIWAYAH,
      mushafEditionId: editionId,
      sourcePdfSha256: contract.source.sha256,
      contractDigest: contract.contractDigest,
      media: {
        kind: contract.mediaPolicy.kind,
        mimeType: contract.mediaPolicy.mimeType,
        renderDpi: contract.mediaPolicy.renderDpi,
        encoder: contract.mediaPolicy.encoder,
        renditions: contract.mediaPolicy.renditions,
      },
      pages,
    }
    output.contentDigest = sha256(Buffer.from(jsonText(output)))
    await writeFile(join(stageDir, 'import.json'), jsonText(output), 'utf8')

    const existingDigest = existsSync(normalizedDir) ? await existingImportDigest(normalizedDir) : null
    if (existingDigest !== null) {
      ensure(existingDigest === output.contentDigest, `Private Mushaf edition ${editionId} already exists with different bytes; create a new version id`)
      await rm(stageDir, { recursive: true, force: true })
      return { status: 'current', normalizedDir }
    }

    await rename(stageDir, normalizedDir)
    return { status: 'promoted', normalizedDir }
  } catch (error) {
    await rm(stageDir, { recursive: true, force: true })
    throw error
  }
}
