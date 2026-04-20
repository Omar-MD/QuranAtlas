/**
 * Canonicalization pipeline for tag labels.
 *
 * Converts raw user input into a deterministic normalized form used for
 * graph clustering and index lookup. See
 * docs/superpowers/specs/2026-04-20-verse-lenses-multi-layer-tags-design.md §3.
 *
 * Three-layer representation:
 *   raw        — exact user input (post trim+collapse only), for display
 *   normalized — pipeline output (this function), fuzzy-match key
 *   canonical  — normalized + alias-resolved (see resolveCanonical)
 */

const HARAKAT_RE = /[\u064B-\u0652\u0670\u0640]/g
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g

export function normalize(input: string): string {
  let s = input
    .normalize('NFKC')
    .replace(HARAKAT_RE, '')
    .replace(ZERO_WIDTH_RE, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
  return s
}
