---
surface: listen
src_paths:
  - 'src/audio/**'
owns_stores:
  - audioPosition
test_paths:
  unit:
    - 'tests/unit/audio/**'
  e2e:
    - 'tests/e2e/journey-h-audio*.spec.js'
    - 'tests/e2e/journey-j-audio*.spec.js'
---

# Surface: listen

> Audio recitation. Single global `<audio>` element + IDB position store + cross-tab gating + media-session + mini-bar + full-overlay + reader verse-tick highlight + smart-defer autoscroll. Future ship-blocking work (reciter dataset, settings UI surfaces, A-B loop, "Play from here" entry, e2e specs) tracked in `roadmap.md` §Listen.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| (Future) Settings → Sources reciter picker | tap | open reciter list |
| (Future) Reader long-press menu → "Play from here" | gesture | start playback at long-pressed verse |
| Mini-bar tap | tap | open `AudioFullOverlay` via `audioPlayerBridge.api.open()` |
| Full overlay close button | tap | collapse to mini-bar |
| Lock-screen / Bluetooth media controls | hardware | drive `player-runtime.ts::resume / pause / next / prev / seekto` |
| Cross-tab `audio.playback` broadcast | passive | other tab's player pauses; this tab continues |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/audio/AudioFullOverlay.svelte` | _(no leading comment)_ |
| `src/audio/AudioMiniBar.svelte` | _(no leading comment)_ |
| `src/audio/cross-tab.ts` | Cross-tab playback gating + position sync. Newest-press-wins via |
| `src/audio/init.ts` | Audio init: wires settings load, cross-tab gating, reader integration. |
| `src/audio/media-session.ts` | navigator.mediaSession wiring. Lock-screen / Bluetooth headset / car |
| `src/audio/player-bridge.ts` | Bridge for the full-overlay audio player. Open/close affordance lives |
| `src/audio/player-runtime.ts` | Heart of the audio player: imperative play/pause/seek/setReciter against |
| `src/audio/state-position.svelte.ts` | Sole writer for the `audioPosition` IDB store. Per data-model.md |
| `src/audio/state.svelte.ts` | Sole writer for the audio runes + owner of the single global <audio> |
| `src/audio/timing-loader.ts` | Loads + caches per-(reciter, surah) word-level timing JSON. Word-level |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Resume recent playback (J1)

1. Mini-bar hidden (status `idle`) until user explicitly resumes — no ambient audio on cold boot.
2. User opens audio entry (future Settings UI / command-sheet entry) → `play()` no-target → `loadMostRecent()` returns surah / reciter / verse / position-ms → `<audio>` loads `/dataset/audio/{reciter}/{NNN}.mp3`, seeks, plays.
3. Mini-bar surfaces at bottom of reader showing surah, reciter, verse.
4. Reader's currently-playing verse gains `.qa-verse-active` background tint via `[data-token-key^="{S}:{V}"]` selector.

### Mini-bar + full overlay (J2)

Mini-bar pinned bottom-of-reader while audio non-idle. Tap mini-bar → opens `AudioFullOverlay` via `audioPlayerBridge.api.open()`. Full overlay shows surah / reciter / verse meta, scrubber, transport (prev / play-pause / next / stop). Adjustments call into `audio/player-runtime.ts`. Close button collapses back to mini-bar.

### Smart-defer auto-scroll (J3)

Audio plays; `audio:verse-changed` fires on each ayah boundary (via timing JSON). With `audioAutoScrollMode = 'smart'` (default), `reader/audio-autoscroll.ts` scrolls playing verse into view UNLESS user has manually scrolled in last 5 s. Manual scroll → autoscroll yields for 5 s. After 5 s of no manual scroll, autoscroll resumes.

### Cross-tab takeover (J4)

1. Tab A playing audio. User opens Tab B and presses play.
2. Tab B emits `broadcast('audio.playback', { kind: 'started', tabId: B, ... })`.
3. Tab A's `initCrossTab` receiver sees `tabId !== self.tabId` → calls `pauseFromCrossTab()` → `<audio>` pauses, mini-bar status flips to `paused`.
4. Tab A's pause writes `audioPosition` to IDB. Tab B reads `max(lastPlayedAt)` when its own `play()` resolves → starts at position Tab A just wrote (soft sync handoff).

### Lock-screen / Bluetooth controls (J5)

`audio/media-session.ts::registerActionHandlers` wires all seven media actions (play / pause / prev / next / seekback / seekfwd / seekto). User locks phone → lock screen shows track metadata (surah label · reciter · "QuranAtlas" album · static brand artwork). Lock-screen play/pause + headset multifunction button drive `player-runtime.ts::resume / pause`.

Track metadata updates only on surah-change or reciter-change (not on every verse, to avoid lock-screen flicker).

### SW per-reciter cache partition

`/dataset/audio/{reciter}/{NNN}.mp3` routes to `qa-audio-{reciter}-v1` cache namespace (CacheFirst). `cleanupStaleCaches` in `sw-handlers.js` preserves `qa-audio-*` and `qa-fonts-*` caches by prefix.

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `audioPosition`
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

### `audioPosition` store body

DB v6. Per (reciter, surah) playback position record + `lastPlayedAt` timestamp. `loadMostRecent()` queries `max(lastPlayedAt)` to resume the most-recently-touched session on cold boot.

```ts
{
  id: string,            // '{reciter}:{surah}', e.g. 'alafasy:36'
  reciter: string,
  surah: number,
  verse: number,         // last-played verse (from timing JSON match)
  positionMs: number,    // currentTime in ms
  lastPlayedAt: number,
}
```

Sole writer: `src/audio/player-runtime.ts` (and `state/audio.svelte.ts` for cross-tab pause).

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| `audio:ended` | `Events.AUDIO_ENDED` | `src/audio/player-runtime.ts:116` |
| `audio:error` | `Events.AUDIO_ERROR` | `src/audio/player-runtime.ts:121`, `src/audio/player-runtime.ts:161`, `src/audio/player-runtime.ts:168` |
| `audio:paused` | `Events.AUDIO_PAUSED` | `src/audio/player-runtime.ts:109` |
| `audio:started` | `Events.AUDIO_STARTED` | `src/audio/player-runtime.ts:103` |
| `audio:verse-changed` | `Events.AUDIO_VERSE_CHANGED` | `src/audio/player-runtime.ts:79` |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| _(none)_ | | |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- **`AudioMiniBar` visible iff `audioState.status !== 'idle'`.** No ambient audio on cold boot.
- **Single global `<audio>` element owned by `state/audio.svelte.ts::getOrCreateAudioElement()` — never duplicated.**
- **Verse highlight uses `[data-token-key^="{S}:{V}"]`,** not `data-verse-key` (audio's contract is verse-grain via `core/tokenisable.ts`; picks up word-level spans automatically when WBW lands).
- **Track metadata updates on surah-change or reciter-change only,** never per-verse. Per-verse updates flicker lock-screen on iOS Safari.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (3):**

- `tests/unit/audio/audio-position.test.ts`
- `tests/unit/audio/cross-tab.test.ts`
- `tests/unit/audio/timing-loader.test.ts`

**E2E (0):**

_(none)_
<!-- AUTO-GENERATED:tests END -->

