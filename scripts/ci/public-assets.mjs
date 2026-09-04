import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'

export const publicShellAssetEntries = [
  '_headers',
  'favicon.ico',
  'wird-notification-sw.js',
  'icons',
  'fonts',
]

export const releaseRuntimeAssetEntries = [
  'dataset',
  'search-packs',
]

function displayList(entries) {
  return entries.map((entry) => `public/${entry}`).join(', ')
}

async function assertPublicEntry(publicDir, entry) {
  const source = path.join(publicDir, entry)
  try {
    return await stat(source)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Required public asset is missing: public/${entry}`)
    }
    throw error
  }
}

async function collectFiles(publicDir, parts, files) {
  const source = path.join(publicDir, ...parts)
  const sourceStat = await stat(source)

  if (sourceStat.isDirectory()) {
    const children = await readdir(source, { withFileTypes: true })
    children.sort((a, b) => a.name.localeCompare(b.name))
    for (const child of children) await collectFiles(publicDir, [...parts, child.name], files)
    return
  }

  if (sourceStat.isFile()) {
    files.push({
      source,
      fileName: parts.join('/'),
    })
  }
}

export async function collectPublicAssetFiles({
  root = process.cwd(),
  publicDirName = 'public',
  entries = publicShellAssetEntries,
} = {}) {
  const publicDir = path.resolve(root, publicDirName)
  const files = []

  for (const entry of entries) {
    await assertPublicEntry(publicDir, entry)
    await collectFiles(publicDir, entry.split('/'), files)
  }

  return files
}

export async function readPublicAssetFile(file) {
  return readFile(file.source)
}

export async function copyPublicAssetEntries({
  root = process.cwd(),
  publicDirName = 'public',
  outDir = 'dist',
  entries,
  logPrefix = 'public-assets',
} = {}) {
  if (!entries?.length) throw new Error('copyPublicAssetEntries requires at least one entry')

  const publicDir = path.resolve(root, publicDirName)
  const outputDir = path.resolve(root, outDir)
  await mkdir(outputDir, { recursive: true })

  console.log(`[${logPrefix}] copying ${displayList(entries)} into ${path.relative(root, outputDir) || outDir}/`)

  for (const entry of entries) {
    await assertPublicEntry(publicDir, entry)
    const source = path.join(publicDir, entry)
    const target = path.join(outputDir, entry)
    await rm(target, { recursive: true, force: true })
    await cp(source, target, { recursive: true })
  }
}

export async function removeOutputAssetEntries({
  outDir,
  entries,
} = {}) {
  if (!outDir) throw new Error('removeOutputAssetEntries requires an output directory')
  if (!entries?.length) return

  for (const entry of entries) {
    await rm(path.join(outDir, entry), { recursive: true, force: true })
  }
}
