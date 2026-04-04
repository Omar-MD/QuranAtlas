---
issue: 2
title: "Story 2: Continuous Reader & Session Restore"
state: OPEN
---

## Problem Statement

After reading for a while, a user closes the app or navigates away. When they return hours or days later, they face two problems: (1) they cannot remember which surah they were reading, let alone which verse, and (2) even if they navigate back to the surah, they must scroll to find their place again. The reading experience is fragmented — every session starts from scratch. Additionally, rendering a large surah (Al-Baqarah has 286 verses) in a single DOM operation is slow on a mobile device with 4× CPU throttle, blocking the reader.

## Solution

The app tracks the reader's position continuously: as they scroll, the app detects which verse is at the center of the viewport and saves it efficiently (debounced, every ~1 second of active scrolling). This position is stored per-surah in IDB (`positions` store) and persists across sessions. On app launch, if the user has no explicit navigation hash, the router restores them to their last-read surah and verse. The `reader/` module implements virtual scrolling: only verses within ~500px of the viewport are rendered in the DOM, and verses are destroyed and re-created as the user scrolls — this keeps memory low and render times fast on throttled mobile devices. A "Resume reading" indicator appears at the top of the surah, showing the last-read verse and offering a one-tap jump.

## User Stories

**Session Restore**

1. As a returning user who was reading Al-Baqarah verse 100, I want the app to open to that exact verse, so that I can immediately continue where I left off without navigating.
2. As a user, I want the app to remember my reading position in each surah independently, so that I can jump between surahs without losing my place in each.
3. As a user who reads for 10 minutes and then closes the app, I want my reading position saved automatically, so that I don't have to manually bookmark it.
4. As a user who accidentally closed a tab mid-reading, I want to see a "Resume reading: Al-Baqarah 100" button at the top of the surah list or when I open the previous surah, so that I can jump back to my exact position.
5. As a user, I want the resume indicator to disappear after I dismiss it or navigate past the saved verse, so that it doesn't clutter the UI permanently.

**Continuous Reading**

6. As a reader scrolling through a long surah like Al-Baqarah (286 verses), I want the app to render smoothly without lag, so that I can scroll at my natural reading pace.
7. As a reader, I want verses to be clearly spaced on the screen so I can read them comfortably, with appropriate line heights and margins.
8. As a reader, I want the Arabic and English text to be aligned logically—Arabic right-aligned, English left-aligned—so that reading feels natural in both directions.
9. As a reader with the translation toggled off, I want only the Arabic text to render, so that I can focus on the text and reduce screen clutter.
10. As a reader at the bottom of a surah, I want a clear visual indication that I've reached the end, so that I know when to switch to the next surah.
11. As a reader on a mobile device with limited viewport height, I want multiple verses visible at once (not just one), so that I can read in a natural, flowing manner.

**Position Tracking & Affordances**

12. As a user, I want the app to automatically save my reading position every 1–2 seconds as I scroll, so that position loss is minimized if the app crashes or is killed.
13. As a user reading while moving (on public transport), I want a gentle visual or haptic indicator showing me which verse I am "currently reading" (center of viewport), so that I stay oriented.
14. As a user who wants to jump to a specific verse within the current surah, I want to be able to tap a verse number and have the app scroll to that verse, so that I can navigate without leaving the surah.
15. As a user who navigates to a new surah intentionally (e.g., via the nav menu), I want that surah to open at the top, not at a previous reading position, so that I can explore without being locked to a saved position.
16. As a developer, I want the scroll tracking logic to be decoupled from the rendering logic, so that I can improve one without breaking the other.

> **Multi-Tab Coordination (Stories 17–19 removed):** The primary/secondary tab model and "Switch to main tab" hint are superseded by Story 6 (Issue #6). Tabs are peers — each saves reading position independently per-surah (last-write-wins). No `localStorage` is used. Story 2 implements no multi-tab coordination; Story 6 owns all cross-tab sync via BroadcastChannel.

## Implementation Decisions

**Modules to extend/build:**

- **`reader/`** (extend from Story 1) — Add virtual scrolling implementation and position tracking. Exports `async init(params, { savePosition = true })` to allow callers to disable auto-save (e.g. for preview/explore flows in Story 3). Maintains a scroll listener that fires on every scroll event, debounced to once per 1s of silence. On each debounce, calculates the center-viewport verse and calls a `savePosition(surah, verse)` function. Renders only verses within ~500px above/below viewport; outside that, removes DOM nodes and replaces with spacer elements to preserve layout. Emits `reader:position-changed` with `{ surah, verse }` after position is saved.

- **`router/`** (extend from Phase 0) — On startup, if the hash is empty (bare `#` or `#/`), check the `positions` IDB store for the most-recently-used surah key and navigate to `#/s/{surah}/{verse}` instead of the default. This ensures launch restore happens before `reader/init()` is called. Also update `navigate()` to accept a `skipHistoryRestore` flag so intentional navigation to a new surah starts at the top.

**Deep modules:**

- **`scroll-tracker/`** (new utility, internal to `reader/`) — Encapsulates the scroll position calculation and debouncing logic. Exports `observeScroll(element, { onPositionChange })` and `unobserve()`. Maintains a `ResizeObserver` and `IntersectionObserver` to detect which verse is at the center of the viewport. Debounces `onPositionChange()` calls to once per 1s of inactivity. Tests should verify that position updates fire at the correct granularity and that clearing observers does not leak event listeners.

- **`virtual-scroll/`** (new utility, internal to `reader/`) — Manages DOM virtualization. Exports `createVirtualScroller(container, { renderVerse, totalVerses })` returning `{ render(), updateScroll(), destroy() }`. Internally maintains a Map of `verse -> DOM element`, querying `renderVerse(verseIdx)` to create new elements on demand. On scroll, calculates visible range and removes elements outside `range ± 500px` buffer. Tests should verify that inserting 286 verses does not create all 286 DOM nodes upfront, and that removing verses reclaims memory.

**Architectural decisions:**

- Position tracking is separate from rendering. `scroll-tracker/` knows nothing about DOM or verse content; `virtual-scroll/` knows nothing about IDB or position history. Both are used by `reader/` but never call each other.
- The `positions` IDB store schema (from Phase 0) has key `id` which can be `"s{surah}"` (e.g. `"s2"` for Al-Baqarah) and value `{ surah: 2, verse: 100, savedAt: timestamp }`. Callers read/write via `getDb().put('positions', { surah: 2, verse: 100, savedAt: Date.now() })`.
- Virtual scrolling uses spacer elements: when verse 50 is below the buffer, insert a `<div style="height: Xpx"></div>` to preserve scroll position without rendering the verse. This maintains scrollbar thumb position as the user scrolls.
- Resume indicator: placed at the top of `#main-content` if the user is not already at the saved position. Shows "Resume reading: Al-Baqarah 100" with a "Jump" button and a dismissal ×. Dismissed state is not persisted — it reappears on the next surah visit or page reload.
- **Multi-tab:** No coordination in Story 2. Tabs are peers — each saves per-surah position independently. Last-write-wins. No `localStorage`, no `BroadcastChannel` in this story. Cross-tab mark sync is owned by Story 6 (Issue #6).

**Performance targets:**

- Virtual scroll: rendering Al-Baqarah (286 verses) on startup ≤ 500ms. This includes DOM creation for the visible 15–20 verses + spacers.
- Scroll debounce: position updates fire at most once per 1s of active scrolling.
- Position save: each IDB write ≤ 50ms (single-record put).
- Memory: virtual-scroll container with 286 verses should never exceed 5 MB of JS heap for DOM + data structures.

**Testing decisions:**

- **`scroll-tracker/`** — Unit test with jsdom. Create a mock scrollable container with sentinel elements at offsets. Trigger scroll events and verify that `onPositionChange()` fires with the correct verse. Test debouncing: fire 10 scroll events rapidly, verify callback fires once after 1s of silence. Prior art: none yet.
- **`virtual-scroll/`** — Unit test with jsdom. Create 100 verses, render into a container, simulate scroll events, verify that only ~20 DOM elements exist at any time (not 100). Test edge cases: scroll to top, scroll to bottom, rapid back-and-forth scrolling. Verify spacer heights are correct.
- **`reader/`** — Integration test with a mock dataset. Simulate scrolling through 3 surahs, verify `positions` IDB store is updated correctly after debounce period. Verify resume indicator appears and disappears. Test launch restore: pre-populate `positions` IDB, call `router.navigate()` with empty hash, verify the router navigates to the saved position.

## Out of Scope

- Surah and Juz navigation / browsing UI (Story 3)
- Verse marks and tagging (Story 4)
- Review hub (Story 5)
- Cross-tab synchronization — fully owned by Story 6 (Issue #6)
- Dataset update / version check (Story 8)
- Settings page, theme, font size (Story 9)
- Audio, transliteration, full-text search — permanently out of scope

## Further Notes

- The Bridges' Translation must be displayed accurately according to its license — verify right-to-left and left-to-right layout logic is correct during testing.
- Virtual scrolling is a performance-critical feature. Measure heap usage and scroll frame rate (target 60 fps) on a simulated 4× CPU throttle during QA.
- The `resume-indicator` UI should be dismissible without saving state, so it can reappear on subsequent visits. This is intentional — it's a persistent hint, not a per-session flag.

## Grill-Me Decisions (20 locked)

| Q   | Decision                                     | Choice                                                                                                                                                                   |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Spacer height calculation                    | Hybrid: fixed initially, measure & update retroactively                                                                                                                  |
| 2   | Debounce during navigation                   | Let pending debounce fire; don't cancel                                                                                                                                  |
| 3   | Position restore: intentional nav vs. launch | Restore ONLY on app launch (empty hash); intentional nav starts at v1                                                                                                    |
| 4   | Resume indicator dismiss & reappear          | Dismiss (×): hidden until next launch. Jump: auto-hides after scroll                                                                                                     |
| 5   | Multi-tab primary race condition             | ~~Compare-and-set: write ID, read back, verify match~~ **Superseded by Story 6 (Issue #6) — no primary/secondary model. Tabs are peers.**                                |
| 6   | BroadcastChannel timing                      | ~~Story 2: localStorage only. Story 6: replace with BroadcastChannel~~ **Superseded by Story 6 — Story 2 implements no multi-tab coordination. No `localStorage` used.** |
| 7   | Virtual-scroll Map cleanup                   | Explicit delete on verse removal + full clear on surah change                                                                                                            |
| 8   | Scroll to saved position                     | Instant scroll (no animation)                                                                                                                                            |
| 9   | Position tracking listener                   | IntersectionObserver (not raw scroll listener)                                                                                                                           |
| 10  | IntersectionObserver root margin             | Precise center-band detection (±390px)                                                                                                                                   |
| 11  | Initial render strategy                      | Render visible band around saved verse (~20 verses)                                                                                                                      |
| 12  | Race: scroll during initial render           | Disable listener during init with `rendering` flag                                                                                                                       |
| 13  | Rapid surah navigation                       | Independent debounces per surah (IDB writes unordered, per-key)                                                                                                          |
| 14  | Resume indicator layout                      | Inline at top, scrolls off. Jump: instant disappear                                                                                                                      |
| 15  | Virtual-scroll gaps on scroll-back           | Re-render fallback + generous buffer (±750px)                                                                                                                            |
| 16  | Short surah position tracking                | Save last verse if surah fully visible & scrolled past                                                                                                                   |
| 17  | Browser back button                          | history.pushState per navigation (hash includes verse)                                                                                                                   |
| 18  | Memory accumulation                          | Destroy old Map on surah change; memory plateaus at ~500KB                                                                                                               |
| 19  | Viewport resize (rotation)                   | Listen to resize; recalculate spacer heights lazily                                                                                                                      |
| 20  | Background/foreground tracking               | Unsubscribe listener on background; stay at position on foreground                                                                                                       |
