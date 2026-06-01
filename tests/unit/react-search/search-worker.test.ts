import { describe, expect, it } from 'vitest'

import { assertAnswerPreviewContract } from '../../../shared/search'
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

  it('serves Ask preview and lazy matches envelopes from the Search worker', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const session = new SearchWorkerSession({ cacheStorage, manifest })
    await session.handle({ type: 'init', requestId: 'init', packId: manifest.packId })

    const previewResponse = await session.handle({
      type: 'askPreview',
      requestId: 'ask-preview',
      query: 'Allah',
      lens: 'translation',
    })

    expect(previewResponse).toMatchObject({ type: 'ok', requestId: 'ask-preview', payload: { kind: 'ask-preview' } })
    if (previewResponse.type !== 'ok' || previewResponse.payload.kind !== 'ask-preview') throw new Error('expected Ask preview')
    const preview = previewResponse.payload.answerPreview
    expect(() => assertAnswerPreviewContract(preview)).not.toThrow()
    expect(preview).toMatchObject({
      query: 'Allah',
      queryUnderstanding: { lens: 'translation' },
      answerability: { status: 'answerable', renderPermission: 'answer-preview' },
    })
    expect(preview.claims.length).toBeGreaterThan(0)
    expect(preview.evidenceAtoms.length).toBeGreaterThan(0)

    const pageResponse = await session.handle({
      type: 'askMatchesPage',
      requestId: 'ask-matches',
      previewId: preview.id,
      query: 'Allah',
      lens: 'translation',
      limit: 99,
    })

    expect(pageResponse).toMatchObject({ type: 'ok', requestId: 'ask-matches', payload: { kind: 'ask-matches-page' } })
    if (pageResponse.type !== 'ok' || pageResponse.payload.kind !== 'ask-matches-page') throw new Error('expected Ask matches page')
    expect(pageResponse.payload.page.previewId).toBe(preview.id)
    expect(pageResponse.payload.page.matchCards.length).toBeLessThanOrEqual(10)
    expect(pageResponse.payload.page.evidenceAtoms.length).toBe(pageResponse.payload.page.matchCards.length)
  })

  it('fails closed when an Ask matches page envelope receives a stale preview id', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const session = new SearchWorkerSession({ cacheStorage, manifest })
    await session.handle({ type: 'init', requestId: 'init', packId: manifest.packId })

    const previewResponse = await session.handle({
      type: 'askPreview',
      requestId: 'ask-preview',
      query: 'Allah',
      lens: 'translation',
    })
    if (previewResponse.type !== 'ok' || previewResponse.payload.kind !== 'ask-preview') throw new Error('expected Ask preview')

    const pageResponse = await session.handle({
      type: 'askMatchesPage',
      requestId: 'ask-matches-stale',
      previewId: `${previewResponse.payload.answerPreview.id}:stale`,
      query: 'Allah',
      lens: 'translation',
      limit: 99,
    })

    expect(pageResponse).toMatchObject({
      type: 'error',
      requestId: 'ask-matches-stale',
      error: {
        code: 'stale-epoch',
        retryable: true,
        message: 'Ask preview id no longer matches this query, lens, sort, or pack',
      },
    })
  })

  it('keeps Ask preview identity bound to the provided query AST mode', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const session = new SearchWorkerSession({ cacheStorage, manifest })
    await session.handle({ type: 'init', requestId: 'init', packId: manifest.packId })
    const exactAst = parseSearchQuery('الله', { mode: 'exact-word-form' }).ast
    const arabicAst = parseSearchQuery('الله', { mode: 'arabic-text' }).ast

    const exactResponse = await session.handle({
      type: 'askPreview',
      requestId: 'ask-preview-exact',
      query: 'الله',
      lens: 'quran-text',
      queryAst: exactAst,
    })
    const arabicResponse = await session.handle({
      type: 'askPreview',
      requestId: 'ask-preview-arabic',
      query: 'الله',
      lens: 'quran-text',
      queryAst: arabicAst,
    })

    if (exactResponse.type !== 'ok' || exactResponse.payload.kind !== 'ask-preview') throw new Error('expected exact Ask preview')
    if (arabicResponse.type !== 'ok' || arabicResponse.payload.kind !== 'ask-preview') throw new Error('expected Arabic Ask preview')
    expect(exactResponse.payload.answerPreview.id).not.toBe(arabicResponse.payload.answerPreview.id)

    const pageResponse = await session.handle({
      type: 'askMatchesPage',
      requestId: 'ask-matches-ast-mismatch',
      previewId: exactResponse.payload.answerPreview.id,
      query: 'الله',
      lens: 'quran-text',
      queryAst: arabicAst,
      limit: 10,
    })

    expect(pageResponse).toMatchObject({
      type: 'error',
      requestId: 'ask-matches-ast-mismatch',
      error: {
        code: 'stale-epoch',
        retryable: true,
        message: 'Ask preview id no longer matches this query, lens, sort, or pack',
      },
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
