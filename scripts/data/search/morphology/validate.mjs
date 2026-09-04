#!/usr/bin/env node

import { importQacMorphologySource } from './import.mjs'
import { buildSearchCorePostings } from '../postings.mjs'
import { buildSearchMorphologyPayloads, MORPHOLOGY_REQUIRED_SHARDS } from './build.mjs'
import { decodeJsonShard, sha256Hex, writeJsonShard } from '../abi-writer.mjs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..', '..')
const HAFS_SOURCE_PATH = join(REPO_ROOT, 'data', 'normalized', 'search', 'tanzil', 'hafs.json')
const BRIDGES_SOURCE_PATH = join(REPO_ROOT, 'data', 'normalized', 'translations', 'bridges.json')
const MAX_SHARD_BYTES = 4 * 1024 * 1024

export async function validateSearchMorphology({ buildShards = false } = {}) {
  const imported = await importQacMorphologySource()
  if (!imported.licenseIds.includes('search-qac-gpl-v3-terms')) {
    throw new Error('QAC morphology license id is missing from normalized metadata')
  }
  if (!imported.sourceAvailability || !imported.transformedDataNotes || !imported.requiredNotice) {
    throw new Error('QAC morphology source availability and transformed-output notes are required')
  }
  if (!buildShards) return imported

  const corePostings = await buildSearchCorePostings({
    hafsPath: HAFS_SOURCE_PATH,
    translationPath: BRIDGES_SOURCE_PATH,
  })
  const morphology = await buildSearchMorphologyPayloads({ corePostings })
  const shardIds = morphology.payloads.map(([filename]) => filename.replace(/-\d+\.qas$|\.qas$/g, ''))
  for (const required of MORPHOLOGY_REQUIRED_SHARDS) {
    if (!shardIds.some((id) => id === required || id.startsWith(`${required}-`))) {
      throw new Error(`missing morphology dependency shard ${required}`)
    }
  }
  for (const [filename, payload] of morphology.payloads) {
    const bytes = writeJsonShard({ payload })
    if (bytes.byteLength > MAX_SHARD_BYTES) throw new Error(`morphology shard ${filename} exceeds byte budget`)
    if (!/^[a-f0-9]{64}$/.test(sha256Hex(bytes))) throw new Error(`invalid checksum for ${filename}`)
    decodeJsonShard(bytes)
  }
  return imported
}

export async function main(argv = process.argv.slice(2)) {
  await validateSearchMorphology({ buildShards: argv.includes('--build-shards') })
  console.log('Validated Search morphology source and derived shard payloads')
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
