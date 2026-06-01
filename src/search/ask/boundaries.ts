import type {
  AnswerBlockerLite,
  NoAnswerRecoveryLite,
  QueryUnderstandingLite,
} from '../../../shared/search'

type BoundaryRule = {
  blocker: AnswerBlockerLite
  pattern: RegExp
}

const BOUNDARY_RULES: BoundaryRule[] = [
  { blocker: 'absence-claim-unproven', pattern: /\b(does not mention|never mentions?|nowhere says|not mentioned|absent from)\b/i },
  { blocker: 'legal-boundary', pattern: /\b(legal advice|lawsuit|court|contract|immigration|criminal)\b/i },
  { blocker: 'medical-boundary', pattern: /\b(medical advice|diagnosis|treatment|medicine|symptom|doctor)\b/i },
  { blocker: 'fiqh-boundary', pattern: /\b(fatwa|halal for me|haram for me|ruling for me|personal fiqh)\b/i },
  { blocker: 'personal-crisis-boundary', pattern: /\b(suicide|self-harm|kill myself|immediate danger|hurt myself)\b/i },
  { blocker: 'personal-pastoral-boundary', pattern: /\b(what should i do spiritually|personal spiritual advice|counsel me|my crisis)\b/i },
  { blocker: 'broad-theological-boundary', pattern: /\b(islam says|what does islam say|the qur'?an teaches|what does islam think|all muslims believe)\b/i },
  { blocker: 'inflammatory-religious-attack-boundary', pattern: /\b(prove.*evil|attack.*religion|why.*inferior|mock.*islam)\b/i },
  { blocker: 'requires-deferred-source', pattern: /\b(tafsir|asbab|hadith|theme|cross-reference|cross reference)\b/i },
]

export function blockersForAskQuery(query: string, understanding: QueryUnderstandingLite): AnswerBlockerLite[] {
  const blockers = new Set<AnswerBlockerLite>()
  if (!query.trim()) blockers.add('ambiguous-query')
  if (understanding.confidence === 'low') blockers.add('ambiguous-query')
  for (const rule of BOUNDARY_RULES) {
    if (rule.pattern.test(query)) blockers.add(rule.blocker)
  }
  if (blockers.has('requires-deferred-source') && /\btafsir\b/i.test(query)) blockers.add('requires-tafsir')
  return [...blockers]
}

export function recoveryForAskBlockers(query: string, blockers: AnswerBlockerLite[]): NoAnswerRecoveryLite {
  const requiredDeferredSources = blockers.includes('requires-deferred-source')
    ? deferredSourcesForQuery(query)
    : undefined
  return {
    message: messageForBlockers(blockers),
    suggestedQueries: [
      { label: 'Search exact wording', query: query.replace(/\?+$/, '').trim(), lens: 'quran-text' },
      { label: 'Search translation evidence', query: query.replace(/\?+$/, '').trim(), lens: 'translation' },
      { label: 'Open a reference', query: '2:255', lens: 'reference' },
    ],
    actions: blockers.includes('insufficient-evidence')
      ? ['refine-query', 'show-related-evidence']
      : ['refine-query', 'open-reader'],
    requiredDeferredSources,
  }
}

function messageForBlockers(blockers: AnswerBlockerLite[]): string {
  if (blockers.includes('absence-claim-unproven')) return 'This v1 search can show related evidence, but it cannot answer absence claims as prose.'
  if (blockers.includes('requires-tafsir')) return 'This v1 search does not include tafsir evidence. Search the available text and translation evidence instead.'
  if (blockers.some((blocker) => blocker.endsWith('-boundary'))) return 'This query needs a safer evidence-only response in v1.'
  if (blockers.includes('ambiguous-query')) return 'This query needs a clearer reference, wording, or source lane.'
  return 'The available v1 sources are not enough to answer this query as prose.'
}

function deferredSourcesForQuery(query: string): NoAnswerRecoveryLite['requiredDeferredSources'] {
  const sources: NonNullable<NoAnswerRecoveryLite['requiredDeferredSources']> = []
  if (/\btafsir\b/i.test(query)) sources.push('tafsir')
  if (/\basbab\b/i.test(query)) sources.push('asbab')
  if (/\bhadith\b/i.test(query)) sources.push('hadith')
  if (/\btheme\b/i.test(query)) sources.push('theme')
  if (/\bcross[-\s]?reference\b/i.test(query)) sources.push('cross-reference')
  return sources.length > 0 ? sources : ['tafsir']
}
