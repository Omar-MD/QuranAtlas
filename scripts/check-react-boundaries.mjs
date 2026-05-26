import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const repoRoot = new URL('..', import.meta.url).pathname
const checkedExtensions = new Set(['.js', '.ts', '.tsx', '.svelte'])
const importPattern = /(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(path))
    } else if (checkedExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }
  return files
}

function isForbidden(sourcePath, specifier) {
  const source = relative(repoRoot, sourcePath)
  if (source.startsWith('src-react/') && (specifier.startsWith('../src/') || specifier.startsWith('../../src/') || specifier.startsWith('/src/') || specifier.startsWith('src/'))) {
    return 'React code must not import Svelte app modules.'
  }
  if (source.startsWith('src/') && (specifier.includes('src-react/') || specifier.startsWith('../src-react/') || specifier.startsWith('../../src-react/') || specifier.startsWith('/src-react/'))) {
    return 'Svelte code must not import React app modules.'
  }
  return null
}

const files = [
  ...await walk(join(repoRoot, 'src')),
  ...await walk(join(repoRoot, 'src-react')),
]

const failures = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2]
    const reason = isForbidden(file, specifier)
    if (reason) {
      failures.push(`${relative(repoRoot, file)} imports ${specifier}: ${reason}`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('react-boundaries: ok')
