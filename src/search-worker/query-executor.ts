import type { SearchQueryAstV1, SearchResultDto, SearchResultMatchLane, SearchResultWindow, SearchSort } from '../../shared/search'
import { createSearchResultCursor, assertSearchCursorValid } from '../search/cursors'
import { parseSearchReference } from '../search/reference-parser'
import { mapSearchRefToSearchSource } from '../search/result-mapping'
import { stableQueryHash } from '../search/query-parser'
import { rankSearchResults, SEARCH_RANK_VERSION } from '../search/ranking'
import type { SearchAyahRow, SearchGraphRef, SearchPostingRow } from '../search/schema'
import { SearchPackReader } from '../search/pack-reader'
import { cooperativeYield, type SearchCancellationToken } from './cancellation'
import { SearchMorphologyExecutor } from './morphology-executor'
import { buildSearchBrief, evidenceForCandidate } from './search-brief'

export interface SearchQueryExecutorOptions {
  aliases?: unknown
}

interface Candidate {
  ayah: SearchAyahRow
  lane: SearchResultMatchLane
  term: string
  position: number
  matchedQueryTokens?: string[]
  matchedSourceTokens?: string[]
  sourcePositions?: number[]
  phraseLength?: number
}

export class SearchQueryExecutor {
  private readonly reader: SearchPackReader
  private readonly morphology: SearchMorphologyExecutor

  constructor(reader: SearchPackReader, _options: SearchQueryExecutorOptions = {}) {
    void _options
    this.reader = reader
    this.morphology = new SearchMorphologyExecutor(reader)
  }

  async execute({
    query,
    cursor,
    limit,
    sort,
    token,
  }: {
    query: SearchQueryAstV1
    cursor?: SearchResultWindow['cursor']
    limit: number
    sort: SearchSort
    token: SearchCancellationToken
  }): Promise<SearchResultWindow> {
    const queryHash = stableQueryHash(query)
    assertSearchCursorValid(cursor ?? undefined, {
      packId: this.reader.manifest.packId,
      packVersion: this.reader.manifest.packVersion,
      queryHash,
      sort,
    })

    const dtos = isMorphologyMode(query.mode)
      ? await this.morphology.execute(query, token)
      : await this.toDtos(await this.collectCandidates(query, token), query, token)
    const ranked = rankSearchResults(dtos, sort)
    const start = cursor ? Math.max(0, ranked.findIndex((result) => result.rankKey === cursor.lastStableResultKey) + 1) : 0
    const windowResults = ranked.slice(start, start + limit)
    const last = windowResults.length > 0 ? windowResults[windowResults.length - 1] : undefined
    const nextCursor = last && start + limit < ranked.length
      ? createSearchResultCursor({
        packId: this.reader.manifest.packId,
        packVersion: this.reader.manifest.packVersion,
        queryHash,
        sort,
        lastStableResultKey: last.rankKey,
      })
      : null
    return {
      results: windowResults,
      cursor: nextCursor,
      totalKnownResults: ranked.length,
      brief: buildSearchBrief({
        manifest: this.reader.manifest,
        query,
        rankVersion: SEARCH_RANK_VERSION,
        rankedResults: ranked,
        windowResults,
      }),
      rankVersion: SEARCH_RANK_VERSION,
    }
  }

  private async collectCandidates(query: SearchQueryAstV1, token: SearchCancellationToken): Promise<Candidate[]> {
    const reference = parseSearchReference(query.rawText)
    if (reference) {
      const ayah = await this.reader.findAyah(reference.ref)
      return ayah ? [{ ayah, lane: 'arabic-text', term: reference.ref, position: 0 }] : []
    }

    if (query.mode === 'phrase') return this.collectPhraseCandidates(query.tokens, token)
    if (query.mode === 'exact-word-form') return this.collectPostingCandidates('exact-word', 'exact-word-form', query.tokens, token)
    if (query.mode === 'translation' || query.mode === 'context') return this.collectPostingCandidates('translation', query.mode, query.tokens, token, { requireAllTerms: true })
    if (query.mode === 'arabic-text') return this.collectPostingCandidates('arabic', 'arabic-text', query.tokens, token, { requireAllTerms: true })

    const lanes = query.filters.sourceLane ?? ['arabic-text', 'translation', 'context']
    const all: Candidate[] = []
    if (lanes.includes('arabic-text')) all.push(...await this.collectPostingCandidates('arabic', 'arabic-text', query.tokens, token, { requireAllTerms: true }))
    if (lanes.includes('translation') || lanes.includes('context')) {
      all.push(...await this.collectPostingCandidates('translation', lanes.includes('translation') ? 'translation' : 'context', query.tokens, token, { requireAllTerms: true }))
    }
    return all
  }

  private async collectPhraseCandidates(tokens: string[], token: SearchCancellationToken): Promise<Candidate[]> {
    if (tokens.length < 2) return []
    const term = tokens.join(' ')
    const shards = await this.reader.loadPhraseShards(tokens.length)
    const references = await this.reader.getReferences()
    const ayahsById = new Map(references.ayahs.map((ayah) => [ayah.ayahId, ayah]))
    const candidates: Candidate[] = []
    for (const shard of shards) {
      const row = shard.payload.postings.find((posting) => posting.term === term)
      if (!row) continue
      candidates.push(...await this.rowToCandidates(row, ayahsById, 'phrase', token, {
        matchedQueryTokens: tokens,
        matchedSourceTokens: tokens,
        phraseLength: tokens.length,
      }))
    }
    return candidates
  }

  private async collectPostingCandidates(
    lane: 'arabic' | 'exact-word' | 'translation',
    matchLane: SearchResultDto['matchLanes'][number],
    terms: string[],
    token: SearchCancellationToken,
    options: { requireAllTerms?: boolean } = {},
  ): Promise<Candidate[]> {
    if (options.requireAllTerms && lane !== 'exact-word' && uniqueTermsForLane(terms, lane).length > 1) {
      return this.collectAllTermPostingCandidates(lane, matchLane, terms, token)
    }
    const references = await this.reader.getReferences()
    const ayahsById = new Map(references.ayahs.map((ayah) => [ayah.ayahId, ayah]))
    const payloads = await this.reader.getPostings(lane)
    const candidates: Candidate[] = []
    const seen = new Set<string>()
    for (const term of terms) {
      for (const payload of payloads) {
        const rows = payload.postings.filter((posting) => postingMatchesTerm(posting.term, term, lane))
        for (const row of rows) for (const candidate of await this.rowToCandidates(row, ayahsById, matchLane, token, {
          matchedQueryTokens: [term],
          matchedSourceTokens: [row.term],
        })) {
          const key = `${candidate.ayah.ref}:${candidate.lane}:${candidate.position}:${row.term}`
          if (seen.has(key)) continue
          seen.add(key)
          candidates.push(candidate)
        }
      }
    }
    return candidates
  }

  private async collectAllTermPostingCandidates(
    lane: 'arabic' | 'translation',
    matchLane: SearchResultDto['matchLanes'][number],
    terms: string[],
    token: SearchCancellationToken,
  ): Promise<Candidate[]> {
    const uniqueTerms = uniqueTermsForLane(terms, lane)
    if (uniqueTerms.length === 0) return []

    const references = await this.reader.getReferences()
    const ayahsById = new Map(references.ayahs.map((ayah) => [ayah.ayahId, ayah]))
    const payloads = await this.reader.getPostings(lane)
    const grouped = new Map<number, {
      ayah: SearchAyahRow
      matchedTerms: Set<string>
      positions: number[]
      rowTerms: string[]
    }>()

    for (const term of uniqueTerms) {
      let termMatched = false
      const termKey = postingTermKey(term, lane)
      for (const payload of payloads) {
        const rows = payload.postings.filter((posting) => postingMatchesTerm(posting.term, term, lane))
        for (const row of rows) {
          const rowCandidates = await this.rowToCandidates(row, ayahsById, matchLane, token, {
            matchedQueryTokens: [term],
            matchedSourceTokens: [row.term],
          })
          if (rowCandidates.length > 0) termMatched = true
          for (const candidate of rowCandidates) {
            const current = grouped.get(candidate.ayah.ayahId) ?? {
              ayah: candidate.ayah,
              matchedTerms: new Set<string>(),
              positions: [],
              rowTerms: [],
            }
            current.matchedTerms.add(termKey)
            current.positions.push(candidate.position)
            current.rowTerms.push(row.term)
            grouped.set(candidate.ayah.ayahId, current)
          }
        }
      }
      if (!termMatched) return []
    }

    const candidates: Candidate[] = []
    for (const entry of grouped.values()) {
      if (entry.matchedTerms.size !== uniqueTerms.length) continue
      candidates.push({
        ayah: entry.ayah,
        lane: matchLane,
        term: uniqueTerms.join(' '),
        position: Math.min(...entry.positions),
        matchedQueryTokens: uniqueTerms,
        matchedSourceTokens: [...new Set(entry.rowTerms)],
        sourcePositions: [...new Set(entry.positions)].sort((left, right) => left - right),
      })
    }
    return candidates
  }

  private async rowToCandidates(
    row: SearchPostingRow,
    ayahsById: Map<number, SearchAyahRow>,
    lane: SearchResultMatchLane,
    token: SearchCancellationToken,
    options: {
      matchedQueryTokens?: string[]
      matchedSourceTokens?: string[]
      phraseLength?: number
    } = {},
  ): Promise<Candidate[]> {
    const candidates: Candidate[] = []
    for (let index = 0; index < row.postings.length; index += 1) {
      await cooperativeYield(token, 500, index)
      const posting = row.postings[index]!
      const ayah = ayahsById.get(posting.ayahId)
      if (!ayah) continue
      candidates.push({
        ayah,
        lane,
        term: row.term,
        position: posting.position,
        matchedQueryTokens: options.matchedQueryTokens,
        matchedSourceTokens: options.matchedSourceTokens,
        phraseLength: options.phraseLength,
      })
    }
    return candidates
  }

  private async toDtos(candidates: Candidate[], query: SearchQueryAstV1, token: SearchCancellationToken): Promise<SearchResultDto[]> {
    const rows: SearchResultDto[] = []
    for (let index = 0; index < candidates.length; index += 1) {
      await cooperativeYield(token, 250, index)
      const candidate = candidates[index]!
      const mapping = mapSearchRefToSearchSource(candidate.ayah.sourceRef as SearchGraphRef)
      rows.push({
        resultId: `${this.reader.manifest.packId}:${candidate.ayah.ref}:${candidate.lane}:${candidate.position}:${candidate.term}`,
        sourceRef: candidate.ayah.sourceRef,
        readerRefs: mapping.readerRefs,
        mappingState: mapping.mappingState,
        canOpenInRead: mapping.canOpenInRead,
        canHighlightWordsInRead: false,
        matchLanes: [candidate.lane],
        matchEvidence: evidenceForCandidate({
          lane: candidate.lane,
          query,
          matchedText: candidate.matchedQueryTokens && candidate.matchedQueryTokens.length > 1 && !candidate.phraseLength
            ? undefined
            : candidate.term,
          matchedQueryTokens: candidate.matchedQueryTokens,
          matchedSourceTokens: candidate.matchedSourceTokens,
          sourceToken: candidate.matchedSourceTokens?.length === 1 ? candidate.matchedSourceTokens[0] : candidate.term,
          sourcePosition: candidate.position,
          sourcePositions: candidate.sourcePositions,
          phraseLength: candidate.phraseLength,
          translationContextExcerpt: candidate.lane === 'translation' || candidate.lane === 'context'
            ? candidate.ayah.translationText
            : undefined,
        }),
        snippet: snippetFor(candidate),
        rankKey: `${candidate.position}`,
        sourceText: candidate.ayah.arabicText,
        readerText: undefined,
      })
    }
    return rows
  }
}

function isMorphologyMode(mode: SearchQueryAstV1['mode']): boolean {
  return mode === 'same-written-form' || mode === 'same-root' || mode === 'lemma' || mode === 'surah-context'
}

function snippetFor(candidate: Candidate): string {
  if (candidate.lane === 'translation' || candidate.lane === 'context') return candidate.ayah.translationText
  return candidate.ayah.arabicText
}

function uniqueTermsForLane(terms: string[], lane: 'arabic' | 'exact-word' | 'translation'): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const term of terms) {
    const key = postingTermKey(term, lane)
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(term)
  }
  return unique
}

function postingMatchesTerm(postingTerm: string, queryTerm: string, lane: 'arabic' | 'exact-word' | 'translation'): boolean {
  const postingKey = postingTermKey(postingTerm, lane)
  return exactTermAlternatives(queryTerm, lane).some((term) => postingTermKey(term, lane) === postingKey)
}

function postingTermKey(term: string, lane: 'arabic' | 'exact-word' | 'translation'): string {
  const normalized = term.normalize('NFC')
  return lane === 'translation' ? normalized.toLowerCase() : normalized
}

function exactTermAlternatives(term: string, lane: 'arabic' | 'exact-word' | 'translation'): string[] {
  const normalized = term.normalize('NFC')
  if (lane !== 'exact-word') return [normalized]
  const alternatives = [normalized]
  if (normalized.startsWith('\u0627')) alternatives.push(`\u0671${normalized.slice(1)}`)
  if (normalized.startsWith('\u0671')) alternatives.push(`\u0627${normalized.slice(1)}`)
  return [...new Set(alternatives)]
}
