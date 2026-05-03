import { mkdir, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

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
