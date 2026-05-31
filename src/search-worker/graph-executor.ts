import type { SearchQueryAstV1, SearchResultDto } from '../../shared/search'
import {
  SEARCH_FOLLOWING_WORDING_NOTE,
  SEARCH_OCCURS_ONCE_NOTE,
  SEARCH_SHARED_WORDING_NOTE,
  type SearchGraphExploreResponse,
  type SearchGraphSection,
  type SearchGraphSectionId,
} from '../search/graph'
import { tokenizeSearchText } from '../search/normalizer'
import { SearchPackReader, SearchPackReaderError } from '../search/pack-reader'
import { cooperativeYield, type SearchCancellationToken } from './cancellation'

const DEFAULT_SECTIONS: SearchGraphSectionId[] = [
  'following-wording',
  'shared-wording',
  'repeated-phrases',
  'occurs-once',
  'ayah-endings',
  'counts-patterns',
]

export class SearchGraphExecutor {
  private readonly reader: SearchPackReader

  constructor(reader: SearchPackReader) {
    this.reader = reader
  }

  async explore({
    query,
    result,
    sections = orderedSectionsFor(query),
    limit = 8,
    token,
  }: {
    query: SearchQueryAstV1
    result: SearchResultDto
    sections?: SearchGraphSectionId[]
    limit?: number
    token: SearchCancellationToken
  }): Promise<SearchGraphExploreResponse> {
    const responseSections: SearchGraphSection[] = []
    for (let index = 0; index < sections.length; index += 1) {
      await cooperativeYield(token, 1, index)
      const section = sections[index]!
      responseSections.push(await this.section(section, query, result, limit))
    }
    return { sections: responseSections }
  }

  private async section(
    section: SearchGraphSectionId,
    query: SearchQueryAstV1,
    result: SearchResultDto,
    limit: number,
  ): Promise<SearchGraphSection> {
    try {
      if (!this.reader.manifest.features.includes(section)) throw new SearchPackReaderError('missing-feature', `Search pack is missing ${section}`, true)
      if (section === 'following-wording') return await this.following(query, limit)
      if (section === 'shared-wording') return await this.shared(result, limit)
      if (section === 'repeated-phrases') return await this.repeated(query, limit)
      if (section === 'occurs-once') return await this.occursOnce(query, limit)
      if (section === 'ayah-endings') return await this.ayahEndings(result, limit)
      return await this.countsPatterns()
    } catch (error) {
      if (error instanceof SearchPackReaderError && (error.code === 'missing-feature' || error.code === 'offline-miss')) {
        return unavailableSection(section, error.message, error.retryable)
      }
      throw error
    }
  }

  private async following(query: SearchQueryAstV1, limit: number) {
    const phrase = phraseForQuery(query)
    const payloads = await this.reader.getFollowingWording()
    const matches = payloads.flatMap((payload) => payload.rows.filter((row) => row.term === phrase))
    const sourcePolicy = payloads[0]?.sourcePolicy ?? []
    return {
      id: 'following-wording' as const,
      title: 'Attested following wording',
      note: SEARCH_FOLLOWING_WORDING_NOTE,
      sourcePolicy,
      rows: matches.slice(0, limit).map((row) => ({ phrase: row.term, followers: row.followers })),
      cursor: null,
    }
  }

  private async shared(result: SearchResultDto, limit: number) {
    const payloads = await this.reader.getSharedWording()
    const row = payloads.flatMap((payload) => payload.rows).find((entry) => entry.ref === result.sourceRef)
    return {
      id: 'shared-wording' as const,
      title: 'Shared wording',
      note: SEARCH_SHARED_WORDING_NOTE,
      sourcePolicy: payloads[0]?.sourcePolicy ?? [],
      rows: (row?.neighbors ?? []).slice(0, limit).map((neighbor) => ({
        ref: neighbor.ref,
        sharedTokenCount: neighbor.sharedTokenCount,
        sharedTokens: neighbor.sharedTokens,
      })),
      cursor: null,
    }
  }

  private async repeated(query: SearchQueryAstV1, limit: number) {
    const payloads = await this.reader.getRepeatedPhrases()
    const phrase = phraseForQuery(query)
    const rows = payloads.flatMap((payload) => payload.rows)
    return {
      id: 'repeated-phrases' as const,
      title: 'Repeated phrases',
      sourcePolicy: payloads[0]?.sourcePolicy ?? [],
      rows: prioritizePhrase(rows, phrase).slice(0, limit).map((row) => ({ phrase: row.term, count: row.count, refs: row.refs })),
      cursor: null,
    }
  }

  private async occursOnce(query: SearchQueryAstV1, limit: number) {
    const payloads = await this.reader.getOccursOnce()
    const phrase = phraseForQuery(query)
    const rows = payloads.flatMap((payload) => payload.rows)
    return {
      id: 'occurs-once' as const,
      title: 'Occurs once in this index',
      note: SEARCH_OCCURS_ONCE_NOTE,
      sourcePolicy: payloads[0]?.sourcePolicy ?? [],
      rows: prioritizePhrase(rows, phrase).slice(0, limit).map((row) => ({ phrase: row.term, count: row.count, refs: row.refs })),
      cursor: null,
    }
  }

  private async ayahEndings(result: SearchResultDto, limit: number) {
    const payload = await this.reader.getAyahEndings()
    const row = payload.rows.find((entry) => entry.ref === result.sourceRef)
    return {
      id: 'ayah-endings' as const,
      title: 'Ayah endings',
      sourcePolicy: payload.sourcePolicy,
      rows: (row?.endings ?? []).slice(0, limit).map((ending) => ({
        phrase: ending.term,
        length: ending.length,
        countInIndex: ending.countInIndex,
      })),
      cursor: null,
    }
  }

  private async countsPatterns() {
    const payload = await this.reader.getCountsPatterns()
    return {
      id: 'counts-patterns' as const,
      title: 'Counts & patterns',
      sourcePolicy: payload.sourcePolicy,
      summary: {
        tokenCounts: payload.tokenCounts,
        phraseCounts: payload.phraseCounts,
        rootCounts: payload.rootCounts,
        surahDistribution: payload.surahDistribution.slice(0, 12),
        ayahEndings: payload.ayahEndings.slice(0, 12),
        adjacencyCounts: payload.adjacencyCounts,
      },
      cursor: null,
    }
  }
}

function orderedSectionsFor(query: SearchQueryAstV1): SearchGraphSectionId[] {
  if (query.mode === 'phrase') return DEFAULT_SECTIONS
  if (query.mode === 'same-root' || query.mode === 'lemma' || query.mode === 'surah-context') {
    return ['counts-patterns', 'shared-wording', 'ayah-endings', 'following-wording', 'repeated-phrases', 'occurs-once']
  }
  return ['shared-wording', 'following-wording', 'counts-patterns', 'repeated-phrases', 'occurs-once', 'ayah-endings']
}

function phraseForQuery(query: SearchQueryAstV1): string {
  const tokens = query.tokens.length > 0 ? query.tokens : tokenizeSearchText(query.rawText)
  return tokens.slice(0, Math.max(1, Math.min(3, tokens.length))).join(' ')
}

function prioritizePhrase<TRow extends { term: string; count: number }>(rows: TRow[], phrase: string): TRow[] {
  return rows.slice().sort((a, b) => Number(b.term === phrase) - Number(a.term === phrase) || b.count - a.count || a.term.localeCompare(b.term))
}

function unavailableSection(section: SearchGraphSectionId, reason: string, retryable: boolean): SearchGraphSection {
  const title = section === 'counts-patterns'
    ? 'Counts & patterns'
    : section === 'following-wording'
      ? 'Attested following wording'
      : section === 'shared-wording'
        ? 'Shared wording'
        : section === 'repeated-phrases'
          ? 'Repeated phrases'
          : section === 'occurs-once'
            ? 'Occurs once in this index'
            : 'Ayah endings'
  return {
    id: section,
    title,
    sourcePolicy: [],
    rows: [],
    summary: undefined,
    unavailable: { reason, retryable },
  } as SearchGraphSection
}
