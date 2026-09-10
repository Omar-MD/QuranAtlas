// Dataset manifest refresh shared by the mushaf-pages and riwayah-packages
// lanes (audit §5: the two copies were verbatim duplicates).
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { buildManifestPayload } from '../manifest/inventory.mjs'
import { readJson } from './json.mjs'

async function manifestTextSourcesFromCurrentManifest(datasetDir) {
  const manifestPath = join(datasetDir, 'manifest.json')
  if (!existsSync(manifestPath)) return null
  const manifest = await readJson(manifestPath)
  if (!Array.isArray(manifest.files)) return null
  const ids = new Set()
  for (const file of manifest.files) {
    if (typeof file?.path !== 'string') continue
    const translation = file.path.match(/^translations\/([^/]+)\//)
    const tafsir = file.path.match(/^tafsir\/([^/]+)\//)
    if (translation) ids.add(translation[1])
    if (tafsir) ids.add(tafsir[1])
  }
  return ids
}

export async function refreshDatasetManifest(profileName, datasetDir) {
  const provenance = await readJson(join(datasetDir, 'provenance.json'))
  const manifest = await buildManifestPayload({
    datasetDir,
    provenance,
    packageVersion: provenance.packageVersion,
    profileName,
    manifestTextSources: await manifestTextSourcesFromCurrentManifest(datasetDir),
  })
  await writeFile(join(datasetDir, 'manifest.json'), JSON.stringify(manifest), 'utf8')
}
