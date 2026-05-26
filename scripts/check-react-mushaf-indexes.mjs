import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = new URL('..', import.meta.url).pathname
const indexPath = join(repoRoot, 'public/dataset/indexes/mushaf-assets.json')

function isEditionAwareMushafUrl(url) {
  const pathname = new URL(url, 'https://quranatlas.local').pathname
  return /^\/dataset\/mushaf-pages\/[^/]+\/[^/]+\/(?:manifest\.json|pages\/(?:\d{3}|\{page\})\.svg)$/.test(pathname)
}

export function validateMushafIndexData(data) {
  const packs = data.packs ?? data.assets ?? data
  const failures = []
  if (!Array.isArray(packs)) return ['Mushaf index must be an array or { packs: [] }.']
  for (const pack of packs) {
    const packId = pack.packId ?? `mushaf-pages:${pack.riwayah}:${pack.mushafEditionId}`
    if ('deliveryMode' in pack && pack.deliveryMode !== 'on-demand-pack') failures.push(`${packId}: deliveryMode must be on-demand-pack`)
    if (pack.pageCount !== 604) failures.push(`${packId}: pageCount must be 604`)
    if (!isEditionAwareMushafUrl(pack.manifestUrl)) failures.push(`${packId}: manifestUrl must be edition-aware`)
    if (pack.pageUrlTemplate && !isEditionAwareMushafUrl(pack.pageUrlTemplate.replace('{page}', '001'))) failures.push(`${packId}: pageUrlTemplate must be edition-aware`)
    for (const url of pack.pageUrls ?? []) {
      if (!isEditionAwareMushafUrl(url)) failures.push(`${packId}: page URL must be edition-aware: ${url}`)
    }
    for (const file of pack.files ?? []) {
      if (!isEditionAwareMushafUrl(file.url)) failures.push(`${packId}: file URL must be edition-aware: ${file.url}`)
    }
  }
  return failures
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(indexPath)) {
    console.log('react-mushaf-indexes: no public/dataset/indexes/mushaf-assets.json present')
    process.exit(0)
  }
  const failures = validateMushafIndexData(JSON.parse(readFileSync(indexPath, 'utf8')))
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log('react-mushaf-indexes: ok')
}
