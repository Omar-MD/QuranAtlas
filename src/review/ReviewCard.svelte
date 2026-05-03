<script lang="ts">
  import { getSlotForTag } from '../mark/tags'
  import type { Mark } from '../mark/store'
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
      arabicText = data.ayat[idx]?.aya_text ?? null
      englishText = null
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

  <div>
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
          href="#{`/threads/${encodeURIComponent(tag)}`}"
        >
          <span
            class="qa-review-card-chip-dot"
            data-tag-slot={getSlotForTag(tag)}
          ></span>
          {tag}
        </a>
      {/each}
    </div>
  {/if}
</article>
