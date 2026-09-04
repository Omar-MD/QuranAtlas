#!/usr/bin/env node

import { stableJson } from '../abi-writer.mjs'
import { SEARCH_GRAPH_POLICY, assertGraphMaterializationBudgets, enumeratePhraseWindows } from './phrase-windows.mjs'
import { buildGraphCounts } from './counts.mjs'

export const GRAPH_REQUIRED_SHARDS = [
  'following-wording',
  'shared-wording',
  'repeated-phrases',
  'occurs-once',
  'ayah-endings',
  'counts-patterns',
  'graph-provenance',
]

export function buildSearchGraphPayloads({
  corePostings,
  morphology,
  maxShardBytes,
  maxDecodedShardBytes,
  maxResidentWorkerBytes,
} = {}) {
  const { windows, stats, policy } = enumeratePhraseWindows({ ayahs: corePostings.ayahs })
  const counts = buildGraphCounts({ ayahs: corePostings.ayahs, windows, morphology })
  const following = buildFollowingRows(windows, policy)
  const phrases = buildPhraseCountRows(windows)
  const adjacency = buildSharedWordingRows(corePostings.ayahs, windows)
  const ayahEndings = buildAyahEndingRows(corePostings.ayahs, windows, counts.ayahEndings)
  const sourcePolicy = sourcePolicyRows(policy)

  const payloads = [
    ...chunkRows(following, 8000).map((rows, index) => [`following-wording-${index + 1}.qas`, {
      kind: 'following-wording',
      policy,
      sourcePolicy,
      rows,
    }]),
    ...chunkRows(adjacency.rows, 2500).map((rows, index) => [`shared-wording-${index + 1}.qas`, {
      kind: 'shared-wording',
      policy,
      sourcePolicy,
      rows,
    }]),
    ...chunkRows(phrases.repeated, 12000).map((rows, index) => [`repeated-phrases-${index + 1}.qas`, {
      kind: 'repeated-phrases',
      policy,
      sourcePolicy,
      rows,
    }]),
    ...chunkRows(phrases.occursOnce, 12000).map((rows, index) => [`occurs-once-${index + 1}.qas`, {
      kind: 'occurs-once',
      policy,
      sourcePolicy,
      rows,
    }]),
    ['ayah-endings.qas', {
      kind: 'ayah-endings',
      policy,
      sourcePolicy,
      rows: ayahEndings,
      topEndings: counts.ayahEndings.slice(0, 60),
    }],
    ['counts-patterns.qas', {
      kind: 'counts-patterns',
      policy,
      sourcePolicy,
      tokenCounts: counts.tokenCounts,
      phraseCounts: counts.phraseCounts,
      rootCounts: counts.rootCounts,
      surahDistribution: counts.surahDistribution,
      ayahEndings: counts.ayahEndings.slice(0, 60),
      adjacencyCounts: {
        ayahsWithSharedWording: adjacency.rows.length,
        sharedEdges: adjacency.edgeCount,
      },
      graphStats: stats,
    }],
    ['graph-provenance.qas', {
      kind: 'graph-provenance',
      policy,
      sourcePolicy,
      sourceIds: ['search-hafs-text-tanzil-v1', 'search-qac-morphology-0-4'],
      generatedFeatureIds: ['following-wording', 'shared-wording', 'repeated-phrases', 'occurs-once', 'ayah-endings', 'counts-patterns'],
    }],
  ]

  const shardEstimates = payloads.map(([filename, payload]) => {
    const byteLength = Buffer.byteLength(stableJson(payload))
    return {
      filename,
      residentGroupKey: graphFeatureForFilename(filename),
      byteLength,
      estimatedMemoryBytes: Math.min(byteLength * 2, maxDecodedShardBytes ?? byteLength * 2),
      maxDecodedBytes: maxDecodedShardBytes,
    }
  })
  assertGraphMaterializationBudgets({
    policy,
    maxShardBytes,
    maxDecodedShardBytes,
    maxResidentWorkerBytes,
    shards: shardEstimates,
  })

  return {
    payloads,
    policy,
    stats,
  }
}

function graphFeatureForFilename(filename) {
  if (filename.startsWith('following-wording')) return 'following-wording'
  if (filename.startsWith('shared-wording')) return 'shared-wording'
  if (filename.startsWith('repeated-phrases')) return 'repeated-phrases'
  if (filename.startsWith('occurs-once')) return 'occurs-once'
  if (filename.startsWith('ayah-endings')) return 'ayah-endings'
  if (filename.startsWith('counts-patterns')) return 'counts-patterns'
  return 'provenance'
}

function buildFollowingRows(windows, policy) {
  const map = new Map()
  for (const window of windows) {
    if (window.length > policy.followingMaxPhraseTokens || !window.followerToken) continue
    const entry = map.get(window.term) ?? new Map()
    const follower = entry.get(window.followerToken) ?? { count: 0, refs: [] }
    follower.count += 1
    follower.refs.push({ ref: window.ref, position: window.position, phraseLength: window.length })
    entry.set(window.followerToken, follower)
    map.set(window.term, entry)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([term, followers]) => ({
      term,
      length: term.split(' ').length,
      followers: [...followers.entries()]
        .sort(([aTerm, a], [bTerm, b]) => b.count - a.count || aTerm.localeCompare(bTerm))
        .slice(0, 8)
        .map(([token, row]) => ({ token, count: row.count, refs: row.refs.slice(0, 8) })),
    }))
}

function buildPhraseCountRows(windows) {
  const map = new Map()
  for (const window of windows) {
    if (window.length < 2) continue
    const row = map.get(window.term) ?? { count: 0, refs: [], length: window.length }
    row.count += 1
    if (row.refs.length < 8) row.refs.push({ ref: window.ref, position: window.position })
    map.set(window.term, row)
  }
  const rows = [...map.entries()]
    .map(([term, row]) => ({ term, ...row }))
    .sort((a, b) => b.count - a.count || b.length - a.length || a.term.localeCompare(b.term))
  return {
    repeated: rows.filter((row) => row.count > 1),
    occursOnce: rows.filter((row) => row.count === 1).slice(0, 24000),
  }
}

function buildSharedWordingRows(ayahs, windows) {
  const tokenToAyahIds = new Map()
  for (const window of windows) {
    if (window.length !== 1) continue
    const ids = tokenToAyahIds.get(window.term) ?? new Set()
    ids.add(window.ayahId)
    tokenToAyahIds.set(window.term, ids)
  }
  const pairScores = new Map()
  for (const [term, ayahIds] of tokenToAyahIds) {
    if (ayahIds.size < 2 || ayahIds.size > 180) continue
    const ids = [...ayahIds].sort((a, b) => a - b)
    for (let outer = 0; outer < ids.length; outer += 1) {
      for (let inner = outer + 1; inner < ids.length; inner += 1) {
        const key = `${ids[outer]}:${ids[inner]}`
        const row = pairScores.get(key) ?? { count: 0, terms: [] }
        row.count += 1
        if (row.terms.length < 6) row.terms.push(term)
        pairScores.set(key, row)
      }
    }
  }
  const byAyah = new Map()
  const ayahsById = new Map(ayahs.map((ayah) => [ayah.ayahId, ayah]))
  for (const [key, score] of pairScores) {
    const [a, b] = key.split(':').map(Number)
    addNeighbor(byAyah, a, b, score, ayahsById)
    addNeighbor(byAyah, b, a, score, ayahsById)
  }
  const rows = [...byAyah.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ayahId, neighbors]) => ({
      ayahId,
      ref: ayahsById.get(ayahId)?.ref,
      neighbors: neighbors
        .sort((a, b) => b.sharedTokenCount - a.sharedTokenCount || a.ref.localeCompare(b.ref))
        .slice(0, 8),
    }))
  return { rows, edgeCount: pairScores.size }
}

function addNeighbor(map, ayahId, neighborAyahId, score, ayahsById) {
  const neighbor = ayahsById.get(neighborAyahId)
  if (!neighbor) return
  const rows = map.get(ayahId) ?? []
  rows.push({
    ayahId: neighborAyahId,
    ref: neighbor.ref,
    sharedTokenCount: score.count,
    sharedTokens: score.terms,
  })
  map.set(ayahId, rows)
}

function buildAyahEndingRows(ayahs, windows, topEndings) {
  const endingsByRef = new Map()
  for (const window of windows) {
    if (!window.ending || window.length > 3) continue
    const rows = endingsByRef.get(window.ref) ?? []
    rows.push({ term: window.term, length: window.length, position: window.position })
    endingsByRef.set(window.ref, rows)
  }
  const countsByTerm = new Map(topEndings.map((row) => [row.term, row.count]))
  return ayahs.map((ayah) => ({
    ayahId: ayah.ayahId,
    ref: ayah.ref,
    endings: (endingsByRef.get(ayah.ref) ?? [])
      .sort((a, b) => a.length - b.length)
      .map((ending) => ({ ...ending, countInIndex: countsByTerm.get(ending.term) ?? 1 })),
  }))
}

function sourcePolicyRows(policy) {
  return [
    { label: 'Source text', value: 'Indexed Hafs Search text' },
    { label: 'Boundary policy', value: 'Phrase windows stay within one ayah and one surah.' },
    { label: 'Bismillah handling', value: policy.bismillahHandling },
    { label: 'Maximum n-gram length', value: String(policy.maxNgramLength) },
    { label: 'Maximum phrase windows per source unit', value: String(policy.maxPhraseWindowCountPerSourceUnit) },
  ]
}

function chunkRows(rows, chunkSize) {
  const chunks = []
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize))
  }
  return chunks.length > 0 ? chunks : [[]]
}
