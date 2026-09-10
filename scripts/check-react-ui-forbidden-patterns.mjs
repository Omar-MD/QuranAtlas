import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT as repoRoot, walkFiles } from './data/lib/fs.mjs'
const checkedExtensions = new Set(['.tsx'])
const rawControls = ['button', 'input', 'textarea', 'select']

export function checkReactUiForbiddenPatternText(repoRelativePath, text) {
  if (repoRelativePath.startsWith('src/components/ui/')) return []
  if (repoRelativePath.endsWith('.stories.tsx')) return []
  const failures = []
  for (const tag of rawControls) {
    const pattern = new RegExp(`<${tag}(?:\\s|>|/)`, 'g')
    if (pattern.test(text)) failures.push(`${repoRelativePath} uses raw <${tag}>; use src/components/ui.`)
  }
  return failures
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = []
  for (const file of await walkFiles(join(repoRoot, 'src'), checkedExtensions)) {
    const repoRelativePath = relative(repoRoot, file)
    failures.push(...checkReactUiForbiddenPatternText(repoRelativePath, readFileSync(file, 'utf8')))
  }
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('react-ui-forbidden-patterns: ok')
}
