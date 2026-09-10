import { readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT as repoRoot, walkFiles } from './data/lib/fs.mjs'
const checkedExtensions = new Set(['.css', '.js', '.ts', '.tsx'])
const importPattern = /(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g
const cssImportPattern = /@import\s+(?:url\()?['"]([^'")]+)['"]\)?/g

function importsRetiredStyles(specifier) {
  return /(?:^|\/)src\/styles\//.test(specifier) || /(?:\.\.\/)+src\/styles\//.test(specifier)
}

function isReactOrStorybookSource(source) {
  return source.startsWith('src/') || source.startsWith('.storybook/')
}

function isForbiddenImport(source, specifier) {
  if (isReactOrStorybookSource(source) && importsRetiredStyles(specifier)) {
    return 'React and Storybook code must use src/design-system/** styles.'
  }
  return null
}

function isForbiddenCssImport(source, specifier) {
  if (!isReactOrStorybookSource(source)) return null
  if (importsRetiredStyles(specifier)) {
    return 'React and Storybook CSS must use src/design-system/** styles.'
  }
  return null
}

export function checkReactBoundaryText(sourcePath, text) {
  const source = sourcePath.startsWith('/') ? relative(repoRoot, sourcePath) : sourcePath
  const failures = []

  if (extname(source) !== '.css') {
    for (const match of text.matchAll(importPattern)) {
      const specifier = match[1] ?? match[2]
      const reason = isForbiddenImport(source, specifier)
      if (reason) failures.push(`${source} imports ${specifier}: ${reason}`)
    }
  }

  for (const match of text.matchAll(cssImportPattern)) {
    const specifier = match[1]
    const reason = isForbiddenCssImport(source, specifier)
    if (reason) failures.push(`${source} imports ${specifier}: ${reason}`)
  }

  if (source.startsWith('src/') && /\bclassName\s*=\s*["'][^"']*\bqa-/.test(text)) {
    failures.push(`${source} uses retired legacy styling classes; use qar: utilities and React semantic tokens.`)
  }

  return failures
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = [
    ...(await walkFiles(join(repoRoot, '.storybook'), checkedExtensions)),
    ...(await walkFiles(join(repoRoot, 'src'), checkedExtensions)),
  ]

  const failures = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    failures.push(...checkReactBoundaryText(file, text))
  }

  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }

  console.log('react-boundaries: ok')
}
