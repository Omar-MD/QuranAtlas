<script lang="ts">
  import { audioState } from '../audio/state.svelte'
  import { toggle, stop } from './player-runtime'
  import { audioPlayerBridge } from './player-bridge'

  const visible = $derived(audioState.status !== 'idle')
  const playing = $derived(audioState.status === 'playing')
  const surahLabel = $derived(audioState.surah !== null ? `Surah ${audioState.surah}` : '')
  const reciterLabel = $derived(audioState.reciter ?? '')
  const verseLabel = $derived(audioState.currentVerse ?? '')

  function onTogglePress(e: MouseEvent): void {
    e.stopPropagation()
    toggle()
  }

  function onStopPress(e: MouseEvent): void {
    e.stopPropagation()
    stop()
  }

  function onExpand(): void {
    audioPlayerBridge.api.open()
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onExpand()
    }
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="qa-audio-minibar"
    role="region"
    aria-label="Audio mini player"
    onclick={onExpand}
    onkeydown={onKey}
    tabindex="0"
  >
    <div class="qa-audio-minibar-meta">
      <div class="qa-audio-minibar-surah">{surahLabel}</div>
      <div class="qa-audio-minibar-detail">
        <span class="qa-audio-minibar-reciter">{reciterLabel}</span>
        {#if verseLabel}<span class="qa-audio-minibar-verse">· {verseLabel}</span>{/if}
      </div>
    </div>
    <button
      type="button"
      class="qa-audio-minibar-toggle"
      aria-label={playing ? 'Pause audio' : 'Resume audio'}
      onclick={onTogglePress}
    >
      {#if audioState.status === 'loading'}…{:else if playing}❙❙{:else}▶{/if}
    </button>
    <button
      type="button"
      class="qa-audio-minibar-stop"
      aria-label="Stop audio"
      onclick={onStopPress}
    >×</button>
  </div>
{/if}
