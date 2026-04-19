<script lang="ts">
  import { getColorForTag } from './tags'

  interface Props {
    tag: string
    selected?: boolean
    dim?: boolean
    create?: boolean
    ontoggle?: () => void
  }

  const { tag, selected = false, dim = false, create = false, ontoggle }: Props = $props()
  const color = $derived(create ? '' : getColorForTag(tag))
</script>

<button
  type="button"
  class="qa-mark-chip"
  class:qa-mark-chip--on={selected}
  class:qa-mark-chip--dim={dim}
  class:qa-mark-chip--create={create}
  onclick={ontoggle}
>
  {#if !create}
    <span class="qa-mark-chip-dot" style:background-color={color}></span>
  {/if}
  {tag}
  {#if selected}
    <span class="qa-mark-chip-x" aria-hidden="true">×</span>
  {/if}
</button>

<style>
  .qa-mark-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px 4px 7px;
    border-radius: 999px;
    border: 1px solid var(--qa-ambient-border);
    background-color: var(--qa-ambient-surface);
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }
  .qa-mark-chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .qa-mark-chip-x {
    margin-left: 2px;
    opacity: 0.7;
    font-size: 0.75rem;
  }
  .qa-mark-chip:hover {
    border-color: var(--qa-ambient-accent);
  }
  .qa-mark-chip--on {
    background-color: var(--qa-selection-bg);
    color: var(--qa-selection-text);
    border-color: transparent;
    box-shadow: inset 0 0 0 1px var(--qa-selection-ring);
    font-weight: 600;
  }
  .qa-mark-chip--dim { opacity: 0.38; }
  .qa-mark-chip--create {
    border-style: dashed;
    background-color: transparent;
    color: var(--qa-ambient-accent);
    font-style: italic;
  }
</style>
