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

export const LAYER_GROUPS: readonly LayerGroup[] = [
  {
    id: 'speech',
    name: 'Speech',
    hueVar: 'var(--lh-speech)',
    layers: ['speaker', 'quotedSpeaker', 'audience', 'form'] as const,
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
    layers: ['people', 'places', 'events', 'divineNames'] as const,
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

export const QUICK_PICKS: readonly QuickPick[] = [
  { layer: 'threads', value: 'mercy' },
  { layer: 'threads', value: 'tawhid' },
  { layer: 'threads', value: 'guidance' },
  { layer: 'threads', value: 'taqwa' },
  { layer: 'mode', value: 'reminder' },
  { layer: 'mode', value: 'promise' },
]
