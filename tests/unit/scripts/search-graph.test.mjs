import { describe, expect, it } from 'vitest'

import { buildSearchGraphPayloads } from '../../../scripts/data/search/graph/build.mjs'
import {
  SEARCH_GRAPH_POLICY,
  assertGraphMaterializationBudgets,
  enumeratePhraseWindows,
} from '../../../scripts/data/search/graph/phrase-windows.mjs'

const ayahs = [
  ayah(1, '1:1', 'بسم الله الرحمن الرحيم'),
  ayah(2, '2:1', 'بسم الله نور السماوات'),
  ayah(3, '2:2', 'الله نور على نور'),
]

describe('Search graph builder', () => {
  it('builds following wording, repeated phrases, occurs-once phrases, shared wording, and ayah endings deterministically', () => {
    const graph = buildSearchGraphPayloads({
      corePostings: { ayahs },
      morphology: { payloads: [['morphology-root-dictionary.qas', { entries: [{ value: 'nwr', count: 2 }] }]] },
      maxShardBytes: 64000,
      maxDecodedShardBytes: 64000,
      maxResidentWorkerBytes: 256000,
    })

    const following = graph.payloads.find(([filename]) => filename.startsWith('following-wording'))[1]
    const repeated = graph.payloads.find(([filename]) => filename.startsWith('repeated-phrases'))[1]
    const occursOnce = graph.payloads.find(([filename]) => filename.startsWith('occurs-once'))[1]
    const shared = graph.payloads.find(([filename]) => filename.startsWith('shared-wording'))[1]
    const endings = graph.payloads.find(([filename]) => filename === 'ayah-endings.qas')[1]
    const counts = graph.payloads.find(([filename]) => filename === 'counts-patterns.qas')[1]

    expect(following.rows.find((row) => row.term === 'بسم الله')?.followers[0]).toMatchObject({ token: 'الرحمن', count: 1 })
    expect(repeated.rows.find((row) => row.term === 'بسم الله')?.count).toBe(2)
    expect(occursOnce.rows.some((row) => row.term === 'الله الرحمن')).toBe(true)
    expect(shared.rows.find((row) => row.ref === '1:1')?.neighbors.length).toBeGreaterThan(0)
    expect(endings.rows.find((row) => row.ref === '1:1')?.endings.some((ending) => ending.term === 'الرحيم')).toBe(true)
    expect(counts.rootCounts).toContainEqual({ root: 'nwr', count: 2 })
    expect(JSON.stringify(graph.payloads)).toBe(JSON.stringify(buildSearchGraphPayloads({
      corePostings: { ayahs },
      morphology: { payloads: [['morphology-root-dictionary.qas', { entries: [{ value: 'nwr', count: 2 }] }]] },
      maxShardBytes: 64000,
      maxDecodedShardBytes: 64000,
      maxResidentWorkerBytes: 256000,
    }).payloads))
  })

  it('enforces phrase boundary policy and graph budget gates before shards ship', () => {
    expect(() => enumeratePhraseWindows({
      ayahs,
      policy: { ...SEARCH_GRAPH_POLICY, canCrossAyahBoundary: true },
    })).toThrow(/cross-boundary/)
    expect(() => enumeratePhraseWindows({
      ayahs: [ayah(1, '1:1', 'واحد اثنان ثلاثة اربعة خمسة ستة سبعة ثمانية تسعة عشرة')],
      policy: { ...SEARCH_GRAPH_POLICY, maxPhraseWindowCountPerSourceUnit: 3 },
    })).toThrow(/phrase window count/)
    expect(() => assertGraphMaterializationBudgets({
      policy: { ...SEARCH_GRAPH_POLICY, maxNgramLength: SEARCH_GRAPH_POLICY.maxNgramLength + 1 },
    })).toThrow(/max n-gram/)
    expect(() => assertGraphMaterializationBudgets({
      maxShardBytes: 10,
      shards: [{ filename: 'graph.qas', byteLength: 11 }],
    })).toThrow(/encoded byte budget/)
    expect(() => assertGraphMaterializationBudgets({
      maxDecodedShardBytes: 10,
      shards: [{ filename: 'graph.qas', byteLength: 1, maxDecodedBytes: 11 }],
    })).toThrow(/decoded byte budget/)
    expect(() => assertGraphMaterializationBudgets({
      maxResidentWorkerBytes: 10,
      shards: [{ filename: 'graph.qas', byteLength: 1, estimatedMemoryBytes: 11, residentGroupKey: 'following-wording' }],
    })).toThrow(/resident worker/)
  })
})

function ayah(ayahId, ref, arabicText) {
  const [surah, aya] = ref.split(':').map(Number)
  return {
    ayahId,
    ref,
    surah,
    ayah: aya,
    sourceRef: ref,
    arabicText,
    translationText: '',
    tokenCount: arabicText.split(/\s+/).length,
  }
}
