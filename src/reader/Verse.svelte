<script lang="ts">
  import { emit } from '../core/events'
  import { Events } from '../core/constants'
  import { tagSession } from '../state/tag-session.svelte'
  import VerseTagPanel from './VerseTagPanel.svelte'
  import { parseTranslationTokens } from './translation-tokens'

  interface Props {
    verseKey: string
    arabic: string
    translation: string
    translationVisible: boolean
    footnotes?: Record<string, string>
    riwayah?: 'hafs' | 'warsh' | 'qaloon'
    setupLongPress?: (node: HTMLElement) => () => void
    onNumberTap?: (verseEl: HTMLElement) => void
    /** Translation lookup role for cross-riwayah display.
     * - 'identity' / 'merged' / 'primary': render translation directly.
     * - 'continuation': this Madinan ayah is the second+ half of a Hafs split;
     *   show "↑ continued from N" marker instead of the full translation.
     * - 'none': no Hafs equivalent (Bismillah carve-out cases). */
    translationRole?: 'identity' | 'merged' | 'primary' | 'continuation' | 'none'
    /** When `translationRole === 'continuation'`, the Madinan ayah index of
     * the primary (first) half of the split. Used to render the marker. */
    primaryAyah?: number
  }

  const {
    verseKey,
    arabic,
    translation,
    translationVisible,
    footnotes = {},
    riwayah = 'qaloon',
    setupLongPress,
    onNumberTap,
    translationRole = 'identity',
    primaryAyah,
  }: Props = $props()

  const verseNum = $derived(verseKey.split(':')[1] ?? '')
  const surahNum = $derived(verseKey.split(':')[0] ?? '')
  const isActive = $derived(tagSession.verseKey === verseKey && tagSession.quickbarOpen)
  const tokens = $derived(parseTranslationTokens(translation))

  let openFn = $state<string | null>(null)

  function handleMount(node: HTMLElement) {
    const key = node.getAttribute('data-token-key') ?? verseKey
    emit(Events.READER_VERSE_RENDERED, { verseKey: key, element: node })

    let cleanupLp: (() => void) | undefined
    if (setupLongPress) { cleanupLp = setupLongPress(node) }

    return { destroy() { cleanupLp?.() } }
  }

  function handleNumberTap(e: MouseEvent) {
    const verseEl = (e.currentTarget as HTMLElement).closest('.qa-verse') as HTMLElement | null
    if (verseEl && onNumberTap) { onNumberTap(verseEl) }
  }

  function toggleFootnote(idx: string) {
    openFn = openFn === idx ? null : idx
  }

  function handleFootnoteKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && openFn !== null) {
      openFn = null
      e.stopPropagation()
    }
  }
</script>

<!-- N19 deprecation grace: data-verse-key retained for one release, dropped in N20 -->
<div
  class="qa-verse"
  class:qa-verse--active={isActive}
  data-verse={verseNum}
  data-verse-key={verseKey}
  data-token-key={verseKey}
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
  {#if translationRole === 'continuation'}
    <div
      class="qa-verse-translation qa-verse-translation--continuation"
      class:qa-hide-translation={!translationVisible}
      data-translation=""
      data-translation-role="continuation"
      role="presentation"
      aria-label="Translation continued from verse {primaryAyah}"
    >
      <span class="qa-verse-continuation-marker" aria-hidden="true">↑</span>
      <span class="qa-verse-continuation-text">continued from verse {primaryAyah}</span>
    </div>
  {:else}
    <div
      class="qa-verse-translation"
      class:qa-hide-translation={!translationVisible}
      data-translation=""
      data-translation-role={translationRole}
      onkeydown={handleFootnoteKey}
      role="presentation"
    >
      {#each tokens as t, i (i)}
        {#if t.type === 'text'}{t.value}{:else}<button
            type="button"
            class="qa-fn-marker"
            data-fn={t.idx}
            aria-expanded={openFn === t.idx}
            aria-controls="fn-{verseKey}-{t.idx}"
            aria-label="Footnote {t.idx}"
            onclick={() => toggleFootnote(t.idx)}
          >{t.idx}</button>{/if}
      {/each}
    </div>
  {/if}
  {#if translationVisible && openFn !== null && footnotes[openFn]}
    <div
      class="qa-fn-popover"
      id="fn-{verseKey}-{openFn}"
      role="note"
      data-footnote=""
    >
      <span class="qa-fn-popover-num" aria-hidden="true">[{openFn}]</span>
      <span class="qa-fn-popover-text">{footnotes[openFn]}</span>
      <button
        type="button"
        class="qa-fn-popover-close"
        aria-label="Close footnote"
        onclick={() => { openFn = null }}
      >×</button>
    </div>
  {/if}
  {#if isActive}
    <VerseTagPanel {verseKey} />
  {/if}
</div>

