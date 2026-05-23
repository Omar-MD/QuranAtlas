<script lang="ts">
  import { onMount, tick } from 'svelte'

  interface PickerRow {
    id: string
    label: string
    meta?: string
    active?: boolean
    disabled?: boolean
  }

  interface Props {
    title: string
    rows?: PickerRow[]
    close: () => void
    choose?: (id: string) => void
  }

  const { title, rows = [], close, choose }: Props = $props()
  let root: HTMLDivElement | null = $state(null)

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    close()
  }

  onMount(() => {
    void tick().then(() => root?.focus())
  })
</script>

<div
  class="qa-settings-picker"
  role="dialog"
  aria-modal="true"
  aria-label={title}
  tabindex="-1"
  bind:this={root}
  onkeydown={handleKeydown}
>
  <header class="qa-settings-picker-head">
    <h3>{title}</h3>
    <button type="button" aria-label="Close picker" onclick={close}>x</button>
  </header>
  <div class="qa-settings-picker-rows">
    {#each rows as row (row.id)}
      <button
        type="button"
        class="qa-settings-picker-row qa-settings-row"
        class:qa-settings-picker-row--active={row.active}
        class:qa-settings-row--active={row.active}
        class:qa-settings-row--disabled={row.disabled}
        disabled={row.disabled}
        onclick={() => choose?.(row.id)}
      >
        <span class="qa-settings-row-label">{row.label}</span>
        {#if row.meta}<small class="qa-settings-row-meta">{row.meta}</small>{/if}
      </button>
    {/each}
  </div>
</div>
