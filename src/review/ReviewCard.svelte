<script lang="ts">
  import { getColorForTag } from '../marks/tags'
  import type { Mark } from '../marks/store'
  import type { SurahMeta } from '../data/dataset'
  import { getSurah } from '../data/dataset'
  import { onMount } from 'svelte'

  const {
    mark,
    surahMeta,
    openEditor,
  }: {
    mark: Mark
    surahMeta: SurahMeta | undefined
    openEditor: (verseKey: string) => void
  } = $props()

  const sStr = $derived(mark.verseKey.split(':')[0] ?? '')
  const vStr = $derived(mark.verseKey.split(':')[1] ?? '')
  const sNum = $derived(parseInt(mark.verseKey.split(':')[0] ?? '0', 10))
  const vNum = $derived(parseInt(mark.verseKey.split(':')[1] ?? '0', 10))

  let arabicText = $state<string | null>(null)
  let englishText = $state<string | null>(null)

  onMount(async () => {
    try {
      const data = await getSurah(sNum)
      const idx = vNum - 1
      arabicText = (data.ar && data.ar[idx]) ? (data.ar[idx] ?? null) : null
      englishText = (data.en && data.en[idx]) ? (data.en[idx] ?? null) : null
    } catch {
      // silently fail — content stays blank
    }
  })

  function handleClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('a, button')) { return }
    openEditor(mark.verseKey)
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
  class="qa-review-card"
  data-mark={mark.verseKey}
  onclick={handleClick}
>
  <div class="qa-review-card-ref">
    {sStr} : {vStr}{surahMeta ? ` · ${surahMeta.name}` : ''}
    <a
      class="qa-review-card-jump"
      href="#{`/s/${sStr}/${vStr}`}"
      aria-label="Jump to {mark.verseKey} in reader"
    >↗</a>
  </div>

  <div class="qa-review-card-content">
    {#if arabicText}
      <div class="qa-review-card-ar" dir="rtl">{arabicText}</div>
    {/if}
    {#if englishText}
      <div class="qa-review-card-en">{englishText}</div>
    {/if}
  </div>

  {#if mark.note}
    <div class="qa-review-card-note">{mark.note}</div>
  {/if}

  {#if mark._canon.threads.length > 0}
    <div class="qa-review-card-chips">
      {#each mark._canon.threads as tag (tag)}
        <a
          class="qa-review-card-chip"
          href="#{`/t/${encodeURIComponent(tag)}`}"
        >
          <span
            class="qa-review-card-chip-dot"
            style:background-color={getColorForTag(tag)}
          ></span>
          {tag}
        </a>
      {/each}
    </div>
  {/if}
</article>

<style>
  .qa-review-card {
    padding: 13px;
    border-radius: 11px;
    border: 1px solid var(--qa-ambient-border);
    background-color: var(--qa-ambient-surface);
    margin-bottom: 10px;
    cursor: pointer;
  }

  .qa-review-card-ref {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--qa-ambient-accent);
    font-weight: 700;
    margin-bottom: 8px;
  }

  .qa-review-card-jump {
    margin-left: auto;
    color: var(--qa-ambient-dim);
    text-decoration: none;
    font-size: 0.875rem;
    opacity: 0.6;
  }

  .qa-review-card-ar {
    font-family: var(--qa-font-arabic);
    direction: rtl;
    text-align: right;
    font-size: 1.0625rem;
    line-height: 1.95;
    color: var(--qa-ambient-parchment);
    margin-bottom: 6px;
  }

  .qa-review-card-en {
    font-size: 0.8125rem;
    line-height: 1.7;
    color: var(--qa-ambient-muted);
    margin-bottom: 8px;
  }

  .qa-review-card-note {
    padding: 6px 9px;
    border-radius: 6px;
    border-left: 2px solid var(--qa-ambient-accent);
    background-color: color-mix(in srgb, var(--qa-ambient-accent) 8%, transparent);
    color: var(--qa-ambient-parchment);
    font-style: italic;
    font-size: 0.8125rem;
    line-height: 1.55;
    margin-bottom: 8px;
  }

  .qa-review-card-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .qa-review-card-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    background-color: var(--qa-selection-bg);
    color: var(--qa-selection-text);
    font-size: 0.6875rem;
    text-decoration: none;
  }

  .qa-review-card-chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
</style>
