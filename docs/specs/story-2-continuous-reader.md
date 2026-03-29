# Story 2: Continuous reader + session restore

**Phase:** 1 (P1)
**Priority:** P1
**Depends on:** Story 1 (online reading + PWA)
**Blocks:** Story 3 (navigation)

---

## Summary

User reads the Quran in a continuous scroll across surah boundaries. Reading position is persisted and restored on relaunch. Basmala, closing dua, and sajda markers are rendered according to canonical rules.

## Functional Requirements

### FR-005: Continuous reading

- Scrolling past the last verse of surah N loads surah N+1 seamlessly
- Scrolling above the first verse of surah N loads surah N-1
- Verse-step controls (next/previous verse) available via tap targets on verse numbers
- Reading position (surah + ayah) persisted to IDB `positions` store (key: `"main"`) on scroll debounce (500 ms)

### FR-009: Canonical content presentation

- **Basmala (surahs 2-114 except 9):** Rendered as non-interactive centered header before verse 1; type: `prefix`; no verse key, no mark tap target
- **Basmala (surah 1):** This IS verse 1:1; normal verse card with mark eligibility; type: `counted`
- **Basmala (surah 9):** No basmala element rendered; type: `none`
- **Basmala in 27:30:** Regular verse text within the verse; not a separate basmala annotation
- **Closing dua:** Non-canonical text from `annotations.json`; rendered after surah 114; named reader state with no verse key and no mark tap target
- **Sajda markers:** Visual indicator on the 15 sajda verses (positions from `annotations.json`)

### FR-006: Orientation cue

- Persistent surah name + juz indicator visible while reading (e.g., "Al-Baqarah | Juz 1")
- Updates as user scrolls across surah/juz boundaries
- Translation shown inline by default (togglable via FR-025)

### FR-025: Translation display

- Translation text (English) displayed below Arabic text in each verse card
- Toggle to hide/show translation available from reading view
- Toggle state persisted in IDB `settings` store
- When hidden: only Arabic text shown; verse card height adjusts

### FR-005b: Session restore

- On app launch: read `positions.main` from IDB; scroll to exact verse
- If position is closing dua state: restore that state
- If no saved position: default to 1:1

## Acceptance Criteria

- [ ] Scrolling from surah 1 verse 7 continues to surah 2 verse 1 without manual navigation
- [ ] Scrolling up from surah 2 verse 1 shows surah 1
- [ ] Reading position persists across page reload (close tab, reopen = same verse visible)
- [ ] Basmala rules verified for surahs 1 (counted), 2 (prefix), 9 (none), 27 (verse 30 contains bismillah text)
- [ ] Closing dua renders after 114:6; has no verse key; not tappable for marks
- [ ] Sajda markers visible on all 15 sajda verses
- [ ] Orientation cue updates when scrolling from one surah to the next
- [ ] Translation toggle hides/shows English text; state persists across reload
- [ ] First verse render < 800 ms (4x CPU throttle, warm cache) measured via `performance.mark('first-verse-render')`
- [ ] Adjacent surah prefetched in `requestIdleCallback` after current surah renders
- [ ] Arabic font >= 20 CSS px, line-height >= 1.8x
- [ ] Touch targets on verse numbers >= 44x44 CSS px

## Data Dependencies

- IDB stores: `positions` (key: `"main"`), `settings` (translation toggle)
- Cache: per-surah JSON files from `quran-dataset-v1`
- Metadata: `surahs.json`, `juz.json`, `annotations.json`
- Events: `reader:scroll`, `reader:position-changed`, `reader:surah-boundary`

## Out of Scope

- Navigation surface / surah picker (Story 3)
- Verse marking (Story 4)
- Themes (Story 9)
