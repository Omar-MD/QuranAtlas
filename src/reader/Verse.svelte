<script lang="ts">
  import { emit } from '../core/events'
  import { Events } from '../core/constants'

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
  const verseNumInt = $derived(parseInt(verseNum, 10))

  // action: called once on mount — fires READER_VERSE_RENDERED and wires long-press
  function handleMount(node: HTMLElement) {
    // node.dataset.verseKey gives us the current verseKey without capturing the prop
    const key = node.getAttribute('data-verse-key') ?? verseKey
    emit(Events.READER_VERSE_RENDERED, { verseKey: key, element: node })

    // Wire long-press from parent (CLAUDE.md Rule 4: sole verse gesture)
    const lp = node.ownerDocument
      ? setupLongPress
      : undefined
    let cleanupLp: (() => void) | undefined
    if (lp) {
      cleanupLp = lp(node)
    }

    return {
      destroy() {
        cleanupLp?.()
      },
    }
  }

  function handleNumberTap(e: MouseEvent) {
    const verseEl = (e.currentTarget as HTMLElement).closest('.qa-verse') as HTMLElement | null
    if (verseEl && onNumberTap) {
      onNumberTap(verseEl)
    }
  }
</script>

<div
  class="qa-verse"
  data-verse={verseNumInt}
  data-verse-key={verseKey}
  use:handleMount
>
  <div class="qa-verse-arabic" dir="rtl">
    {arabic}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <span
      class="qa-verse-number"
      onclick={handleNumberTap}
    >{verseNum}</span>
  </div>
  <div
    class="qa-verse-translation"
    class:qa-hide-translation={!translationVisible}
    data-translation=""
  >{translation}</div>
</div>
