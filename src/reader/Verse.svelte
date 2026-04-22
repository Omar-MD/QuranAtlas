<script lang="ts">
  import { emit } from '../core/events'
  import { Events } from '../core/constants'
  import { tagSession } from '../state/tag-session.svelte'
  import VerseTags from './VerseTags.svelte'

  interface Props {
    verseKey: string
    arabic: string
    translation: string
    translationVisible: boolean
    setupLongPress?: (node: HTMLElement) => () => void
    onNumberTap?: (verseEl: HTMLElement) => void
  }

  const {
    verseKey,
    arabic,
    translation,
    translationVisible,
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
    <span class="qa-verse-number" onclick={handleNumberTap}>{surahNum} : {verseNum}</span>
    {#if isActive}
      <span class="qa-verse-tagging" aria-label="Tagging this verse">
        <span class="qa-verse-tagging-dot" aria-hidden="true"></span>tagging
      </span>
    {/if}
  </div>
  <div class="qa-verse-arabic" dir="rtl">{arabic}</div>
  <div
    class="qa-verse-translation"
    class:qa-hide-translation={!translationVisible}
    data-translation=""
  >{translation}</div>
  <VerseTags {verseKey} />
</div>

<style>
  :global(.qa-verse) {
    position: relative;
    padding: 1.5rem 0 1.5rem 0;
    border-bottom: 1px solid var(--qa-border-subtle);
    content-visibility: auto;
    contain-intrinsic-size: 0 200px;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }
  :global(.qa-verse.qa-verse--active) {
    padding-left: 30px;
    background: color-mix(in srgb, var(--qa-text-primary) 4%, transparent);
    border-radius: 14px;
    border-bottom-color: transparent;
    box-shadow: inset 0 0 0 1px var(--qa-ambient-border);
    content-visibility: visible;
    transition: none;
  }
  .qa-verse-accent {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 14px;
    border: 3px solid var(--qa-ambient-accent);
    border-right: none;
    border-radius: 14px 0 0 14px;
    pointer-events: none;
  }

  .qa-verse-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  :global(.qa-verse-number) {
    display: inline-block;
    width: auto;
    height: auto;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    color: var(--qa-ambient-dim);
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.14em;
    font-weight: 500;
    cursor: pointer;
    flex-shrink: 0;
  }
  :global(.qa-verse--active .qa-verse-number) {
    color: var(--qa-ambient-parchment);
    font-weight: 700;
  }
  .qa-verse-tagging {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.625rem;
    letter-spacing: 0.1em;
    color: var(--qa-ambient-dim);
    font-weight: 500;
  }
  .qa-verse-tagging-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: transparent;
    border: 1.5px solid var(--qa-ambient-accent);
  }
</style>
