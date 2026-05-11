#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertSafeSvg, quranWsPagePdfUrl } from './build.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const CATALOG_PATH = join(REPO_ROOT, 'data', 'catalog', 'mushaf-pages.json')
const SCRATCH_DIR = join(REPO_ROOT, '.scratch', 'mushaf-pages')
const NORMALIZED_DIR = join(REPO_ROOT, 'data', 'normalized', 'mushaf-pages')

function argValue(argv, name, fallback = null) {
  const flag = argv.find((arg) => arg.startsWith(`--${name}=`))
  return flag ? flag.slice(name.length + 3) : fallback
}

function pad3(n) {
  return String(n).padStart(3, '0')
}

function parsePages(raw, pageCount) {
  if (!raw || raw === 'all') return Array.from({ length: pageCount }, (_, i) => i + 1)
  const range = raw.match(/^(\d+)-(\d+)$/)
  if (range) {
    const start = Number.parseInt(range[1], 10)
    const end = Number.parseInt(range[2], 10)
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > pageCount || end < start) {
      throw new Error(`Invalid Mushaf page range: ${raw}; expected 1-${pageCount}`)
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }
  return raw.split(',').map((item) => {
    const trimmed = item.trim()
    const page = Number.parseInt(trimmed, 10)
    if (!Number.isInteger(page) || page < 1 || page > pageCount || String(page) !== trimmed) {
      throw new Error(`Invalid Mushaf page number: ${item}; expected 1-${pageCount}`)
    }
    return page
  })
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function download(url, target) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`)
  }
  await writeFile(target, new Uint8Array(await response.arrayBuffer()))
}

function assertPdftocairoAvailable() {
  const result = spawnSync('pdftocairo', ['-v'], { stdio: 'ignore' })
  if (result.error?.code === 'ENOENT') {
    throw new Error('pdftocairo is required for Mushaf page import. Install Poppler, then rerun the import command.')
  }
}

async function convertPdfToSvg(pdfPath, svgPath) {
  const result = spawnSync('pdftocairo', ['-svg', pdfPath, svgPath], { stdio: 'inherit' })
  if (result.error?.code === 'ENOENT') {
    throw new Error('pdftocairo is required for Mushaf page import. Install Poppler, then rerun the import command.')
  }
  if (result.status !== 0) {
    throw new Error(`pdftocairo failed while converting ${pdfPath}`)
  }
  const svg = await readFile(svgPath, 'utf8')
  try {
    assertSafeSvg(basename(svgPath), svg)
  } catch {
    throw new Error(`pdftocairo did not produce an SVG document: ${svgPath}`)
  }
}

export async function hasReusableSvgDocument(path) {
  if (!existsSync(path)) return false
  const svg = await readFile(path, 'utf8').catch(() => '')
  try {
    assertSafeSvg(basename(path), svg)
    return true
  } catch {
    return false
  }
}

export async function main(argv = process.argv.slice(2)) {
  const catalog = await readJson(CATALOG_PATH)
  const riwayah = argValue(argv, 'riwayah')
  if (!riwayah || !catalog.riwayat?.[riwayah]) {
    throw new Error('Usage: pnpm run data -- mushaf-pages import --riwayah=qaloon --pages=1-604')
  }

  const pages = parsePages(argValue(argv, 'pages', 'all'), catalog.pageCount)
  const sourceSlug = catalog.riwayat[riwayah].sourceSlug
  const pdfDir = join(SCRATCH_DIR, 'pdfs', riwayah)
  const svgDir = join(NORMALIZED_DIR, riwayah, 'pages')

  assertPdftocairoAvailable()
  await mkdir(pdfDir, { recursive: true })
  await mkdir(svgDir, { recursive: true })

  for (const page of pages) {
    const pdfPath = join(pdfDir, `${pad3(page)}.pdf`)
    const svgPath = join(svgDir, `${pad3(page)}.svg`)
    if (await hasReusableSvgDocument(svgPath)) continue
    if (!existsSync(pdfPath)) {
      await download(quranWsPagePdfUrl(sourceSlug, page), pdfPath)
    }
    await convertPdfToSvg(pdfPath, svgPath)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
