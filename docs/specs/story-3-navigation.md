# Story 3: Navigation

**Phase:** 1 (P1)
**Priority:** P1
**Depends on:** Story 2 (continuous reader)

---

## Summary

User navigates to any surah, juz, or specific verse via a navigation surface with tabbed interface.

## Functional Requirements

### FR-007: Navigation surface

- Three tabs: Surah, Juz, Verse
- Last-used tab remembered in IDB `settings` store
- **Surah tab:** List of 114 surahs with Arabic name, transliterated name, verse count, revelation type (Meccan/Medinan). Tap navigates to surah:1.
- **Juz tab:** List of 30 juz with start position (surah:ayah). Tap navigates to juz start.
- **Verse tab:** Two inputs: surah number (1-114), ayah number (1-N). Go button navigates to exact verse.

### FR-008: Review-aware navigation limits

- Verse tab ayah input max is bounded by the selected surah's verse count (from `surahs.json`)
- Invalid input shows inline validation error (not a modal/alert)

### FR-020: Deep-link resolution

- Routes: `#/s/{surah}` and `#/s/{surah}/{ayah}`
- Opening a deep link navigates directly to the specified verse
- Invalid surah (< 1 or > 114) or ayah (< 1 or > max) falls back to last saved position
- Validation via `src/safety/input-validator.js`

## Acceptance Criteria

- [ ] All 114 surahs listed with correct Arabic names, verse counts, and types
- [ ] Tapping a surah scrolls reader to that surah's first verse
- [ ] All 30 juz listed with correct start positions
- [ ] Tapping a juz scrolls reader to the juz start verse
- [ ] Verse tab: entering surah 2, ayah 255 navigates to Ayat al-Kursi
- [ ] Verse tab: entering surah 2, ayah 300 (> 286) shows validation error
- [ ] Deep link `#/s/2/255` opens directly to 2:255
- [ ] Deep link `#/s/999` falls back to saved position
- [ ] Last-used tab persists across reload
- [ ] Surah/verse jump completes in < 500 ms (4x CPU throttle, warm cache)
- [ ] Deep-link resolve completes in < 500 ms

## Data Dependencies

- Metadata: `surahs.json`, `juz.json`
- IDB stores: `settings` (last tab), `positions` (fallback for invalid deep links)
- Router: hash routes `#/s/{surah}`, `#/s/{surah}/{ayah}`
- Events: `navigation:jump`
