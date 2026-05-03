<script lang="ts">
  import { onMount } from 'svelte'
  import { audioState } from './state.svelte'
  import { settings } from '../configure/state.svelte'
  import { toggle, seek, prev, next, stop } from './player-runtime'
  import { setAudioFirstPlayHintShown } from '../configure/audio'
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
        <button type="button" class="qa-audio-overlay-transport-btn" onclick={() => prev()} aria-label="Previous surah">⏮</button>
        <button type="button" class="qa-audio-overlay-transport-btn" onclick={() => toggle()} aria-label={audioState.status === 'playing' ? 'Pause' : 'Play'}>
          {audioState.status === 'playing' ? '❙❙' : '▶'}
        </button>
        <button type="button" class="qa-audio-overlay-transport-btn" onclick={() => next()} aria-label="Next surah">⏭</button>
        <button type="button" class="qa-audio-overlay-transport-btn" onclick={() => stop()} aria-label="Stop">⏹</button>
      </div>
    </div>
  </div>
{/if}
