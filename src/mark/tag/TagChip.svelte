<script lang="ts">
  /**
   * Quickbar chip. Distinct from `marks/TagChip.svelte` (which drives deep sheet).
   * Quickbar chips are tap-to-toggle.
   */
  import type { LayerName } from '../../core/db'
  import { LAYER_TO_GROUP } from '../../data/tag-layers'

  interface Props {
    layer: LayerName
    value: string
    on?: boolean
    ontoggle?: () => void
  }
  const { layer, value, on = false, ontoggle }: Props = $props()
</script>

<button
  type="button"
  class="qa-tag-chip"
  class:qa-tag-chip--on={on}
  onclick={ontoggle}
  aria-pressed={on}
  data-group={LAYER_TO_GROUP[layer]}
>
  <span class="qa-tag-chip-dot"></span>
  {value}
</button>

