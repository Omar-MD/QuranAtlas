import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const modulePath = fileURLToPath(import.meta.url).replace(/^\/@fs\//, '/')
const repoRoot = resolve(dirname(modulePath), '..')
const allowlist = JSON.parse(readFileSync(join(repoRoot, 'src/design-system/docs/measured-layout-allowlist.json'), 'utf8'))
const allowedLiteralCssFiles = new Set(allowlist.allowedLiteralCssFiles)
const allowedArbitraryUtilities = new Set(allowlist.allowedArbitraryUtilities.map((entry) => entry.className))
const checkedExtensions = new Set(['.ts', '.tsx', '.css'])
const forbiddenPalette = /\bqar:(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g
const arbitraryUtility = /\bqar:[\w:-]+-\[[^\]]+\]/g
const hexColor = /#[0-9a-fA-F]{3,8}\b/g
const primitiveToken = /var\(--qar-/g
const inlineColorStyle = /style=\{\{[^}]*color\s*:/g

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

export function checkReactDesignText(repoRelativePath, text) {
  const failures = []
  for (const match of text.matchAll(forbiddenPalette)) {
    failures.push(`${repoRelativePath}: forbidden Tailwind palette utility ${match[0]}`)
  }
  for (const match of text.matchAll(arbitraryUtility)) {
    if (match[0].startsWith('qar:data-[')) continue
    if (!allowedArbitraryUtilities.has(match[0])) {
      failures.push(`${repoRelativePath}: unapproved arbitrary utility ${match[0]}`)
    }
  }
  if (!allowedLiteralCssFiles.has(repoRelativePath)) {
    for (const match of text.matchAll(hexColor)) {
      failures.push(`${repoRelativePath}: raw color literal ${match[0]}`)
    }
    if (text.match(primitiveToken)) {
      failures.push(`${repoRelativePath}: primitive token consumed outside token files`)
    }
  }
  if (inlineColorStyle.test(text)) {
    failures.push(`${repoRelativePath}: inline color style is forbidden`)
  }
  return failures
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const failures = []
  for (const file of await walk(join(repoRoot, 'src'))) {
    const repoRelativePath = relative(repoRoot, file)
    failures.push(...checkReactDesignText(repoRelativePath, readFileSync(file, 'utf8')))
  }
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('react-design-literals: ok')
}
