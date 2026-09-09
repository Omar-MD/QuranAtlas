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

export async function main(argv = process.argv.slice(2)) {
  const editionFilter = argValue(argv, 'edition')
  const catalog = await readJson(ASSET_CATALOG_PATH)
  // Only public, baseline-shipped editions. Private (internal) editions use
  // their dedicated validated restore path (`pnpm run data -- mushaf-pages
  // restore-release`), whose plain-tar layout and import metadata this fetch
  // path does not handle.
  const assets = (catalog.assets ?? []).filter(
    (asset) => typeof asset?.distributionPath === 'string' && asset.visibility === 'baseline',
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
