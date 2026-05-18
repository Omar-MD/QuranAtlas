<script lang="ts">
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
</script>

<div class="qa-settings-picker" role="dialog" aria-modal="true" aria-label={title}>
  <header class="qa-settings-picker-head">
    <h3>{title}</h3>
    <button type="button" aria-label="Close picker" onclick={close}>x</button>
  </header>
  <div class="qa-settings-picker-rows">
    {#each rows as row (row.id)}
      <button
        type="button"
        class="qa-settings-picker-row"
        class:qa-settings-picker-row--active={row.active}
        disabled={row.disabled}
        onclick={() => choose?.(row.id)}
      >
        <span>{row.label}</span>
        {#if row.meta}<small>{row.meta}</small>{/if}
      </button>
    {/each}
  </div>
</div>
