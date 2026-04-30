// Bridge for the full-overlay audio player. Open/close affordance lives
// here; play/pause/seek live in `audio/player-runtime.ts` (single
// runtime, multiple UI consumers — overlay + mini-bar + long-press
// menu).
//
// The bridge is a thin createOverlayBridge consumer; AudioFullOverlay
// registers its open/close/isOpen API on mount.

import { createOverlayBridge, type BaseOverlayAPI } from '../core/persistent-overlay'

export interface AudioOverlayAPI extends BaseOverlayAPI {
  /** Optional hook to scroll the overlay's contents (used by the
   *  long-press menu's "Play from here" to focus the now-playing card). */
  focusNowPlaying?(): void
}

export const audioPlayerBridge = createOverlayBridge<AudioOverlayAPI>({
  name: 'audio-player',
})
