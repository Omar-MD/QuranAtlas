/**
 * Layer organization for the tagging UI. Groups are a UI concern only —
 * IDB schema (`LAYER_NAMES` in core/db) stores all 12 layers as flat arrays.
 */

import type { LayerName } from '../core/db'

export interface LayerGroup {
  readonly id: 'speech' | 'narrative' | 'themes' | 'entities'
  readonly name: string
  readonly hueVar: `var(--lh-${'speech' | 'narrative' | 'themes' | 'entities'})`
  readonly layers: readonly LayerName[]
}

/**
 * Layer groups in outer → inner order. Within each group, layers are
 * ordered from the most containing / scope-setting concept to the most
 * specific / nested detail, so the deep-sheet rendering reads top-down
 * as "context → narrative frame → participants → specifics":
 *
 *   Speech    — speaker (source)     → audience (recipient) → quotedSpeaker (nested voice) → form (utterance shape)
 *   Narrative — mode (discourse mode) → tone (emotional colour)
 *   Themes    — threads (cross-cutting arcs) → subjects (specific subjects)
 *   Entities  — events (narrative frame) → people (agents) → places (setting) → divineNames (theological specifics)
 */
export const LAYER_GROUPS: readonly LayerGroup[] = [
  {
    id: 'speech',
    name: 'Speech',
    hueVar: 'var(--lh-speech)',
    layers: ['speaker', 'audience', 'quotedSpeaker', 'form'] as const,
  },
  {
    id: 'narrative',
    name: 'Narrative',
    hueVar: 'var(--lh-narrative)',
    layers: ['mode', 'tone'] as const,
  },
  {
    id: 'themes',
    name: 'Themes',
    hueVar: 'var(--lh-themes)',
    layers: ['threads', 'subjects'] as const,
  },
  {
    id: 'entities',
    name: 'Entities',
    hueVar: 'var(--lh-entities)',
    layers: ['events', 'people', 'places', 'divineNames'] as const,
  },
] as const

export const LAYER_LABELS: Readonly<Record<LayerName, string>> = {
  threads: 'threads',
  subjects: 'subjects',
  audience: 'audience',
  speaker: 'speaker',
  quotedSpeaker: 'quoted',
  mode: 'mode',
  form: 'form',
  tone: 'tone',
  people: 'people',
  places: 'places',
  events: 'events',
  divineNames: 'divine names',
}

export const LAYER_TO_GROUP: Readonly<Record<LayerName, LayerGroup['id']>> =
  Object.freeze(
    LAYER_GROUPS.reduce((acc, g) => {
      for (const l of g.layers) { acc[l] = g.id }
      return acc
    }, {} as Record<LayerName, LayerGroup['id']>)
  )

export function hueForLayer(layer: LayerName): string {
  const gid = LAYER_TO_GROUP[layer]
  return `var(--lh-${gid})`
}

export interface QuickPick {
  readonly layer: LayerName
  readonly value: string
}

/**
 * Prefix aliases accepted by the inline fast-tag panel's typed syntax
 * (`<prefix>:<value>`). Keys are `LayerName`; values are lowercased
 * aliases the user may type. First alias doubles as the canonical
 * display prefix shown in the placeholder hint.
 */
export const LAYER_PREFIXES: Readonly<Record<LayerName, readonly string[]>> = {
  threads: ['theme', 'themes', 'thread', 'threads'],
  subjects: ['subject', 'subjects'],
  audience: ['audience'],
  speaker: ['speaker'],
  quotedSpeaker: ['quoted', 'quotedspeaker'],
  mode: ['mode'],
  form: ['form'],
  tone: ['tone'],
  people: ['people', 'person'],
  places: ['place', 'places'],
  events: ['event', 'events'],
  divineNames: ['divine', 'divinename', 'divinenames', 'name', 'names'],
}

/**
 * Parse the inline typed-tag syntax `<prefix>:<value>` against a group's
 * allowed layers. Returns `null` if the prefix is absent, doesn't match
 * any layer in the group, or the value is empty. An explicit prefix is
 * always required — callers autofill the prefix as the user types so the
 * user never has to remember layer names by hand.
 */
export function parseLayeredValue(
  group: LayerGroup,
  raw: string,
): { layer: LayerName; value: string } | null {
  const trimmed = raw.trim()
  if (!trimmed) { return null }
  const colon = trimmed.indexOf(':')
  if (colon <= 0) { return null }
  const prefix = trimmed.slice(0, colon).trim().toLowerCase().replace(/\s+/g, '')
  const value = trimmed.slice(colon + 1).trim()
  if (!prefix || !value) { return null }
  const matched = group.layers.find(l => (LAYER_PREFIXES[l] as readonly string[]).includes(prefix))
  if (!matched) { return null }
  return { layer: matched, value }
}

/**
 * Given a group and a partial string the user has typed so far, return the
 * completion that should be auto-filled into the input. The completion
 * includes the trailing `:` so the caret lands in the value portion. If no
 * prefix alias in the group starts with the typed fragment (or the typed
 * fragment already contains a colon, or it already equals a complete
 * prefix), returns `null` and the caller leaves the input untouched.
 */
export function autofillPrefix(group: LayerGroup, typed: string): string | null {
  if (!typed || typed.includes(':')) { return null }
  const needle = typed.toLowerCase()
  for (const layer of group.layers) {
    for (const alias of LAYER_PREFIXES[layer]) {
      if (alias === needle) { return null }          // already a full prefix — let user type `:`
      if (alias.startsWith(needle)) {
        return alias + ':'
      }
    }
  }
  return null
}

export const QUICK_PICKS: readonly QuickPick[] = [
  { layer: 'threads', value: 'mercy' },
  { layer: 'threads', value: 'tawhid' },
  { layer: 'threads', value: 'guidance' },
  { layer: 'threads', value: 'taqwa' },
  { layer: 'mode', value: 'reminder' },
  { layer: 'mode', value: 'promise' },
]
