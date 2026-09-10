import { existsSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT as repoRoot, walkFiles } from './data/lib/fs.mjs'
const legacyMushafPattern = /\/dataset\/mushaf-pages\/[^/'"`]+\/(?:manifest\.json|pages\/\d{3}(?:\.svg|-\d+\.webp))/g

export function checkReactMushafAssetText(repoRelativePath, text) {
  return [...text.matchAll(legacyMushafPattern)].map(
    (match) => `${repoRelativePath} contains legacy React Mushaf path ${match[0]}.`,
  )
}

export function checkReactMushafOutputFiles(files) {
  return files
    .filter(
      (file) => file.path.startsWith('dist/assets/') && extname(file.path) === '.svg' && /<svg[\s>]/.test(file.text),
    )
    .map((file) => `${file.path} contains a Mushaf SVG body; React must install page packs on demand.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = []
  for (const file of await walkFiles(join(repoRoot, 'src'))) {
    failures.push(...checkReactMushafAssetText(relative(repoRoot, file), readFileSync(file, 'utf8')))
  }
  if (existsSync(join(repoRoot, 'dist'))) {
    const outputFiles = []
    for (const file of await walkFiles(join(repoRoot, 'dist'))) {
      outputFiles.push({ path: relative(repoRoot, file), text: readFileSync(file, 'utf8') })
    }
    failures.push(...checkReactMushafOutputFiles(outputFiles))
  }
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('react-mushaf-assets: ok')
}
