import type { SearchMappingState, SearchQueryAstV1, SearchResultDto } from '../../shared/search'
import {
  SEARCH_MORPHOLOGY_SOURCE_NOTE,
  type SearchMorphologyPostingRow,
  type SearchMorphologyRow,
  type SearchSurahContextRow,
} from '../search/morphology'
import { SearchPackReader, SearchPackReaderError } from '../search/pack-reader'
import type { SearchGraphRef, SearchMatchLane } from '../search/schema'
import { mapSearchRefToSearchSource } from '../search/result-mapping'
import { cooperativeYield, type SearchCancellationToken } from './cancellation'
import { evidenceForMorphologyResult } from './search-brief'

export class SearchMorphologyExecutor {
  private readonly reader: SearchPackReader
  private rowsByAyahIdPosition: Map<string, SearchMorphologyRow> | null = null
  private rowsBySourceToken: Map<string, SearchMorphologyRow[]> | null = null
  private postingCounts = new Map<string, Map<string, number>>()

  constructor(reader: SearchPackReader, _options: { aliases?: unknown } = {}) {
    void _options
    this.reader = reader
  }

  async execute(query: SearchQueryAstV1, token: SearchCancellationToken): Promise<SearchResultDto[]> {
    this.assertMorphologyFeature()
    if (query.mode === 'same-written-form') return this.executePostingQuery(query, 'same-written-form-postings', 'same-written-form', token)
    if (query.mode === 'same-root') return this.executePostingQuery(query, 'same-root-postings', 'same-root', token)
    if (query.mode === 'lemma') return this.executePostingQuery(query, 'lemma-postings', 'lemma', token)
    if (query.mode === 'surah-context') return this.executeSurahContextQuery(query, token)
    return []
  }

  async morphologyFor(ayahId: number, position: number): Promise<SearchMorphologyRow | null> {
    const rows = await this.loadRowsByAyahIdPosition()
    return rows.get(`${ayahId}:${position}`) ?? null
  }

  private async executePostingQuery(
    query: SearchQueryAstV1,
    lane: 'same-written-form-postings' | 'same-root-postings' | 'lemma-postings',
    matchLane: SearchMatchLane,
    token: SearchCancellationToken,
  ): Promise<SearchResultDto[]> {
    const term = await this.resolveTerm(query, lane)
    if (!term) return []
    const payloads = await this.reader.getMorphologyPostings(lane)
    const postings: SearchMorphologyPostingRow['postings'] = []
    for (const payload of payloads) {
      const row = payload.postings.find((entry) => entry.term === term || entry.term.toLowerCase() === term.toLowerCase())
      if (row) postings.push(...row.postings)
    }
    const rowsByPosition = await this.loadRowsByAyahIdPosition()
    const results: SearchResultDto[] = []
    const seen = new Set<string>()
    for (let index = 0; index < postings.length; index += 1) {
      await cooperativeYield(token, 250, index)
      const posting = postings[index]!
      const row = rowsByPosition.get(`${posting.ayahId}:${posting.position}`)
      if (!row) continue
      const key = `${row.ref}:${row.tokenOrdinal}:${matchLane}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push(await this.toResult(row, matchLane, query))
    }
    return results
  }

  private async executeSurahContextQuery(query: SearchQueryAstV1, token: SearchCancellationToken): Promise<SearchResultDto[]> {
    const root = await this.resolveTerm(query, 'same-root-postings')
    if (!root) return []
    const context = await this.reader.getSurahContext()
    const row = context.roots.find((entry) => entry.term === root)
    if (!row) return []
    const rootResults = await this.executePostingQuery(query, 'same-root-postings', 'surah-context', token)
    return rootResults.map((result) => ({
      ...result,
      morphology: result.morphology ? { ...result.morphology, surahContext: topSurahContext(row) } : result.morphology,
    }))
  }

  private async resolveTerm(
    query: SearchQueryAstV1,
    lane: 'same-written-form-postings' | 'same-root-postings' | 'lemma-postings',
  ): Promise<string | null> {
    const direct = query.normalizedText || query.rawText
    if (lane === 'same-written-form-postings') return direct
    const rowsBySourceToken = await this.loadRowsBySourceToken()
    const matchingRows = rowsBySourceToken.get(direct) ?? rowsBySourceToken.get(query.rawText) ?? []
    if (lane === 'same-root-postings') return matchingRows.find((row) => row.root)?.root ?? direct
    if (lane === 'lemma-postings') return matchingRows.find((row) => row.lemma)?.lemma ?? direct
    return direct
  }

  private async toResult(row: SearchMorphologyRow, lane: SearchMatchLane, query: SearchQueryAstV1): Promise<SearchResultDto> {
    const mapping = mapSearchRefToSearchSource(row.ref as SearchGraphRef)
    const counts = await this.countsFor(row)
    return {
      resultId: `${this.reader.manifest.packId}:${row.ref}:${lane}:${row.tokenOrdinal}:${row.root ?? row.lemma ?? row.normalizedSourceToken}`,
      sourceRef: row.ref,
      readerRefs: mapping.readerRefs,
      mappingState: mapping.mappingState as SearchMappingState,
      canOpenInRead: mapping.canOpenInRead,
      canHighlightWordsInRead: false,
      matchLanes: [lane],
      matchEvidence: evidenceForMorphologyResult({
        lane,
        query,
        sourceToken: row.sourceToken,
        root: row.root,
        lemma: row.lemma,
        wordPosition: row.wordPosition,
        rowId: `${row.ayahId}:${row.tokenOrdinal}`,
      }),
      snippet: row.sourceToken || row.transliteration,
      rankKey: `${row.surah}:${row.ayah}:${row.tokenOrdinal}`,
      sourceText: row.sourceToken || row.transliteration,
      readerText: undefined,
      morphology: {
        sourceNote: SEARCH_MORPHOLOGY_SOURCE_NOTE,
        root: row.root,
        lemma: row.lemma,
        sourceToken: row.sourceToken,
        transliteration: row.transliteration,
        wordPosition: row.wordPosition,
        tokenOrdinal: row.tokenOrdinal,
        sameRootCount: counts.sameRootCount,
        sameWrittenFormCount: counts.sameWrittenFormCount,
        lemmaCount: counts.lemmaCount,
      },
    }
  }

  private async countsFor(row: SearchMorphologyRow): Promise<{
    sameRootCount?: number
    sameWrittenFormCount?: number
    lemmaCount?: number
  }> {
    const [sameRoot, sameWritten, lemma] = await Promise.all([
      row.root ? this.countPostings('same-root-postings', row.root) : Promise.resolve(undefined),
      row.normalizedSourceToken ? this.countPostings('same-written-form-postings', row.normalizedSourceToken) : Promise.resolve(undefined),
      row.lemma ? this.countPostings('lemma-postings', row.lemma) : Promise.resolve(undefined),
    ])
    return { sameRootCount: sameRoot, sameWrittenFormCount: sameWritten, lemmaCount: lemma }
  }

  private assertMorphologyFeature(): void {
    if (!this.reader.manifest.features.includes('morphology')) {
      throw new SearchPackReaderError('missing-feature', 'Search morphology feature is not active')
    }
    for (const required of ['morphology-root-dictionary', 'morphology-lemma-dictionary', 'morphology-rows', 'same-written-form-postings', 'same-root-postings', 'lemma-postings', 'surah-context']) {
      if (!this.reader.manifest.requires.some((entry) => entry === required || entry.startsWith(`${required}-`))) {
        throw new SearchPackReaderError('missing-feature', `Search morphology dependency is missing: ${required}`)
      }
    }
  }

  private async loadRowsByAyahIdPosition(): Promise<Map<string, SearchMorphologyRow>> {
    if (this.rowsByAyahIdPosition) return this.rowsByAyahIdPosition
    const rows = await this.reader.getMorphologyRows()
    this.rowsByAyahIdPosition = new Map(rows.map((row) => [`${row.ayahId}:${row.tokenOrdinal}`, row]))
    return this.rowsByAyahIdPosition
  }

  private async loadRowsBySourceToken(): Promise<Map<string, SearchMorphologyRow[]>> {
    if (this.rowsBySourceToken) return this.rowsBySourceToken
    const rows = await this.reader.getMorphologyRows()
    const map = new Map<string, SearchMorphologyRow[]>()
    for (const row of rows) {
      for (const key of [row.normalizedSourceToken, row.sourceToken, row.transliteration].filter(Boolean)) {
        const current = map.get(key) ?? []
        current.push(row)
        map.set(key, current)
      }
    }
    this.rowsBySourceToken = map
    return map
  }

  private async countPostings(
    lane: 'same-written-form-postings' | 'same-root-postings' | 'lemma-postings',
    term: string,
  ): Promise<number | undefined> {
    let counts = this.postingCounts.get(lane)
    if (!counts) {
      counts = new Map()
      const payloads = await this.reader.getMorphologyPostings(lane)
      for (const payload of payloads) {
        for (const row of payload.postings) {
          counts.set(row.term, (counts.get(row.term) ?? 0) + row.postings.length)
        }
      }
      this.postingCounts.set(lane, counts)
    }
    return counts.get(term)
  }
}

function topSurahContext(row: SearchSurahContextRow): Array<{ surah: number; count: number }> {
  return [...row.surahs].sort((a, b) => b.count - a.count || a.surah - b.surah).slice(0, 8)
}
