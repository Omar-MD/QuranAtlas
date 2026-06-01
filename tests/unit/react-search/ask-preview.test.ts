import { describe, expect, it } from 'vitest'

import {
  assertAnswerPreviewContract,
  type AnswerPreview,
  type EvidenceAtom,
  type SearchPackManifestV1,
  type SearchResultDto,
} from '../../../shared/search'
import { SearchCancellationToken } from '../../../src/search-worker/cancellation'
import { AskSearchPreviewBuilder, ASK_MATCHES_PAGE_LIMIT } from '../../../src/search/ask/answer-preview-builder'
import {
  evidenceAtomForResult,
  evidenceCardForResult,
  matchCardForResult,
  searchPlanForPreview,
  sourceFamilyStatusesFromManifest,
} from '../../../src/search/ask/evidence'
import { blockersForAskQuery, recoveryForAskBlockers } from '../../../src/search/ask/boundaries'
import { SearchPackReader } from '../../../src/search/pack-reader'
import { parseSearchQuery, stableQueryHash } from '../../../src/search/query-parser'
import { understandAskQuery } from '../../../src/search/ask/query-understanding'
import { createFixturePack, sha256Hex, writeJsonShard } from './search-test-utils'

describe('Ask/Search query understanding', () => {
  it('detects references, Arabic text, translation questions, and morphology lenses', () => {
    expect(understandAskQuery('2:255').understanding).toMatchObject({ intent: 'open-reference', lens: 'reference', confidence: 'high' })
    expect(understandAskQuery('الله').understanding).toMatchObject({ intent: 'find-occurrences', lens: 'quran-text', confidence: 'high' })
    expect(understandAskQuery('What mentions mercy?').understanding).toMatchObject({ intent: 'answer-question', lens: 'translation' })
    expect(understandAskQuery('same root رحمن').understanding).toMatchObject({ intent: 'trace-language', lens: 'morphology' })
  })

  it('keeps apostrophes out of phrase detection and handles mixed Arabic questions', () => {
    expect(understandAskQuery("What's Allah's mercy?").understanding).toMatchObject({
      intent: 'answer-question',
      lens: 'translation',
    })
    expect(understandAskQuery('"Allah mercy"').understanding).toMatchObject({
      intent: 'find-occurrences',
      lens: 'phrase',
      confidence: 'high',
    })
    const mixedArabicQuestion = understandAskQuery('What does رحمن mean?')
    expect(mixedArabicQuestion.understanding).toMatchObject({
      intent: 'answer-question',
      lens: 'mixed',
      confidence: 'medium',
    })
    expect(mixedArabicQuestion.parsed?.ast.filters.sourceLane).toEqual(['translation', 'context'])
    expect(mixedArabicQuestion.parsed?.queryHash).toBe(stableQueryHash(mixedArabicQuestion.parsed!.ast))
  })

  it('blocks absence, deferred-source, personal, and broad theological prose', () => {
    const absence = understandAskQuery('Where does the Quran never mention sleep?')
    expect(blockersForAskQuery(absence.understanding.originalQuery, absence.understanding)).toContain('absence-claim-unproven')

    const tafsir = understandAskQuery('What does tafsir say about 2:255?')
    expect(blockersForAskQuery(tafsir.understanding.originalQuery, tafsir.understanding)).toEqual(
      expect.arrayContaining(['requires-tafsir', 'requires-deferred-source']),
    )

    const fiqh = understandAskQuery('Is this halal for me personally?')
    expect(blockersForAskQuery(fiqh.understanding.originalQuery, fiqh.understanding)).toContain('fiqh-boundary')

    const broad = understandAskQuery('What does Islam say about all non-Muslims?')
    expect(blockersForAskQuery(broad.understanding.originalQuery, broad.understanding)).toContain('broad-theological-boundary')
  })

  it('blocks crisis and personal advice wording without blocking ordinary study terms', () => {
    const crisisQueries = ['self harm', 'harm myself', 'I want to die', 'end my life']
    for (const query of crisisQueries) {
      const result = understandAskQuery(query)
      expect(blockersForAskQuery(result.understanding.originalQuery, result.understanding)).toContain('personal-crisis-boundary')
    }

    const legalStudy = understandAskQuery('search verses mentioning contract')
    expect(blockersForAskQuery(legalStudy.understanding.originalQuery, legalStudy.understanding)).not.toContain('legal-boundary')

    const medicalStudy = understandAskQuery('what translations mention doctors?')
    expect(blockersForAskQuery(medicalStudy.understanding.originalQuery, medicalStudy.understanding)).not.toContain('medical-boundary')

    const legalAdvice = understandAskQuery('I need legal advice about my contract')
    expect(blockersForAskQuery(legalAdvice.understanding.originalQuery, legalAdvice.understanding)).toContain('legal-boundary')

    const diagnosis = understandAskQuery('Can you diagnose my symptoms?')
    expect(blockersForAskQuery(diagnosis.understanding.originalQuery, diagnosis.understanding)).toContain('medical-boundary')
  })

  it('surfaces parse-failure warnings and deferred-source recovery copy', () => {
    const phrase = understandAskQuery('"mercy"')
    expect(phrase.parsed).toBeNull()
    expect(phrase.understanding).toMatchObject({ intent: 'unknown', lens: 'phrase', confidence: 'low' })
    expect(phrase.understanding.normalizationWarnings).toContain('Phrase search needs at least two tokens')

    const recovery = recoveryForAskBlockers('What does tafsir say about 2:255?', [
      'requires-deferred-source',
      'requires-tafsir',
    ])
    expect(recovery.message).toBe('This v1 search does not include tafsir evidence. Search the available text and translation evidence instead.')
    expect(recovery.requiredDeferredSources).toEqual(['tafsir'])
    expect(recovery.suggestedQueries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Open a reference', query: '2:255', lens: 'reference' }),
      ]),
    )
  })
})

const askManifest: SearchPackManifestV1 = {
  packId: 'qa-search-core-hafs-v1',
  packVersion: '1.0.0',
  packAbiVersion: '1.0',
  minAppVersion: '0.0.0',
  minWorkerVersion: '1.0.0',
  contentHash: 'abcdef1234567890abcdef1234567890',
  graphCorpusId: 'test-hafs',
  sourceRiwayah: 'hafs',
  features: ['core', 'arabic-text', 'translation', 'morphology'],
  requires: [],
  compatibleWith: ['test'],
  licenseIds: ['test-license'],
  sourceIds: ['tanzil-hafs', 'bridges-translation', 'qac-morphology'],
  normalizerVersion: 1,
  queryAstVersion: 1,
  checksumAlgorithm: 'sha-256',
  totalBytes: 1,
  estimatedMemoryBytes: 1,
  byteBudget: { maxShardBytes: 64_000, maxDecodedShardBytes: 64_000, maxResidentWorkerBytes: 128_000 },
  shards: [],
  notices: [],
  buildInputDigests: {},
  builtAt: '2026-06-01T00:00:00.000Z',
}

function askResult(overrides: Partial<SearchResultDto> = {}): SearchResultDto {
  return {
    resultId: 'r-2-255',
    sourceRef: '2:255',
    readerRefs: ['2:255'],
    mappingState: 'corresponding-ayah-in-reader',
    canOpenInRead: true,
    canHighlightWordsInRead: false,
    matchLanes: ['translation'],
    matchEvidence: {
      lane: 'translation',
      matchedQueryToken: 'Allah',
      matchedSourceToken: 'allah',
      translationContextExcerpt: 'Allah - there is no deity except Him',
      whyMatched: 'The query token occurs in indexed translation evidence.',
    },
    snippet: 'Allah - there is no deity except Him',
    rankKey: 'translation:2:255',
    sourceText: 'الله لا اله الا هو',
    ...overrides,
  }
}

function expectEvidenceAtom(atom: EvidenceAtom | null): EvidenceAtom {
  expect(atom).not.toBeNull()
  if (!atom) throw new Error('Expected evidence atom')
  return atom
}

function answerPreviewForTranslationResult(result: SearchResultDto, atom: EvidenceAtom): AnswerPreview {
  const claimSupportId = 'support-1'
  return {
    id: 'preview-translation-1',
    query: 'Allah',
    queryUnderstanding: {
      originalQuery: 'Allah',
      normalizedQuery: 'allah',
      intent: 'answer-question',
      lens: 'translation',
      confidence: 'high',
      alternatives: [],
      normalizationWarnings: [],
    },
    searchPlan: searchPlanForPreview({ lens: 'translation', queryForm: 'allah', sourceKinds: ['translation'] }),
    mode: 'answer',
    answerability: { status: 'answerable', reasons: [], renderPermission: 'answer-preview' },
    claims: [{
      id: 'claim-1',
      text: 'Translation evidence renders "Allah" at 2:255.',
      templateId: 'translation-renders',
      slots: { term: 'Allah', ref: '2:255' },
      attribution: 'translation-renders',
      predicate: 'renders',
      supportId: claimSupportId,
    }],
    claimSupports: [{ id: claimSupportId, claimId: 'claim-1', supportIds: [atom.id], verdict: 'supported' }],
    evidenceAtoms: [atom],
    evidenceBasis: {
      quranText: 'available-not-used',
      translation: 'used',
      morphology: 'available-not-used',
      note: 'Answer claims use the listed typed evidence only.',
    },
    evidenceCards: [evidenceCardForResult({ result, evidenceAtomId: atom.id, claimSupportId })],
    sourceFamilyStatuses: sourceFamilyStatusesFromManifest(askManifest),
  }
}

function askMorphologyResult(overrides: Partial<SearchResultDto> = {}): SearchResultDto {
  return askResult({
    matchLanes: ['same-root'],
    matchEvidence: {
      lane: 'same-root',
      matchedQueryToken: 'اله',
      matchedSourceToken: 'ٱللَّهِ',
      wordPosition: 2,
      morphology: { sourceToken: 'ٱللَّهِ', root: 'اله', lemma: 'ٱللَّه', rowId: 'qac:2:255:2' },
      whyMatched: 'The same QAC morphology root occurs in this Hafs source ayah.',
    },
    snippet: 'ٱللَّهِ',
    morphology: {
      sourceNote: 'QAC morphology row',
      root: 'اله',
      lemma: 'ٱللَّه',
      sourceToken: 'ٱللَّهِ',
      transliteration: '{ll~ahi',
      wordPosition: 2,
      tokenOrdinal: 2,
    },
    ...overrides,
  })
}

describe('Ask/Search evidence adapters', () => {
  it('projects translation results into typed evidence and cards', () => {
    const result = askResult()
    const atom = expectEvidenceAtom(evidenceAtomForResult(result, askManifest))
    expect(atom).toMatchObject({ evidenceType: 'translation', sourceKind: 'translation', refs: ['2:255'] })
    const card = evidenceCardForResult({ result, evidenceAtomId: atom.id, claimSupportId: 'support-1' })
    expect(card).toMatchObject({ snippetSource: 'translation', readerAction: { type: 'open-in-reader', ref: '2:255' } })
    expect(() => assertAnswerPreviewContract(answerPreviewForTranslationResult(result, atom))).not.toThrow()
  })

  it('does not expose a Reader action without one validated Reader ref', () => {
    const result = askResult({ canOpenInRead: true, readerRefs: [] })
    const atom = expectEvidenceAtom(evidenceAtomForResult(result, askManifest))
    expect(evidenceCardForResult({ result, evidenceAtomId: atom.id, claimSupportId: 'support-1' }).readerAction).toEqual({
      type: 'unavailable',
      reason: 'No validated Reader target is available for this Search source result.',
    })
    expect(matchCardForResult(result, atom.id).readerAction).toEqual({
      type: 'unavailable',
      reason: 'No validated Reader target is available for this Search source result.',
    })
  })

  it('preserves source-backed morphology token evidence without implying Reader word highlighting', () => {
    const result = askMorphologyResult()
    const atom = expectEvidenceAtom(evidenceAtomForResult(result, askManifest))
    expect(atom).toMatchObject({
      evidenceType: 'morphology',
      sourceKind: 'morphology',
      displayTarget: { type: 'token', tokenRefs: ['2:255:2'] },
      rowId: 'qac:2:255:2',
      sourceToken: 'ٱللَّهِ',
      normalizedSourceToken: 'ٱللَّهِ',
      root: 'اله',
      lemma: 'ٱللَّه',
    })
    expect(matchCardForResult(result, atom.id).readerAction).toMatchObject({
      type: 'open-in-reader',
      mappingWarning: 'Word-level Reader highlighting is unavailable for this evidence.',
    })
  })

  it('does not fabricate morphology evidence when target row data is incomplete', () => {
    const result = askMorphologyResult({
      matchEvidence: {
        lane: 'same-root',
        matchedQueryToken: 'اله',
        matchedSourceToken: 'ٱللَّهِ',
        wordPosition: 2,
        morphology: { sourceToken: 'ٱللَّهِ', root: 'اله', lemma: 'ٱللَّه' },
        whyMatched: 'The same QAC morphology root occurs in this Hafs source ayah.',
      },
    })
    expect(evidenceAtomForResult(result, askManifest)).toBeNull()
  })
})

describe('Ask/Search preview builder', () => {
  it('builds an answer preview with supported claims from fixture Search evidence', async () => {
    const { builder } = await createBuilderForFixturePack()
    const preview = await builder.buildPreview({
      query: 'Allah',
      lens: 'translation',
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-answer'),
    })

    expect(() => assertAnswerPreviewContract(preview)).not.toThrow()
    expect(preview.mode).toBe('answer')
    expect(preview.answerability).toMatchObject({ status: 'answerable', renderPermission: 'answer-preview' })
    expect(preview.claims).toHaveLength(1)
    expect(preview.claims[0]).toMatchObject({
      templateId: 'translation-renders',
      attribution: 'translation-renders',
      predicate: 'renders',
    })
    expect(preview.claimSupports[0]?.supportIds).toEqual([preview.evidenceAtoms[0]?.id])
    expect(preview.evidenceCards[0]?.evidenceAtomIds).toEqual([preview.evidenceAtoms[0]?.id])
    expect(preview.evidenceBasis.translation).toBe('used')
  })

  it('blocks absence claims with empty claims and recovery copy', async () => {
    const { builder } = await createBuilderForFixturePack()
    const preview = await builder.buildPreview({
      query: 'Where does the Quran never mention sleep?',
      lens: 'translation',
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-absence'),
    })

    expect(() => assertAnswerPreviewContract(preview)).not.toThrow()
    expect(preview.mode).toBe('evidence-only')
    expect(preview.answerability).toMatchObject({
      status: 'evidence-only',
      renderPermission: 'no-answer-claims',
      reasons: ['absence-claim-unproven'],
    })
    expect(preview.claims).toEqual([])
    expect(preview.claimSupports).toEqual([])
    expect(preview.recovery?.message).toBe('This v1 search can show related evidence, but it cannot answer absence claims as prose.')
  })

  it('keeps reference previews evidence-only without prose claims', async () => {
    const { builder } = await createBuilderForFixturePack()
    const preview = await builder.buildPreview({
      query: '2:255',
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-reference'),
    })

    expect(() => assertAnswerPreviewContract(preview)).not.toThrow()
    expect(preview.queryUnderstanding.intent).toBe('open-reference')
    expect(preview.mode).toBe('evidence-only')
    expect(preview.answerability).toMatchObject({
      status: 'evidence-only',
      renderPermission: 'no-answer-claims',
      reasons: ['insufficient-evidence'],
    })
    expect(preview.claims).toEqual([])
    expect(preview.claimSupports).toEqual([])
    expect(preview.evidenceAtoms.length).toBeGreaterThan(0)
    expect(preview.evidenceCards).toEqual([])
  })

  it('does not overclaim broad question wording as a rendered translation term', async () => {
    const { builder } = await createBuilderForFixturePack()
    const preview = await builder.buildPreview({
      query: 'What mentions Allah?',
      lens: 'translation',
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-question'),
    })

    expect(() => assertAnswerPreviewContract(preview)).not.toThrow()
    expect(preview.queryUnderstanding.intent).toBe('answer-question')
    expect(preview.mode).toBe('evidence-only')
    expect(preview.answerability.renderPermission).toBe('no-answer-claims')
    expect(preview.claims).toEqual([])
    expect(preview.claimSupports).toEqual([])
    expect(preview.claims.map((claim) => claim.text).join(' ')).not.toContain('What mentions Allah?')
  })

  it('clamps lazy matches pages to ten cards', async () => {
    const { builder, manifest } = await createBuilderForManyTranslationResults(12)
    const preview = await builder.buildPreview({
      query: 'Allah',
      lens: 'translation',
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-many-results'),
    })
    const page = await builder.buildMatchesPage({
      previewId: preview.id,
      query: 'Allah',
      lens: 'translation',
      limit: 50,
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-matches'),
    })

    expect(page.previewId).toBe(preview.id)
    expect(page.matchCards).toHaveLength(ASK_MATCHES_PAGE_LIMIT)
    expect(page.evidenceAtoms).toHaveLength(ASK_MATCHES_PAGE_LIMIT)
    expectMatchesPageIntegrity(page)
    expect(page.nextCursor).toEqual(expect.objectContaining({
      packId: manifest.packId,
      packVersion: manifest.packVersion,
      sort: 'relevance',
    }))
  })

  it('fails closed when a lazy matches page preview id does not match the query identity', async () => {
    const { builder } = await createBuilderForManyTranslationResults(12)
    const preview = await builder.buildPreview({
      query: 'Allah',
      lens: 'translation',
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-page-binding'),
    })
    await expect(builder.buildMatchesPage({
      previewId: `${preview.id}:stale`,
      query: 'Allah',
      lens: 'translation',
      limit: 10,
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-page-mismatch'),
    })).rejects.toMatchObject({
      code: 'stale-epoch',
      retryable: true,
      message: 'Ask preview id no longer matches this query, lens, sort, or pack',
    })
  })

  it('binds preview and matches identity to the provided execution AST mode', async () => {
    const { builder } = await createBuilderForFixturePack()
    const exactAst = parseSearchQuery('الله', { mode: 'exact-word-form' }).ast
    const arabicAst = parseSearchQuery('الله', { mode: 'arabic-text' }).ast

    const exactPreview = await builder.buildPreview({
      query: 'الله',
      lens: 'quran-text',
      queryAst: exactAst,
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-exact-word-form'),
    })
    const arabicPreview = await builder.buildPreview({
      query: 'الله',
      lens: 'quran-text',
      queryAst: arabicAst,
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-arabic-text'),
    })

    expect(exactPreview.id).not.toBe(arabicPreview.id)
    await expect(builder.buildMatchesPage({
      previewId: exactPreview.id,
      query: 'الله',
      lens: 'quran-text',
      queryAst: arabicAst,
      limit: 10,
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-ast-mismatch'),
    })).rejects.toMatchObject({
      code: 'stale-epoch',
      retryable: true,
      message: 'Ask preview id no longer matches this query, lens, sort, or pack',
    })
  })

  it('filters null evidence atoms without dereferencing incomplete morphology evidence', async () => {
    const { builder } = await createBuilderForInvalidMorphologyEvidence()
    const preview = await builder.buildPreview({
      query: 'الله',
      lens: 'morphology',
      sort: 'relevance',
      token: new SearchCancellationToken('ask-preview-null-evidence'),
    })

    expect(() => assertAnswerPreviewContract(preview)).not.toThrow()
    expect(preview.mode).toBe('evidence-only')
    expect(preview.answerability).toMatchObject({
      status: 'evidence-only',
      renderPermission: 'no-answer-claims',
      reasons: ['insufficient-evidence'],
    })
    expect(preview.claims).toEqual([])
    expect(preview.evidenceAtoms).toEqual([])
    expect(preview.evidenceCards).toEqual([])
    expect(preview.evidenceBasis.morphology).toBe('available-not-used')
  })
})

function expectMatchesPageIntegrity(page: Awaited<ReturnType<AskSearchPreviewBuilder['buildMatchesPage']>>): void {
  const evidenceIds = new Set(page.evidenceAtoms.map((atom) => atom.id))
  expect(evidenceIds.size).toBe(page.evidenceAtoms.length)
  for (const card of page.matchCards) {
    expect(card.evidenceAtomIds.length).toBeGreaterThan(0)
    expect(card.evidenceAtomIds.every((id) => evidenceIds.has(id))).toBe(true)
  }
}

async function createBuilderForFixturePack() {
  const { cacheStorage, manifest } = await createFixturePack()
  const reader = new SearchPackReader(manifest, { cacheStorage })
  return { builder: new AskSearchPreviewBuilder(reader), manifest }
}

async function createBuilderForManyTranslationResults(count: number) {
  const fixture = await createFixturePack()
  const refs = Array.from({ length: count }, (_, index) => {
    const ayah = index + 1
    return {
      ayahId: ayah,
      ref: `1:${ayah}` as const,
      surah: 1,
      ayah,
      sourceRef: `1:${ayah}` as const,
      arabicText: `الله ${ayah}`,
      translationText: `Allah fixture ${ayah}`,
      tokenCount: 2,
    }
  })
  await replaceFixtureShard(fixture, 'core-references', { kind: 'references', ayahs: refs })
  await replaceFixtureShard(fixture, 'translation-postings', {
    kind: 'postings',
    lane: 'translation',
    postings: [{
      term: 'allah',
      postings: refs.map((ref) => ({ ayahId: ref.ayahId, position: 0 })),
    }],
  })
  const reader = new SearchPackReader(fixture.manifest, { cacheStorage: fixture.cacheStorage })
  return { builder: new AskSearchPreviewBuilder(reader), manifest: fixture.manifest }
}

async function createBuilderForInvalidMorphologyEvidence() {
  const fixture = await createFixturePack()
  const morphologyPayloads = {
    'morphology-root-dictionary': {
      kind: 'morphology-dictionary',
      dictionary: 'roots',
      entries: [{ id: 1, value: 'Alh', count: 1 }],
    },
    'morphology-lemma-dictionary': {
      kind: 'morphology-dictionary',
      dictionary: 'lemmas',
      entries: [{ id: 1, value: '{ll~ah', count: 1 }],
    },
    'morphology-rows-1': {
      kind: 'morphology-rows',
      rows: [{
        ayahId: 1,
        ref: '1:1',
        surah: 1,
        ayah: 1,
        tokenOrdinal: 1,
        wordPosition: 2,
        sourceToken: '',
        normalizedSourceToken: 'الله',
        transliteration: '{ll~ah',
        root: 'Alh',
        lemma: '{ll~ah',
        segments: [],
      }],
    },
    'same-written-form-postings-1': {
      kind: 'morphology-postings',
      lane: 'same-written-form-postings',
      postings: [{ term: 'الله', postings: [{ ayahId: 1, position: 1 }] }],
    },
    'same-root-postings-1': {
      kind: 'morphology-postings',
      lane: 'same-root-postings',
      postings: [{ term: 'Alh', postings: [{ ayahId: 1, position: 1 }] }],
    },
    'lemma-postings-1': {
      kind: 'morphology-postings',
      lane: 'lemma-postings',
      postings: [{ term: '{ll~ah', postings: [{ ayahId: 1, position: 1 }] }],
    },
    'surah-context': {
      kind: 'surah-context',
      roots: [{ term: 'Alh', total: 1, surahs: [{ surah: 1, count: 1 }] }],
      lemmas: [],
      writtenForms: [],
    },
  } as const
  for (const [shardId, payload] of Object.entries(morphologyPayloads)) {
    await addFixtureShard(fixture, shardId, payload, 'morphology')
  }
  fixture.manifest.features.push('morphology')
  fixture.manifest.requires.push(
    'morphology-root-dictionary',
    'morphology-lemma-dictionary',
    'morphology-rows',
    'same-written-form-postings',
    'same-root-postings',
    'lemma-postings',
    'surah-context',
  )
  fixture.manifest.sourceIds = ['tanzil-hafs', 'bridges-translation', 'qac-morphology']
  const reader = new SearchPackReader(fixture.manifest, { cacheStorage: fixture.cacheStorage })
  return { builder: new AskSearchPreviewBuilder(reader), manifest: fixture.manifest }
}

async function replaceFixtureShard(
  fixture: Awaited<ReturnType<typeof createFixturePack>>,
  shardId: string,
  payload: unknown,
): Promise<void> {
  const shard = fixture.manifest.shards.find((entry) => entry.shardId === shardId)
  if (!shard) throw new Error(`Missing fixture shard ${shardId}`)
  const bytes = writeJsonShard(payload)
  const cache = await fixture.cacheStorage.open(`quran-atlas-search-pack-${fixture.manifest.contentHash}`)
  await cache.put(shard.url, new Response(bytes))
  shard.byteLength = bytes.byteLength
  shard.checksum = sha256Hex(bytes)
  shard.estimatedMemoryBytes = bytes.byteLength
  shard.maxDecodedBytes = 64_000
}

async function addFixtureShard(
  fixture: Awaited<ReturnType<typeof createFixturePack>>,
  shardId: string,
  payload: unknown,
  featureId: SearchPackManifestV1['shards'][number]['featureId'],
): Promise<void> {
  const bytes = writeJsonShard(payload)
  const url = `/search-packs/packs/${fixture.manifest.contentHash}/shards/${shardId}.qas`
  const cache = await fixture.cacheStorage.open(`quran-atlas-search-pack-${fixture.manifest.contentHash}`)
  await cache.put(url, new Response(bytes))
  fixture.manifest.shards.push({
    shardId,
    featureId,
    schemaId: 'search-shard-morphology-v1',
    url,
    byteLength: bytes.byteLength,
    checksum: sha256Hex(bytes),
    checksumAlgorithm: 'sha-256',
    checksumScope: 'encoded-bytes',
    requiredDictionaries: [],
    estimatedMemoryBytes: bytes.byteLength,
    decodingFixtureId: `test-${shardId}`,
    maxDecodedBytes: 64_000,
    internalCompression: 'none',
  })
}
