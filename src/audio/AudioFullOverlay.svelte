<script lang="ts">
  import { onMount } from 'svelte'
  import { audioState } from '../audio/state.svelte'
  import { settings } from '../settings/state.svelte'
  import { toggle, seek, prev, next, stop } from './player-runtime'
  import { setAudioFirstPlayHintShown } from '../settings/audio'
  import { audioPlayerBridge, type AudioOverlayAPI } from './player-bridge'

  let open = $state(false)

  function fmtMs(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) { return '0:00' }
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  onMount(() => {
    const api: AudioOverlayAPI = {
      open() { open = true },
      close() { open = false },
      isOpen() { return open },
    }
    audioPlayerBridge.register(api)
    return () => { audioPlayerBridge.unregister() }
  })

  $effect(() => {
    if (open && !settings.audioFirstPlayHintShown) {
      void setAudioFirstPlayHintShown(true)
    }
  })

  function onScrubInput(e: Event): void {
    const target = e.currentTarget as HTMLInputElement
    const ms = Number(target.value)
    if (Number.isFinite(ms)) { seek(ms) }
  }
</script>

{#if open}
  <div class="qa-audio-overlay" role="dialog" aria-label="Audio player" aria-modal="false">
    <header class="qa-audio-overlay-head">
      <h2 class="qa-audio-overlay-title">Audio</h2>
      <button type="button" class="qa-audio-overlay-close" aria-label="Close audio player" onclick={() => audioPlayerBridge.api.close()}>×</button>
    </header>
    <div class="qa-audio-overlay-body">
      <div class="qa-audio-overlay-meta">
        <div class="qa-audio-overlay-surah">{audioState.surah !== null ? `Surah ${audioState.surah}` : '—'}</div>
        <div class="qa-audio-overlay-reciter">{audioState.reciter ?? 'No reciter selected'}</div>
        <div class="qa-audio-overlay-verse">{audioState.currentVerse ?? ''}</div>
      </div>
      <input
        type="range"
        class="qa-audio-overlay-scrub"
        min="0"
        max={audioState.durationMs || 0}
        value={audioState.positionMs}
        oninput={onScrubInput}
        aria-label="Seek"
      />
      <div class="qa-audio-overlay-times">
        <span>{fmtMs(audioState.positionMs)}</span>
        <span>{fmtMs(audioState.durationMs)}</span>
      </div>
      <div class="qa-audio-overlay-transport">
        <button type="button" onclick={() => prev()} aria-label="Previous surah">⏮</button>
        <button type="button" onclick={() => toggle()} aria-label={audioState.status === 'playing' ? 'Pause' : 'Play'}>
          {audioState.status === 'playing' ? '❙❙' : '▶'}
        </button>
        <button type="button" onclick={() => next()} aria-label="Next surah">⏭</button>
        <button type="button" onclick={() => stop()} aria-label="Stop">⏹</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .qa-audio-overlay {
    position: fixed;
    inset: 0;
    background: var(--qa-surface, #0a0a0a);
    color: var(--qa-text, #fff);
    z-index: 60;
    display: flex;
    flex-direction: column;
  }
  .qa-audio-overlay-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--qa-border, rgba(255,255,255,0.1));
  }
  .qa-audio-overlay-title { margin: 0; font-size: 18px; }
  .qa-audio-overlay-close {
    background: transparent;
    border: none;
    color: inherit;
    font-size: 24px;
    cursor: pointer;
    padding: 8px;
  }
  .qa-audio-overlay-body { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
  .qa-audio-overlay-meta { text-align: center; }
  .qa-audio-overlay-surah { font-size: 20px; font-weight: 600; }
  .qa-audio-overlay-reciter { opacity: 0.7; margin-top: 4px; }
  .qa-audio-overlay-verse { opacity: 0.5; margin-top: 4px; font-size: 14px; }
  .qa-audio-overlay-scrub { width: 100%; }
  .qa-audio-overlay-times { display: flex; justify-content: space-between; font-size: 12px; opacity: 0.6; }
  .qa-audio-overlay-transport {
    display: flex;
    justify-content: center;
    gap: 16px;
  }
  .qa-audio-overlay-transport button {
    background: var(--qa-surface-elev, #1a1a1a);
    color: inherit;
    border: 1px solid var(--qa-border, rgba(255,255,255,0.12));
    border-radius: 12px;
    width: 56px;
    height: 56px;
    font-size: 18px;
    cursor: pointer;
  }
  .qa-audio-overlay-transport button:hover {
    background: var(--qa-surface-hover, rgba(255,255,255,0.06));
  }
</style>
