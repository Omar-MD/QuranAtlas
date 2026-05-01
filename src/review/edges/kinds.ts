export const EDGE_KIND_SEEDS = [
  'explains', 'expands', 'summarizes',
  'parallel', 'contrast', 'continues',
  'responds-to', 'fulfills', 'abrogates',
  'same-story', 'same-character', 'echo',
  'evidence-for', 'application-of',
] as const

const SYMMETRIC_KINDS = new Set([
  'parallel', 'contrast', 'same-story', 'same-character', 'echo',
])

export function inferDirectedFromKind(canonKind: string): boolean {
  return !SYMMETRIC_KINDS.has(canonKind)
}
