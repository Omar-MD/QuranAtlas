// Search shard filename → feature mapping — the single table for the
// `.qas` shard namespace (audit §5: two tables for the same namespace).
// The graph lane's former `graphFeatureForFilename` was a strict subset:
// every filename the graph lane emits hits an explicit rule here (its
// 'provenance' fallback is subsumed by the graph-provenance rule below).
export function featureForShard(filename) {
  if (filename.startsWith('arabic-postings')) return 'arabic-text'
  if (filename.startsWith('translation-postings')) return 'translation'
  if (filename.startsWith('exact-word-postings')) return 'arabic-text'
  if (filename.startsWith('phrase-postings')) return 'phrase'
  if (
    filename.startsWith('morphology-') ||
    filename.startsWith('same-written-form-') ||
    filename.startsWith('same-root-') ||
    filename.startsWith('lemma-') ||
    filename.startsWith('surah-context')
  )
    return 'morphology'
  if (filename.startsWith('following-wording')) return 'following-wording'
  if (filename.startsWith('shared-wording')) return 'shared-wording'
  if (filename.startsWith('repeated-phrases')) return 'repeated-phrases'
  if (filename.startsWith('occurs-once')) return 'occurs-once'
  if (filename.startsWith('ayah-endings')) return 'ayah-endings'
  if (filename.startsWith('counts-patterns')) return 'counts-patterns'
  if (filename.startsWith('graph-provenance')) return 'provenance'
  if (filename.includes('provenance')) return 'provenance'
  if (filename.includes('dictionaries')) return 'core'
  return 'core'
}
