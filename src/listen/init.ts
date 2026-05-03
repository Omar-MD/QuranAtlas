// Audio init: wires settings load, cross-tab gating, reader integration.
// Called from app-bootstrap.ts after initRiwayah() resolves so that the
// active riwayah is known before audio settings (audioReciter default
// could be riwayah-aware in future) load.
//
// Returns a cleanup function pushed onto app-bootstrap's bootCleanups
// stack for unmount on teardown.

import { initAudioSettings } from '../configure/audio'
import { initCrossTab } from './cross-tab'
import { initAudioHighlight } from '../read/audio-highlight'
import { initAudioAutoScroll } from '../read/audio-autoscroll'
import { pauseFromCrossTab } from './player-runtime'
import { audioState } from './state.svelte'

export async function initAudio(): Promise<() => void> {
  await initAudioSettings()

  const cleanupHighlight = initAudioHighlight()
  const cleanupAutoScroll = initAudioAutoScroll()

  initCrossTab({
    onPlaybackTakeover: () => {
      // Another tab pressed play — yield. Soft sync of position is
      // implicit: each tab persists its own position; on takeover we
      // simply pause our element. The peer started playback in their
      // tab and will broadcast their own position thereafter.
      pauseFromCrossTab()
    },
    onPositionUpdate: (ev) => {
      // Mirror peer's currentVerse so a passive UI in another tab still
      // reflects state. Skip when we're playing/loading — our own ticks
      // are authoritative for the active tab.
      if (audioState.status === 'playing' || audioState.status === 'loading') { return }
      if (audioState.reciter !== ev.reciter || audioState.surah !== ev.surah) { return }
      audioState.currentVerse = `${ev.surah}:${ev.ayah}` as `${number}:${number}`
      audioState.positionMs = ev.positionMs
    },
  })

  return () => {
    cleanupHighlight()
    cleanupAutoScroll()
  }
}
