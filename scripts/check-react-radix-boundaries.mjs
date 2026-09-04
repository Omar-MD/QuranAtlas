import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const repoRoot = new URL('..', import.meta.url).pathname
const checkedExtensions = new Set(['.ts', '.tsx'])
const radixImportPattern = /(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"](@radix-ui\/react-[^'"]+)['"]/g

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else if (checkedExtensions.has(extname(entry.name))) files.push(path)
  }
  return files
}

export function checkReactRadixBoundaryText(repoRelativePath, text) {
  if (repoRelativePath.startsWith('src/components/ui/')) return []
  const failures = []
  for (const match of text.matchAll(radixImportPattern)) {
    failures.push(`${repoRelativePath} imports ${match[1]}: direct Radix imports are restricted to src/components/ui/**.`)
  }
  return failures
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const failures = []
  for (const file of await walk(join(repoRoot, 'src'))) {
    const repoRelativePath = relative(repoRoot, file)
    failures.push(...checkReactRadixBoundaryText(repoRelativePath, readFileSync(file, 'utf8')))
  }
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('react-radix-boundaries: ok')
}
