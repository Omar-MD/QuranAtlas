import { describe, expect, it } from 'vitest'

import { SearchWorkerSession } from '../../../src/search-worker/session'
import { parseSearchQuery } from '../../../src/search/query-parser'
import { createFixturePack } from './search-test-utils'

describe('Search worker runtime', () => {
  it('handles init, preload, query, cursor pagination, and dispose envelopes', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const session = new SearchWorkerSession({
      cacheStorage,
      manifest,
      aliases: { '1': [{ hafs: 1, warsh: 1, qaloon: 1 }], '2': [{ hafs: 255, warsh: 255, qaloon: 255 }] },
    })

    await expect(session.handle({ type: 'init', requestId: 'r1', packId: manifest.packId })).resolves.toMatchObject({
      type: 'ok',
      requestId: 'r1',
      payload: { kind: 'initialized' },
    })
    await expect(session.handle({ type: 'preloadCore', requestId: 'r2' })).resolves.toMatchObject({
      type: 'ok',
      payload: { kind: 'preloaded-core' },
    })

    const parsed = parseSearchQuery('الله', { mode: 'arabic-text' })
    const first = await session.handle({ type: 'query', requestId: 'r3', query: parsed.ast, limit: 1, sort: 'relevance' })
    expect(first).toMatchObject({ type: 'ok', requestId: 'r3', payload: { kind: 'query-window' } })
    if (first.type !== 'ok' || first.payload.kind !== 'query-window') throw new Error('expected query window')
    expect(first.payload.window.results).toHaveLength(1)
    expect(first.payload.window.cursor).not.toBeNull()

    const second = await session.handle({
      type: 'query',
      requestId: 'r4',
      query: parsed.ast,
      cursor: first.payload.window.cursor ?? undefined,
      limit: 1,
      sort: 'relevance',
    })
    expect(second).toMatchObject({ type: 'ok', requestId: 'r4', payload: { kind: 'query-window' } })
    if (second.type !== 'ok' || second.payload.kind !== 'query-window') throw new Error('expected query window')
    expect(second.payload.window.results[0]?.resultId).not.toBe(first.payload.window.results[0]?.resultId)

    await expect(session.handle({ type: 'dispose', requestId: 'r5' })).resolves.toMatchObject({
      type: 'ok',
      payload: { kind: 'disposed' },
    })
  })

  it('returns typed errors for stale cursors, missing features, corrupt packs, and uninitialized queries', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const session = new SearchWorkerSession({ cacheStorage, manifest })
    const parsed = parseSearchQuery('الله', { mode: 'arabic-text' })

    await expect(session.handle({ type: 'query', requestId: 'before-init', query: parsed.ast, limit: 5, sort: 'relevance' })).resolves.toMatchObject({
      type: 'error',
      error: { code: 'unavailable-pack' },
    })
    await session.handle({ type: 'init', requestId: 'init', packId: manifest.packId })
    await expect(session.handle({ type: 'loadFeature', requestId: 'feature', featureId: 'morphology' })).resolves.toMatchObject({
      type: 'error',
      error: { code: 'missing-feature' },
    })
    await expect(session.handle({
      type: 'query',
      requestId: 'stale',
      query: parsed.ast,
      cursor: {
        packId: manifest.packId,
        packVersion: 'old',
        queryHash: 'bad',
        queryAstVersion: 1,
        rankVersion: 'old',
        sort: 'relevance',
        lastStableResultKey: 'x',
      },
      limit: 5,
      sort: 'relevance',
    })).resolves.toMatchObject({
      type: 'error',
      error: { code: 'stale-epoch' },
    })
  })

  it('acknowledges cancellation requests without transferring shard buffers to the UI', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const session = new SearchWorkerSession({ cacheStorage, manifest })
    await session.handle({ type: 'init', requestId: 'init', packId: manifest.packId })
    await expect(session.handle({ type: 'cancel', requestId: 'cancel', targetRequestId: 'query-1' })).resolves.toMatchObject({
      type: 'ok',
      payload: { kind: 'cancelled', targetRequestId: 'query-1' },
    })

    const parsed = parseSearchQuery('بسم الله', { mode: 'phrase' })
    const response = await session.handle({ type: 'query', requestId: 'query-2', query: parsed.ast, limit: 5, sort: 'relevance' })
    expect(response).toMatchObject({ type: 'ok' })
    if (response.type !== 'ok' || response.payload.kind !== 'query-window') throw new Error('expected query window')
    expect(JSON.stringify(response)).not.toContain('ArrayBuffer')
    expect(response.payload.window.results[0]).toMatchObject({
      matchLanes: ['phrase'],
      canHighlightWordsInRead: false,
    })
  })
})
