import { tokenizeSearchText } from '../normalizer.mjs'

export const SEARCH_GRAPH_POLICY = {
  policyVersion: 1,
  maxNgramLength: 5,
  followingMaxPhraseTokens: 3,
  maxPhraseWindowCountPerSourceUnit: 1600,
  canCrossAyahBoundary: false,
  canCrossSurahBoundary: false,
  canCrossBismillahBoundary: false,
  bismillahHandling: 'inside-source-ayah-only',
  overLimitBehavior: 'reject',
}

export function enumeratePhraseWindows({ ayahs, policy = SEARCH_GRAPH_POLICY } = {}) {
  if (!Array.isArray(ayahs)) throw new Error('Search graph phrase windows require ayah rows')
  if (!Number.isInteger(policy.maxNgramLength) || policy.maxNgramLength < 2) {
    throw new Error('Search graph max n-gram length must be at least 2')
  }
  if (policy.canCrossAyahBoundary || policy.canCrossSurahBoundary || policy.canCrossBismillahBoundary) {
    throw new Error('Search graph Phase 3 policy does not permit cross-boundary windows')
  }

  const windows = []
  const skippedUnits = []
  let totalWindowCount = 0
  for (const ayah of ayahs) {
    const tokens = tokenizeSearchText(ayah.arabicText)
    const unitWindowCount = countWindows(tokens.length, policy.maxNgramLength)
    if (unitWindowCount > policy.maxPhraseWindowCountPerSourceUnit) {
      const message = `Search graph phrase window count for ${ayah.ref} exceeds ${policy.maxPhraseWindowCountPerSourceUnit}`
      if (policy.overLimitBehavior === 'skip') {
        skippedUnits.push({ ref: ayah.ref, windowCount: unitWindowCount })
        continue
      }
      throw new Error(message)
    }
    totalWindowCount += unitWindowCount
    for (let length = 1; length <= Math.min(policy.maxNgramLength, tokens.length); length += 1) {
      for (let start = 0; start <= tokens.length - length; start += 1) {
        const phraseTokens = tokens.slice(start, start + length)
        windows.push({
          term: phraseTokens.join(' '),
          tokens: phraseTokens,
          length,
          ayahId: ayah.ayahId,
          ref: ayah.ref,
          surah: ayah.surah,
          ayah: ayah.ayah,
          position: start,
          followerToken: tokens[start + length] ?? null,
          ending: start + length === tokens.length,
        })
      }
    }
  }
  return {
    windows,
    stats: {
      ayahCount: ayahs.length,
      totalWindowCount,
      skippedUnits,
    },
    policy,
  }
}

export function assertGraphMaterializationBudgets({
  policy = SEARCH_GRAPH_POLICY,
  maxShardBytes,
  maxDecodedShardBytes,
  maxResidentWorkerBytes,
  shards = [],
} = {}) {
  if (policy.maxNgramLength > SEARCH_GRAPH_POLICY.maxNgramLength) {
    throw new Error(`Search graph max n-gram length exceeds ${SEARCH_GRAPH_POLICY.maxNgramLength}`)
  }
  if (policy.maxPhraseWindowCountPerSourceUnit > SEARCH_GRAPH_POLICY.maxPhraseWindowCountPerSourceUnit) {
    throw new Error(`Search graph phrase-window cap exceeds ${SEARCH_GRAPH_POLICY.maxPhraseWindowCountPerSourceUnit}`)
  }
  for (const shard of shards) {
    if (maxShardBytes !== undefined && shard.byteLength > maxShardBytes) {
      throw new Error(`Search graph shard ${shard.shardId ?? shard.filename} exceeds encoded byte budget`)
    }
    if (maxDecodedShardBytes !== undefined && (shard.maxDecodedBytes ?? shard.estimatedMemoryBytes ?? 0) > maxDecodedShardBytes) {
      throw new Error(`Search graph shard ${shard.shardId ?? shard.filename} exceeds decoded byte budget`)
    }
  }
  const residentGroups = new Map()
  for (const shard of shards) {
    const key = shard.residentGroupKey ?? shard.featureId ?? shard.shardId ?? shard.filename ?? 'graph'
    residentGroups.set(key, (residentGroups.get(key) ?? 0) + (shard.estimatedMemoryBytes ?? shard.byteLength ?? 0))
  }
  const estimatedResidentBytes = Math.max(0, ...residentGroups.values())
  if (maxResidentWorkerBytes !== undefined && estimatedResidentBytes > maxResidentWorkerBytes) {
    throw new Error('Search graph resident worker estimate exceeds budget')
  }
}

function countWindows(tokenCount, maxLength) {
  let total = 0
  for (let length = 1; length <= Math.min(maxLength, tokenCount); length += 1) {
    total += tokenCount - length + 1
  }
  return total
}
