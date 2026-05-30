import { existsSync, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const repoRoot = new URL('..', import.meta.url).pathname
const legacyMushafPattern = /\/dataset\/mushaf-pages\/[^/'"`]+\/(?:manifest\.json|pages\/\d{3}\.svg)/g

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else files.push(path)
  }
  return files
}

export function checkReactMushafAssetText(repoRelativePath, text) {
  return [...text.matchAll(legacyMushafPattern)].map((match) => `${repoRelativePath} contains legacy React Mushaf path ${match[0]}.`)
}

export function checkReactMushafOutputFiles(files) {
  return files
    .filter((file) => file.path.startsWith('dist/assets/') && extname(file.path) === '.svg' && /<svg[\s>]/.test(file.text))
    .map((file) => `${file.path} contains a Mushaf SVG body; React must install page packs on demand.`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const failures = []
  for (const file of await walk(join(repoRoot, 'src'))) {
    failures.push(...checkReactMushafAssetText(relative(repoRoot, file), readFileSync(file, 'utf8')))
  }
  if (existsSync(join(repoRoot, 'dist'))) {
    const outputFiles = []
    for (const file of await walk(join(repoRoot, 'dist'))) {
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
