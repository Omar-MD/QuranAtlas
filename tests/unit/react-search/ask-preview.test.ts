import { describe, expect, it } from 'vitest'

import { blockersForAskQuery, recoveryForAskBlockers } from '../../../src/search/ask/boundaries'
import { understandAskQuery } from '../../../src/search/ask/query-understanding'

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
    expect(understandAskQuery('What does رحمن mean?').understanding).toMatchObject({
      intent: 'answer-question',
      lens: 'mixed',
      confidence: 'medium',
    })
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
