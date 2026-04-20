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

export function normalize(input: string): string {
  // Step 1: trim + collapse whitespace
  return input.trim().replace(/\s+/g, ' ').toLowerCase()
  // Step 2+: remaining pipeline added in subsequent tasks
}
