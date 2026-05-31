import type { SearchQueryAstV1, SearchResultDto, SearchResultWindow, SearchSort } from '../../shared/search'
import type { VerseAliases } from '../data/verse-aliases'
import { createSearchResultCursor, assertSearchCursorValid } from '../search/cursors'
import { parseSearchReference } from '../search/reference-parser'
import { mapSearchRefToReader } from '../search/result-mapping'
import { stableQueryHash } from '../search/query-parser'
import { rankSearchResults, SEARCH_RANK_VERSION } from '../search/ranking'
import type { SearchAyahRow, SearchGraphRef, SearchPostingRow } from '../search/schema'
import { SearchPackReader } from '../search/pack-reader'
import { cooperativeYield, type SearchCancellationToken } from './cancellation'

export interface SearchQueryExecutorOptions {
  aliases?: VerseAliases
}

interface Candidate {
  ayah: SearchAyahRow
  lane: SearchResultDto['matchLanes'][number]
  term: string
  position: number
}

export class SearchQueryExecutor {
  private readonly reader: SearchPackReader
  private readonly aliases: VerseAliases

  constructor(reader: SearchPackReader, options: SearchQueryExecutorOptions = {}) {
    this.reader = reader
    this.aliases = options.aliases ?? {}
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

    const candidates = await this.collectCandidates(query, token)
    const dtos = await this.toDtos(candidates, token)
    const ranked = rankSearchResults(dtos, sort)
    const start = cursor ? Math.max(0, ranked.findIndex((result) => result.rankKey === cursor.lastStableResultKey) + 1) : 0
    const windowResults = ranked.slice(start, start + limit)
    const last = windowResults.length > 0 ? windowResults[windowResults.length - 1] : undefined
    return {
      results: windowResults,
      cursor: last && start + limit < ranked.length
        ? createSearchResultCursor({
          packId: this.reader.manifest.packId,
          packVersion: this.reader.manifest.packVersion,
          queryHash,
          sort,
          lastStableResultKey: last.rankKey,
        })
        : null,
      totalKnownResults: ranked.length,
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
    if (query.mode === 'translation' || query.mode === 'context') return this.collectPostingCandidates('translation', query.mode, query.tokens, token)
    if (query.mode === 'arabic-text') return this.collectPostingCandidates('arabic', 'arabic-text', query.tokens, token)

    const lanes = query.filters.sourceLane ?? ['arabic-text', 'translation', 'context']
    const all: Candidate[] = []
    if (lanes.includes('arabic-text')) all.push(...await this.collectPostingCandidates('arabic', 'arabic-text', query.tokens, token))
    if (lanes.includes('translation') || lanes.includes('context')) {
      all.push(...await this.collectPostingCandidates('translation', lanes.includes('translation') ? 'translation' : 'context', query.tokens, token))
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
      candidates.push(...await this.rowToCandidates(row, ayahsById, 'phrase', token))
    }
    return candidates
  }

  private async collectPostingCandidates(
    lane: 'arabic' | 'exact-word' | 'translation',
    matchLane: SearchResultDto['matchLanes'][number],
    terms: string[],
    token: SearchCancellationToken,
  ): Promise<Candidate[]> {
    const references = await this.reader.getReferences()
    const ayahsById = new Map(references.ayahs.map((ayah) => [ayah.ayahId, ayah]))
    const payloads = await this.reader.getPostings(lane)
    const candidates: Candidate[] = []
    const seen = new Set<string>()
    for (const term of terms) {
      for (const payload of payloads) {
        const row = payload.postings.find((posting) => posting.term === term || posting.term.toLowerCase() === term.toLowerCase())
        if (!row) continue
        for (const candidate of await this.rowToCandidates(row, ayahsById, matchLane, token)) {
          const key = `${candidate.ayah.ref}:${candidate.lane}:${candidate.position}:${term}`
          if (seen.has(key)) continue
          seen.add(key)
          candidates.push(candidate)
        }
      }
    }
    return candidates
  }

  private async rowToCandidates(
    row: SearchPostingRow,
    ayahsById: Map<number, SearchAyahRow>,
    lane: SearchResultDto['matchLanes'][number],
    token: SearchCancellationToken,
  ): Promise<Candidate[]> {
    const candidates: Candidate[] = []
    for (let index = 0; index < row.postings.length; index += 1) {
      await cooperativeYield(token, 500, index)
      const posting = row.postings[index]!
      const ayah = ayahsById.get(posting.ayahId)
      if (!ayah) continue
      candidates.push({ ayah, lane, term: row.term, position: posting.position })
    }
    return candidates
  }

  private async toDtos(candidates: Candidate[], token: SearchCancellationToken): Promise<SearchResultDto[]> {
    const rows: SearchResultDto[] = []
    for (let index = 0; index < candidates.length; index += 1) {
      await cooperativeYield(token, 250, index)
      const candidate = candidates[index]!
      const mapping = mapSearchRefToReader({
        aliases: this.aliases,
        readerRiwayah: 'qaloon',
        sourceRef: candidate.ayah.sourceRef as SearchGraphRef,
      })
      rows.push({
        resultId: `${this.reader.manifest.packId}:${candidate.ayah.ref}:${candidate.lane}:${candidate.position}:${candidate.term}`,
        sourceRef: candidate.ayah.sourceRef,
        readerRefs: mapping.readerRefs,
        mappingState: mapping.mappingState,
        canOpenInRead: mapping.canOpenInRead,
        canHighlightWordsInRead: false,
        matchLanes: [candidate.lane],
        snippet: snippetFor(candidate),
        rankKey: `${candidate.position}`,
        sourceText: candidate.ayah.arabicText,
        readerText: mapping.canOpenInRead ? candidate.ayah.arabicText : undefined,
      })
    }
    return rows
  }
}

function snippetFor(candidate: Candidate): string {
  if (candidate.lane === 'translation' || candidate.lane === 'context') return candidate.ayah.translationText
  return candidate.ayah.arabicText
}
