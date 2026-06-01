import { describe, expect, it } from 'vitest'

import type { SearchPackManifestV1, SearchResultDto } from '../../../shared/search'
import { evidenceAtomForResult, evidenceCardForResult, matchCardForResult } from '../../../src/search/ask/evidence'
import { blockersForAskQuery, recoveryForAskBlockers } from '../../../src/search/ask/boundaries'
import { understandAskQuery } from '../../../src/search/ask/query-understanding'
import { stableQueryHash } from '../../../src/search/query-parser'

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

describe('Ask/Search evidence adapters', () => {
  it('projects translation results into typed evidence and cards', () => {
    const atom = evidenceAtomForResult(askResult(), askManifest)
    expect(atom).toMatchObject({ evidenceType: 'translation', sourceKind: 'translation', refs: ['2:255'] })
    const card = evidenceCardForResult({ result: askResult(), evidenceAtomId: atom.id, claimSupportId: 'support-1' })
    expect(card).toMatchObject({ snippetSource: 'translation', readerAction: { type: 'open-in-reader', ref: '2:255' } })
  })

  it('does not imply Reader word highlighting for morphology matches', () => {
    const result = askResult({
      matchLanes: ['same-root'],
      matchEvidence: {
        lane: 'same-root',
        matchedQueryToken: 'الله',
        matchedSourceToken: 'ٱللَّهِ',
        wordPosition: 2,
        morphology: { sourceToken: 'ٱللَّهِ', root: 'اله', lemma: 'ٱللَّه', rowId: '1:2' },
        whyMatched: 'The same QAC morphology root occurs in this Hafs source ayah.',
      },
      snippet: 'ٱللَّهِ',
    })
    const atom = evidenceAtomForResult(result, askManifest)
    expect(atom).toMatchObject({ evidenceType: 'morphology', sourceKind: 'morphology' })
    expect(matchCardForResult(result, atom.id).readerAction).toMatchObject({
      type: 'open-in-reader',
      mappingWarning: 'Word-level Reader highlighting is unavailable for this evidence.',
    })
  })
})
