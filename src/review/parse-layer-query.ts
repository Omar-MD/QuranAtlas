import { LAYER_NAMES, type LayerName } from '../core/db'

const LAYER_SET: ReadonlySet<string> = new Set(LAYER_NAMES)

/**
 * Parse the optional `?layer=<name>` query off a hash like `#/review?layer=people`.
 * Returns the layer name if it is a member of LAYER_NAMES, else null.
 *
 * Used by NavDrawer's Review tab to deep-link a layer without adding a new
 * route pattern. Hub.svelte reads this on mount + on hash change to set
 * `activeLayer`. Anything other than `#/review` returns null.
 */
export function parseLayerFromHash(hash: string): LayerName | null {
  if (!hash.startsWith('#/review')) { return null }
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) { return null }
  const params = new URLSearchParams(hash.slice(queryIndex + 1))
  const raw = params.get('layer')
  if (!raw) { return null }
  return LAYER_SET.has(raw) ? (raw as LayerName) : null
}
