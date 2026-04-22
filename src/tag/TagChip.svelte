<script lang="ts">
  /**
   * Quickbar chip. Distinct from `marks/TagChip.svelte` (which drives deep sheet).
   * Quickbar chips are tap-to-toggle.
   */
  import type { LayerName } from '../core/db'
  import { hueForLayer } from '../data/tag-layers'

  interface Props {
    layer: LayerName
    value: string
    on?: boolean
    ontoggle?: () => void
  }
  const { layer, value, on = false, ontoggle }: Props = $props()
  const hue = $derived(hueForLayer(layer))
</script>

<button
  type="button"
  class="qa-tag-chip"
  class:qa-tag-chip--on={on}
  onclick={ontoggle}
  aria-pressed={on}
>
  <span class="qa-tag-chip-dot" style:--qa-tag-chip-hue={hue}></span>
  {value}
</button>

