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

<style>
  .qa-audio-minibar {
    position: fixed;
    inset: auto 0 var(--qa-bottom-nav-h, 56px) 0;
    height: 56px;
    background: var(--qa-surface-elev, #1a1a1a);
    color: var(--qa-text, #fff);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    border-top: 1px solid var(--qa-border, rgba(255,255,255,0.1));
    z-index: 40;
    cursor: pointer;
  }
  .qa-audio-minibar:focus-visible { outline: 2px solid var(--qa-accent, #4af); outline-offset: -2px; }
  .qa-audio-minibar-meta { flex: 1; min-width: 0; }
  .qa-audio-minibar-surah { font-weight: 600; font-size: 14px; line-height: 1.2; }
  .qa-audio-minibar-detail { font-size: 12px; opacity: 0.7; line-height: 1.2; }
  .qa-audio-minibar-toggle,
  .qa-audio-minibar-stop {
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: inherit;
    font-size: 18px;
    cursor: pointer;
    border-radius: 8px;
  }
  .qa-audio-minibar-toggle:hover,
  .qa-audio-minibar-stop:hover { background: var(--qa-surface-hover, rgba(255,255,255,0.06)); }
</style>
