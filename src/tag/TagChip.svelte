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
  <span class="qa-tag-chip-dot" style:background-color={hue}></span>
  {value}
</button>

<style>
  .qa-tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 11px;
    border-radius: 999px;
    border: 1px solid transparent;
    background-color: transparent;
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 0.12s ease, color 0.12s ease;
  }
  .qa-tag-chip-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    opacity: 0.6;
  }
  .qa-tag-chip:hover {
    background-color: var(--qa-ambient-accent-soft);
  }
  .qa-tag-chip--on {
    background-color: var(--qa-ambient-accent);
    color: var(--qa-on-accent);
    font-weight: 600;
  }
  .qa-tag-chip--on .qa-tag-chip-dot {
    background-color: currentColor !important;
    opacity: 0.85;
  }
</style>
