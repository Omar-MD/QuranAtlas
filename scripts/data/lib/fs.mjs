import { mkdir, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export async function listFiles(rootDir) {
  const out = []

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else {
        out.push(full)
      }
    }
  }

  await walk(rootDir)
  return out
}

// Recursive file listing for the guardrail scripts (audit §5: five walk()
// copies). `extensions` (an iterable like ['.ts', '.tsx']) filters; without
// it every file is returned. Unreadable directories yield no entries.
export async function walkFiles(dir, extensions = null) {
  const filter = extensions ? new Set(extensions) : null
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(path, filter)))
    } else if (!filter || filter.has(extname(entry.name))) {
      files.push(path)
    }
  }
  return files
}
export async function cleanPackDirs(parentDir, keepNames = []) {
  if (!existsSync(parentDir)) {
    await mkdir(parentDir, { recursive: true })
    return
  }
  const keep = new Set(keepNames)
  for (const entry of await readdir(parentDir, { withFileTypes: true })) {
    if (keep.has(entry.name)) continue
    if (entry.isDirectory()) {
      await rm(join(parentDir, entry.name), { recursive: true, force: true })
    }
  }
}
