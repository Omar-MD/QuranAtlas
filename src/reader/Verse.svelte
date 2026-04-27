<script lang="ts">
  import { emit } from '../core/events'
  import { Events } from '../core/constants'
  import { tagSession } from '../state/tag-session.svelte'
  import VerseTagPanel from './VerseTagPanel.svelte'

  interface Props {
    verseKey: string
    arabic: string
    translation: string
    translationVisible: boolean
    riwayah?: 'hafs' | 'warsh' | 'qaloon'
    setupLongPress?: (node: HTMLElement) => () => void
    onNumberTap?: (verseEl: HTMLElement) => void
  }

  const {
    verseKey,
    arabic,
    translation,
    translationVisible,
    riwayah = 'qaloon',
    setupLongPress,
    onNumberTap,
  }: Props = $props()

  const verseNum = $derived(verseKey.split(':')[1] ?? '')
  const surahNum = $derived(verseKey.split(':')[0] ?? '')
  const isActive = $derived(tagSession.verseKey === verseKey && tagSession.quickbarOpen)

  function handleMount(node: HTMLElement) {
    const key = node.getAttribute('data-verse-key') ?? verseKey
    emit(Events.READER_VERSE_RENDERED, { verseKey: key, element: node })

    let cleanupLp: (() => void) | undefined
    if (setupLongPress) { cleanupLp = setupLongPress(node) }

    return { destroy() { cleanupLp?.() } }
  }

  function handleNumberTap(e: MouseEvent) {
    const verseEl = (e.currentTarget as HTMLElement).closest('.qa-verse') as HTMLElement | null
    if (verseEl && onNumberTap) { onNumberTap(verseEl) }
  }
</script>

<div
  class="qa-verse"
  class:qa-verse--active={isActive}
  data-verse={verseNum}
  data-verse-key={verseKey}
  use:handleMount
>
  {#if isActive}
    <span class="qa-verse-accent" aria-hidden="true"></span>
  {/if}
  <div class="qa-verse-head">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <span class="qa-verse-number" onclick={handleNumberTap} aria-label="Verse {surahNum}:{verseNum}">{verseNum}</span>
    {#if isActive}
      <span class="qa-verse-tagging" aria-label="Tagging this verse">
        <span class="qa-verse-tagging-dot" aria-hidden="true"></span>tagging
      </span>
    {/if}
  </div>
  <div class="qa-verse-arabic" dir="rtl" data-riwayah={riwayah}>{arabic}</div>
  <div
    class="qa-verse-translation"
    class:qa-hide-translation={!translationVisible}
    data-translation=""
  >{translation}</div>
  {#if isActive}
    <VerseTagPanel {verseKey} />
  {/if}
</div>

