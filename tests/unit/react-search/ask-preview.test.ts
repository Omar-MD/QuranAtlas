import { describe, expect, it } from 'vitest'

import { blockersForAskQuery } from '../../../src/search/ask/boundaries'
import { understandAskQuery } from '../../../src/search/ask/query-understanding'

describe('Ask/Search query understanding', () => {
  it('detects references, Arabic text, translation questions, and morphology lenses', () => {
    expect(understandAskQuery('2:255').understanding).toMatchObject({ intent: 'open-reference', lens: 'reference', confidence: 'high' })
    expect(understandAskQuery('الله').understanding).toMatchObject({ intent: 'find-occurrences', lens: 'quran-text', confidence: 'high' })
    expect(understandAskQuery('What mentions mercy?').understanding).toMatchObject({ intent: 'answer-question', lens: 'translation' })
    expect(understandAskQuery('same root رحمن').understanding).toMatchObject({ intent: 'trace-language', lens: 'morphology' })
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
})
