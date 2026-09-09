#!/usr/bin/env node
// Fetches normalized Mushaf page media from the pinned GitHub Release
// artifacts named by each edition's distribution contract. Heavy media never
// enters git history: the repository carries the tooling and the contract,
// CI (or a local developer) fetches the artifact and verifies it byte-exact
// before data:build consumes it.

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { inspectPrivateMushafTar } from './release-archive.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const ASSET_CATALOG_PATH = join(REPO_ROOT, 'data', 'catalog', 'mushaf-assets.json')
const CATALOG_DIR = join(REPO_ROOT, 'data', 'catalog')
const NORMALIZED_ROOT = join(REPO_ROOT, 'data', 'normalized', 'mushaf-pages')
const STAGE_ROOT = join(REPO_ROOT, '.scratch', 'mushaf-pages', 'releases')

function argValue(argv, name) {
  const flag = argv.find((arg) => arg.startsWith(`--${name}=`))
  return flag ? flag.slice(name.length + 3) : null
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function countPages(editionDir) {
  const pagesDir = join(editionDir, 'pages')
  if (!existsSync(pagesDir)) return 0
  return (await readdir(pagesDir)).filter((name) => /\.svg$/.test(name) || /\.webp$/.test(name)).length
}

async function download(url, target, expectedBytes) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength !== expectedBytes) {
    throw new Error(`Release artifact size mismatch: expected ${expectedBytes} bytes, got ${buffer.byteLength}`)
  }
  await writeFile(target, buffer)
  return buffer
}

function extractArchive(archivePath, destinationRoot) {
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', destinationRoot], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`Failed to extract ${archivePath}`)
}

function extractPlainArchive(archivePath, destinationRoot) {
  const result = spawnSync('tar', ['-xf', archivePath, '-C', destinationRoot], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`Failed to extract ${archivePath}`)
}

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

// Private (internal) editions ship a plain USTAR archive rooted at the edition
// id. The pinned sha256 plus inspectPrivateMushafTar verify the whole archive
// in pure Node (inventory, import contract, per-rendition digests); the
// webpinfo re-measurement stays on the owner-only `restore-release` path,
// which also accepts hand-carried archives.
async function fetchPrivateEdition({ asset, contract }) {
  const editionRoot = join(NORMALIZED_ROOT, asset.riwayah)
  const editionDir = join(editionRoot, asset.mushafEditionId)
  const expectedPages = contract.fileCount - 1
  if (existsSync(join(editionDir, 'import.json')) && (await countPages(editionDir)) >= expectedPages) {
    console.log(`[mushaf-pages] ${asset.mushafEditionId}: local media already complete, skipping fetch`)
    return
  }
  await rm(editionDir, { recursive: true, force: true })
  const url = `https://github.com/${contract.repository}/releases/download/${contract.releaseTag}/${contract.assetName}`
  await mkdir(STAGE_ROOT, { recursive: true })
  const staged = join(STAGE_ROOT, contract.assetName)
  // A previously staged archive that still matches the pinned digest is
  // reused as-is: a failed extraction (or full disk) must not force another
  // heavy download of the exact same bytes.
  const stagedBytes = await readFile(staged).catch(() => null)
  let buffer = null
  if (
    stagedBytes &&
    stagedBytes.byteLength === contract.archiveBytes &&
    sha256Hex(stagedBytes) === contract.archiveSha256
  ) {
    console.log(`[mushaf-pages] ${asset.mushafEditionId}: reusing staged archive ${contract.assetName}`)
    buffer = stagedBytes
  } else {
    console.log(`[mushaf-pages] ${asset.mushafEditionId}: fetching ${url}`)
    buffer = await download(url, staged, contract.archiveBytes)
  }
  if (sha256Hex(buffer) !== contract.archiveSha256) {
    throw new Error(`Release artifact checksum mismatch for ${contract.assetName}: ${sha256Hex(buffer)}`)
  }
  const inspected = inspectPrivateMushafTar(buffer, contract)
  await mkdir(editionRoot, { recursive: true })
  extractPlainArchive(staged, editionRoot)
  const extractedImport = await readFile(join(editionDir, 'import.json'))
  if (!extractedImport.equals(inspected.importBytes)) {
    throw new Error(`${asset.mushafEditionId}: extracted import.json differs from the verified archive`)
  }
  for (const rendition of inspected.renditions) {
    const bytes = await readFile(join(editionDir, rendition.assetPath))
    if (bytes.byteLength !== rendition.bytes || sha256Hex(bytes) !== rendition.sha256) {
      throw new Error(`${asset.mushafEditionId}: extracted rendition ${rendition.assetPath} bytes are invalid`)
    }
  }
  const pages = await countPages(editionDir)
  if (pages < expectedPages) {
    throw new Error(`${asset.mushafEditionId}: extracted ${pages} page files, expected ${expectedPages}`)
  }
  console.log(`[mushaf-pages] ${asset.mushafEditionId}: verified ${pages} page files`)
  await rm(staged, { force: true })
}

export async function main(argv = process.argv.slice(2)) {
  const editionFilter = argValue(argv, 'edition')
  const catalog = await readJson(ASSET_CATALOG_PATH)
  // Baseline-shipped editions and pinned private editions. Both carry a
  // tracked distribution contract; private (internal) archives go through
  // their inspection-verified plain-tar path instead of the gzipped layout.
  const assets = (catalog.assets ?? []).filter(
    (asset) =>
      typeof asset?.distributionPath === 'string' &&
      (asset.visibility === 'baseline' || asset.sourceKind === 'local-pdf'),
  )

  const targets = []
  for (const asset of assets) {
    if (editionFilter && asset.mushafEditionId !== editionFilter) continue
    const contractPath = join(CATALOG_DIR, asset.distributionPath)
    if (!existsSync(contractPath)) throw new Error(`Missing distribution contract: ${asset.distributionPath}`)
    targets.push({ asset, contract: await readJson(contractPath) })
  }
  if (targets.length === 0) {
    console.log('[mushaf-pages] no distribution contracts to fetch')
    return
  }

  await mkdir(STAGE_ROOT, { recursive: true })
  for (const { asset, contract } of targets) {
    if (asset.sourceKind === 'local-pdf') {
      await fetchPrivateEdition({ asset, contract })
      continue
    }
    const editionDir = join(NORMALIZED_ROOT, asset.riwayah, asset.mushafEditionId)
    if ((await countPages(editionDir)) >= contract.fileCount) {
      console.log(`[mushaf-pages] ${asset.mushafEditionId}: local media already complete, skipping fetch`)
      continue
    }
    await rm(editionDir, { recursive: true, force: true })
    const url = `https://github.com/${contract.repository}/releases/download/${contract.releaseTag}/${contract.assetName}`
    console.log(`[mushaf-pages] ${asset.mushafEditionId}: fetching ${url}`)
    const staged = join(STAGE_ROOT, contract.assetName)
    const buffer = await download(url, staged, contract.archiveBytes)
    const digest = createHash('sha256').update(buffer).digest('hex')
    if (digest !== contract.archiveSha256) {
      throw new Error(`Release artifact checksum mismatch for ${contract.assetName}: ${digest}`)
    }
    await mkdir(NORMALIZED_ROOT, { recursive: true })
    extractArchive(staged, NORMALIZED_ROOT)
    const pages = await countPages(editionDir)
    if (pages < contract.fileCount) {
      throw new Error(`${asset.mushafEditionId}: extracted ${pages} page files, expected ${contract.fileCount}`)
    }
    console.log(`[mushaf-pages] ${asset.mushafEditionId}: verified ${pages} page files`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
