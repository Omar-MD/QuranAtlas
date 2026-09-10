import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT as repoRoot, walkFiles } from './data/lib/fs.mjs'
const checkedExtensions = new Set(['.ts', '.tsx'])
const radixImportPattern = /(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"](@radix-ui\/react-[^'"]+)['"]/g

export function checkReactRadixBoundaryText(repoRelativePath, text) {
  if (repoRelativePath.startsWith('src/components/ui/')) return []
  const failures = []
  for (const match of text.matchAll(radixImportPattern)) {
    failures.push(
      `${repoRelativePath} imports ${match[1]}: direct Radix imports are restricted to src/components/ui/**.`,
    )
  }
  return failures
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = []
  for (const file of await walkFiles(join(repoRoot, 'src'), checkedExtensions)) {
    const repoRelativePath = relative(repoRoot, file)
    failures.push(...checkReactRadixBoundaryText(repoRelativePath, readFileSync(file, 'utf8')))
  }
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('react-radix-boundaries: ok')
}
