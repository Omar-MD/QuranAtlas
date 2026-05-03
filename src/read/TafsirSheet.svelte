<script lang="ts">
  import { onMount } from 'svelte'
  import { formatTafsirRange, getActiveTafsirEntry, selectTafsirSource, tafsirState } from './tafsir-state.svelte'
  import { tafsirSheetBridge } from './tafsir-bridge'

  let isOpen = $state(false)

  const entry = $derived(getActiveTafsirEntry())
  const sourceLabel = $derived(
    tafsirState.available.find((item) => item.id === tafsirState.selectedId)?.name
      ?? 'Tafsir'
  )
  const fallbackLabel = $derived(
    tafsirState.available.find((item) => item.id === tafsirState.fallbackId)?.name
      ?? tafsirState.fallbackId
      ?? null
  )

  function close(): void {
    isOpen = false
  }

  async function handleSourceChange(e: Event) {
    const value = (e.currentTarget as HTMLSelectElement).value
    if (value) {
      await selectTafsirSource(value)
    }
  }

  onMount(() => {
    tafsirSheetBridge.register({
      open: () => { isOpen = true },
      close,
      isOpen: () => isOpen,
    })

    const onKey = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      tafsirSheetBridge.unregister()
    }
  })
</script>

{#if isOpen}
  <div class="qa-tafsir-sheet-scrim" onclick={close} role="presentation"></div>
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <aside class="qa-tafsir-sheet" role="dialog" aria-modal="true" aria-label="Tafsir">
    <header class="qa-tafsir-sheet-head">
      <div class="qa-tafsir-sheet-head-main">
        <div class="qa-tafsir-sheet-kicker">Tafsir</div>
        <div class="qa-tafsir-sheet-ref">{formatTafsirRange(entry) || tafsirState.activeVerseKey || ''}</div>
      </div>
      <button type="button" class="qa-tafsir-sheet-close" onclick={close} aria-label="Close tafsir">✕</button>
    </header>

    <div class="qa-tafsir-sheet-controls">
      <div class="qa-tafsir-sheet-source">{sourceLabel}</div>
      <select
        class="qa-tafsir-preview-select"
        value={tafsirState.selectedId}
        onchange={handleSourceChange}
        aria-label="Choose tafsir source"
      >
        {#each tafsirState.available as option (option.id)}
          <option value={option.id}>{option.name}</option>
        {/each}
      </select>
    </div>

    {#if tafsirState.loading}
      <div class="qa-tafsir-sheet-state">Loading tafsir…</div>
    {:else if tafsirState.unavailable || !entry}
      <div class="qa-tafsir-sheet-state">Tafsir unavailable for this verse.</div>
    {:else}
      {#if fallbackLabel}
        <div class="qa-tafsir-sheet-state">Showing {fallbackLabel} on this device.</div>
      {/if}
      <div class="qa-tafsir-sheet-body" dir="rtl" lang="ar">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html entry.text}
      </div>
    {/if}
  </aside>
{/if}
