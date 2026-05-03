<script lang="ts">
  import { formatTafsirRange, getActiveTafsirEntry, selectTafsirSource, tafsirState } from './tafsir-state.svelte'
  import { openTafsirSheet } from './tafsir-bridge'

  interface Props {
    verseKey: string
  }

  const { verseKey }: Props = $props()

  const isOpen = $derived(tafsirState.previewOpen && tafsirState.activeVerseKey === verseKey)
  const entry = $derived(getActiveTafsirEntry())
  const rangeLabel = $derived(formatTafsirRange(entry))
  const sourceLabel = $derived(
    tafsirState.available.find((item) => item.id === (tafsirState.pack?.tafsirId ?? tafsirState.selectedId))?.name
      ?? 'Tafsir'
  )

  async function handleSourceChange(e: Event) {
    const value = (e.currentTarget as HTMLSelectElement).value
    if (value) {
      await selectTafsirSource(value)
    }
  }
</script>

{#if isOpen}
  <section class="qa-tafsir-preview" data-tafsir-preview="" aria-label="Inline tafsir preview">
    <div class="qa-tafsir-preview-head">
      <div class="qa-tafsir-preview-meta">
        <span class="qa-tafsir-preview-kicker">Tafsir</span>
        <span class="qa-tafsir-preview-ref">{rangeLabel || verseKey}</span>
      </div>
      <div class="qa-tafsir-preview-tools">
        <label class="qa-tafsir-preview-picker">
          <span class="qa-tafsir-preview-picker-label">Source</span>
          <select
            class="qa-tafsir-preview-select"
            value={tafsirState.pack?.tafsirId ?? tafsirState.selectedId}
            onchange={handleSourceChange}
            aria-label="Choose tafsir source"
          >
            {#each tafsirState.available as option (option.id)}
              <option value={option.id}>{option.name}</option>
            {/each}
          </select>
        </label>
        <button type="button" class="qa-tafsir-preview-expand" onclick={() => openTafsirSheet(verseKey)}>
          Expand
        </button>
      </div>
    </div>

    {#if tafsirState.loading}
      <div class="qa-tafsir-preview-state">Loading tafsir…</div>
    {:else if tafsirState.unavailable || !entry}
      <div class="qa-tafsir-preview-state">Tafsir unavailable for this verse.</div>
    {:else}
      <div class="qa-tafsir-preview-source">{sourceLabel}</div>
      <div class="qa-tafsir-preview-body" dir="rtl" lang="ar">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html entry.text}
      </div>
    {/if}
  </section>
{/if}
