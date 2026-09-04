import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const repoRoot = new URL('..', import.meta.url).pathname
const checkedExtensions = new Set(['.tsx'])
const rawControls = ['button', 'input', 'textarea', 'select']

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

if (import.meta.url === `file://${process.argv[1]}`) {
  const failures = []
  for (const file of await walk(join(repoRoot, 'src'))) {
    const repoRelativePath = relative(repoRoot, file)
    failures.push(...checkReactUiForbiddenPatternText(repoRelativePath, readFileSync(file, 'utf8')))
  }
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('react-ui-forbidden-patterns: ok')
}
