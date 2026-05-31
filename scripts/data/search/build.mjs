#!/usr/bin/env node

import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { decodeJsonShard, sha256Hex, stableJson, writeJsonShard } from './abi-writer.mjs'
import { buildSearchCorePostings } from './postings.mjs'
import { buildSearchMorphologyPayloads, MORPHOLOGY_REQUIRED_SHARDS } from './morphology/build.mjs'
import { buildSearchGraphPayloads, GRAPH_REQUIRED_SHARDS } from './graph/build.mjs'
import {
  SEARCH_PACKS_RUNTIME_PREFIX,
  SEARCH_PACKS_FILESYSTEM_PREFIX,
  buildSearchRegistry,
  assertNoStableMutableSearchUrls,
} from './registry.mjs'
import {
  SEARCH_NORMALIZER_VERSION,
  SEARCH_PHASE1_MAX_PHRASE_TOKENS,
  SEARCH_QUERY_AST_VERSION,
} from './normalizer.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const HAFS_SEARCH_SOURCE_ID = 'search-hafs-text-tanzil-v1'
const HAFS_SEARCH_LICENSE_ID = 'search-tanzil-hafs-text'
const HAFS_SOURCE_PATH = join(REPO_ROOT, 'data', 'normalized', 'search', 'tanzil', 'hafs.json')
const BRIDGES_SOURCE_PATH = join(REPO_ROOT, 'data', 'normalized', 'translations', 'bridges.json')
const SEARCH_PACK_ROOT = join(REPO_ROOT, 'public', 'search-packs')
const PACKS_ROOT = join(SEARCH_PACK_ROOT, 'packs')
const REGISTRY_PATH = join(SEARCH_PACK_ROOT, 'registry.json')
const GENERATED_AT = '2026-05-31T00:00:00.000Z'
const PACK_VERSION = '1.0.0'
const PACK_ID = 'qa-search-core-hafs-v1'
const GRAPH_CORPUS_ID = 'hafs-search-core-v1'
const MAX_SHARD_BYTES = 4 * 1024 * 1024
const MAX_DECODED_SHARD_BYTES = 8 * 1024 * 1024
const MAX_RESIDENT_WORKER_BYTES = 48 * 1024 * 1024

export async function buildSearchCorePack({ profile = 'baseline', write = true, check = false } = {}) {
  if (profile !== 'baseline' && profile !== 'full') {
    throw new Error(`Search pack build does not support profile ${profile}`)
  }

  const sourceDigests = {
    [HAFS_SEARCH_SOURCE_ID]: await fileSha256(HAFS_SOURCE_PATH),
    'search-bridges-context-qul-v1': await fileSha256(BRIDGES_SOURCE_PATH),
  }
  const postings = await buildSearchCorePostings({
    hafsPath: HAFS_SOURCE_PATH,
    translationPath: BRIDGES_SOURCE_PATH,
  })
  const morphology = await buildSearchMorphologyPayloads({ corePostings: postings })
  const graph = buildSearchGraphPayloads({
    corePostings: postings,
    morphology,
    maxShardBytes: MAX_SHARD_BYTES,
    maxDecodedShardBytes: MAX_DECODED_SHARD_BYTES,
    maxResidentWorkerBytes: MAX_RESIDENT_WORKER_BYTES,
  })
  sourceDigests['search-qac-morphology-0-4'] = morphology.sourceDigest
  const contentHash = sha256Hex(Buffer.from(stableJson({
    builder: 'quranatlas-search-phase-3-memory-graph-v1',
    graphPolicy: graph.policy,
    graphStats: graph.stats,
    morphologyPayloadVersion: 2,
    packVersion: PACK_VERSION,
    sourceDigests,
  }))).slice(0, 32)
  const shardPayloads = [
    ['core-references.qas', {
      kind: 'references',
      ayahs: postings.ayahs,
    }],
    ['core-dictionaries.qas', {
      kind: 'dictionaries',
      dictionaries: postings.dictionaries,
    }],
    ['arabic-postings.qas', {
      kind: 'postings',
      lane: 'arabic',
      postings: postings.postings.arabic,
    }],
    ['exact-word-postings.qas', {
      kind: 'postings',
      lane: 'exact-word',
      postings: postings.postings.exactWord,
    }],
    ['translation-postings.qas', {
      kind: 'postings',
      lane: 'translation',
      postings: postings.postings.translation,
    }],
    ['core-provenance.qas', {
      kind: 'provenance',
      sourceIds: Object.keys(sourceDigests),
      buildInputDigests: sourceDigests,
      generatedAt: GENERATED_AT,
    }],
  ]
  for (const [length, rows] of phrasePostingGroups(postings.postings.phrase)) {
    let chunk = 1
    for (const postingsChunk of chunkRows(rows, 25_000)) {
      shardPayloads.push([`phrase-postings-l${length}-${chunk}.qas`, {
        kind: 'postings',
        lane: 'phrase',
        phraseLength: Number(length),
        phrasePolicy: postings.phrasePolicy,
        postings: postingsChunk,
      }])
      chunk += 1
    }
  }
  shardPayloads.push(...morphology.payloads)
  shardPayloads.push(...graph.payloads)

  const shardFiles = shardPayloads.map(([filename, payload], index) => {
    const bytes = writeJsonShard({
      schemaOrdinal: index + 1,
      featureOrdinal: index + 1,
      fixtureId: index + 1,
      payload,
    })
    const checksum = sha256Hex(bytes)
    if (bytes.byteLength > MAX_SHARD_BYTES) {
      throw new Error(`Search shard ${filename} exceeds encoded byte budget`)
    }
    return { filename, payload, bytes, checksum }
  })

  const shardManifests = shardFiles.map((file) => ({
    shardId: file.filename.replace(/\.qas$/, ''),
    featureId: featureForShard(file.filename),
    schemaId: schemaForShard(file.filename),
    url: `${SEARCH_PACKS_RUNTIME_PREFIX}${contentHash}/shards/${file.filename}`,
    byteLength: file.bytes.byteLength,
    checksum: file.checksum,
    checksumAlgorithm: 'sha-256',
    checksumScope: 'encoded-bytes',
    requiredDictionaries: file.filename === 'core-postings.qas' ? ['core-dictionaries'] : [],
    estimatedMemoryBytes: Math.min(file.bytes.byteLength * 2, MAX_DECODED_SHARD_BYTES),
    decodingFixtureId: `phase-1-${file.filename.replace(/\.qas$/, '')}`,
    maxDecodedBytes: MAX_DECODED_SHARD_BYTES,
    internalCompression: 'none',
  }))

  const manifest = {
    packId: PACK_ID,
    packVersion: PACK_VERSION,
    packAbiVersion: '1.0',
    minAppVersion: '0.0.0',
    minWorkerVersion: '1.0.0',
    contentHash,
    graphCorpusId: GRAPH_CORPUS_ID,
    sourceRiwayah: 'hafs',
    features: [
      'core',
      'arabic-text',
      'translation',
      'context',
      'phrase',
      'morphology',
      'following-wording',
      'shared-wording',
      'repeated-phrases',
      'occurs-once',
      'ayah-endings',
      'counts-patterns',
      'provenance',
    ],
    requires: ['core-references', 'core-dictionaries', ...MORPHOLOGY_REQUIRED_SHARDS, ...GRAPH_REQUIRED_SHARDS],
    compatibleWith: ['quranatlas-search-phase-1', 'quranatlas-search-phase-2', 'quranatlas-search-phase-3'],
    licenseIds: [HAFS_SEARCH_LICENSE_ID, 'search-qul-bridges-context', 'search-pack-metadata-quranatlas', 'search-qac-gpl-v3-terms'],
    sourceIds: Object.keys(sourceDigests),
    normalizerVersion: SEARCH_NORMALIZER_VERSION,
    queryAstVersion: SEARCH_QUERY_AST_VERSION,
    checksumAlgorithm: 'sha-256',
    totalBytes: shardFiles.reduce((sum, file) => sum + file.bytes.byteLength, 0),
    estimatedMemoryBytes: shardManifests.reduce((sum, shard) => sum + shard.estimatedMemoryBytes, 0),
    byteBudget: {
      maxShardBytes: MAX_SHARD_BYTES,
      maxDecodedShardBytes: MAX_DECODED_SHARD_BYTES,
      maxResidentWorkerBytes: MAX_RESIDENT_WORKER_BYTES,
    },
    shards: shardManifests,
    notices: [
      {
        id: 'search-source-note',
        label: 'Search source note',
        body: 'Search uses Hafs/Tanzil text as its Search corpus for word forms, roots, morphology, and wording patterns. Reader mapping happens only when the user chooses Open in Read, and only when the Reader is using Qalun/Qaloon text.',
        sourceId: HAFS_SEARCH_SOURCE_ID,
        licenseId: HAFS_SEARCH_LICENSE_ID,
      },
      {
        id: 'search-trust-note',
        label: 'Open in Read trust note',
        body: 'Open in Read always uses the verified Reader text.',
      },
      {
        id: 'search-same-root-note',
        label: 'Same-root morphology note',
        body: 'Same-root matches are morphological aids. They do not mean the verses have the same interpretation.',
        sourceId: 'search-qac-morphology-0-4',
        licenseId: 'search-qac-gpl-v3-terms',
      },
      {
        id: 'search-shared-wording-note',
        label: 'Shared wording note',
        body: 'Shared wording shows lexical overlap in the indexed text. It does not mean the verses have the same interpretation, ruling, theme, or sabab.',
      },
      {
        id: 'search-following-wording-note',
        label: 'Attested following wording note',
        body: 'Attested following wording shows wording observed after this phrase in the indexed text.',
      },
      {
        id: 'search-occurs-once-note',
        label: 'Occurs once note',
        body: '"Occurs once" means once in the current Search index, according to its text and tokenization.',
      },
      {
        id: 'search-qac-notice',
        label: 'Quranic Arabic Corpus morphology 0.4 notice',
        body: morphology.source.requiredNotice,
        sourceId: 'search-qac-morphology-0-4',
        licenseId: 'search-qac-gpl-v3-terms',
      },
    ],
    buildInputDigests: sourceDigests,
    builtAt: GENERATED_AT,
    phase1: {
      maxPhraseTokens: SEARCH_PHASE1_MAX_PHRASE_TOKENS,
      queryAstVersion: SEARCH_QUERY_AST_VERSION,
      profiles: ['baseline', 'full'],
    },
    phase2: {
      morphologySourceId: 'search-qac-morphology-0-4',
      morphologySourceVersion: morphology.source.sourceVersion,
      morphologySourceSha256: morphology.source.sourceSha256,
      canHighlightWordsInRead: false,
    },
    phase3: {
      graphPolicy: graph.policy,
      graphStats: graph.stats,
      sourceBoundaryPolicy: 'Phrase windows stay within one ayah and one surah; they do not cross Bismillah boundaries.',
      followingWordingIsAttestedOnly: true,
    },
  }
  assertNoStableMutableSearchUrls(manifest)
  const registry = buildSearchRegistry({ generatedAt: GENERATED_AT, manifest })
  const files = new Map()
  files.set('public/search-packs/registry.json', `${stableJson(registry)}\n`)
  files.set(`${SEARCH_PACKS_FILESYSTEM_PREFIX}${contentHash}/manifest.json`, `${stableJson(manifest)}\n`)
  for (const file of shardFiles) {
    files.set(`${SEARCH_PACKS_FILESYSTEM_PREFIX}${contentHash}/shards/${file.filename}`, file.bytes)
  }

  if (check) await verifyGeneratedFiles(files, manifest)
  if (write) await writeGeneratedFiles(files, contentHash)
  return { contentHash, manifest, registry, files }
}

export async function validateSearchCorePack() {
  if (!existsSync(REGISTRY_PATH)) throw new Error('missing public/search-packs/registry.json')
  const registry = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'))
  assertNoStableMutableSearchUrls(registry)
  if (registry.registryUrl !== '/search-packs/registry.json') throw new Error('Search registry URL must be /search-packs/registry.json')
  if (!Array.isArray(registry.packs) || registry.packs.length === 0) throw new Error('Search registry must include at least one generated core pack')
  for (const entry of registry.packs) {
    if (!entry.manifestUrl.startsWith(`${SEARCH_PACKS_RUNTIME_PREFIX}${entry.contentHash}/`)) {
      throw new Error(`Search registry entry ${entry.packId} must use immutable pack manifest URL`)
    }
    const manifestPath = join(REPO_ROOT, entry.manifestUrl.replace(/^\//, 'public/'))
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    assertNoStableMutableSearchUrls(manifest)
    if (manifest.contentHash !== entry.contentHash) throw new Error(`Search manifest hash mismatch for ${entry.packId}`)
    for (const shard of manifest.shards) {
      const shardPath = join(REPO_ROOT, shard.url.replace(/^\//, 'public/'))
      const bytes = await readFile(shardPath)
      if (bytes.byteLength !== shard.byteLength) throw new Error(`Search shard ${shard.shardId} byte length mismatch`)
      if (sha256Hex(bytes) !== shard.checksum) throw new Error(`Search shard ${shard.shardId} checksum mismatch`)
      decodeJsonShard(bytes)
    }
  }
}

async function writeGeneratedFiles(files, contentHash) {
  await mkdir(PACKS_ROOT, { recursive: true })
  for (const entry of await readdir(PACKS_ROOT, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory() && entry.name !== contentHash) {
      await rm(join(PACKS_ROOT, entry.name), { recursive: true, force: true })
    }
  }
  for (const [path, content] of files) {
    const fullPath = join(REPO_ROOT, path)
    await mkdir(dirname(fullPath), { recursive: true })
    await writeFile(fullPath, content)
  }
}

async function verifyGeneratedFiles(files, manifest) {
  const missing = []
  const mismatched = []
  for (const [path, expected] of files) {
    const fullPath = join(REPO_ROOT, path)
    if (!existsSync(fullPath)) {
      missing.push(path)
      continue
    }
    const actual = await readFile(fullPath)
    const expectedBuffer = Buffer.isBuffer(expected) ? expected : Buffer.from(expected)
    if (!actual.equals(expectedBuffer)) mismatched.push(path)
  }
  if (missing.length || mismatched.length) {
    throw new Error(`Search pack output is stale: missing=${missing.join(',') || 'none'} mismatched=${mismatched.join(',') || 'none'}`)
  }
  const packDir = join(PACKS_ROOT, manifest.contentHash)
  for (const path of [REGISTRY_PATH, packDir]) {
    await stat(path)
  }
}

async function fileSha256(path) {
  return sha256Hex(await readFile(path))
}

function featureForShard(filename) {
  if (filename.startsWith('arabic-postings')) return 'arabic-text'
  if (filename.startsWith('translation-postings')) return 'translation'
  if (filename.startsWith('exact-word-postings')) return 'arabic-text'
  if (filename.startsWith('phrase-postings')) return 'phrase'
  if (
    filename.startsWith('morphology-')
    || filename.startsWith('same-written-form-')
    || filename.startsWith('same-root-')
    || filename.startsWith('lemma-')
    || filename.startsWith('surah-context')
  ) return 'morphology'
  if (filename.startsWith('following-wording')) return 'following-wording'
  if (filename.startsWith('shared-wording')) return 'shared-wording'
  if (filename.startsWith('repeated-phrases')) return 'repeated-phrases'
  if (filename.startsWith('occurs-once')) return 'occurs-once'
  if (filename.startsWith('ayah-endings')) return 'ayah-endings'
  if (filename.startsWith('counts-patterns')) return 'counts-patterns'
  if (filename.startsWith('graph-provenance')) return 'provenance'
  if (filename.includes('provenance')) return 'provenance'
  if (filename.includes('dictionaries')) return 'core'
  return 'core'
}

function schemaForShard(filename) {
  return `search-shard-${featureForShard(filename)}-v1`
}

function phrasePostingGroups(rows) {
  const groups = new Map()
  for (const row of rows) {
    const length = row.term.split(' ').length
    const group = groups.get(length) ?? []
    group.push(row)
    groups.set(length, group)
  }
  return [...groups.entries()].sort(([a], [b]) => a - b)
}

function chunkRows(rows, chunkSize) {
  const chunks = []
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize))
  }
  return chunks
}

function parseArgs(argv) {
  const profile = argv.find((arg) => arg.startsWith('--profile='))?.slice('--profile='.length) ?? 'baseline'
  return {
    profile,
    check: argv.includes('--check'),
    validateOnly: argv.includes('--validate'),
    write: !argv.includes('--check') && !argv.includes('--validate'),
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  if (options.validateOnly) {
    await validateSearchCorePack()
    return
  }
  await buildSearchCorePack(options)
  if (options.write) {
    const generated = relative(REPO_ROOT, REGISTRY_PATH)
    console.log(`Generated Search pack registry: ${generated}`)
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
