---
issue: 3
title: "Story 3: Navigation (Surah & Juz Browsing)"
state: OPEN
---

## Problem Statement

A user wants to jump to a specific surah or juz. Today, they have no way to browse the 114 surahs beyond manually scrolling through the app. If they know they want "Surah Al-Baqarah" or "Juz 10," they have no quick way to find it. The nav panel exists in the HTML skeleton but is empty. Additionally, if they want to jump to a specific verse like "Al-Baqarah 255," there is no way to reference it other than navigating to the surah and scrolling. The app lacks a navigational spine.

## Solution

The `navigation/` module builds a tabbed nav panel (Surahs | Juz) that slides in from the left edge on hamburger tap or right-edge swipe. The Surahs tab shows all 114 surahs with Arabic names, transliterations, and verse counts. The Juz tab shows the 30 juz with their starting surahs. A live-filter search input lets users type "Ba" to find "Al-Baqarah" or "2:255" to jump to a specific verse. The current surah (from Story 2 position tracking) is highlighted with a subtle left accent bar and auto-scrolls into view. Tapping a surah navigates the reader there; on mobile, the nav closes; on tablet/desktop, it stays open. The `safety/input-validator.js` module parses user input safely: "2:255", "Baqarah 255", or surah names are validated before routing. Deep links like `#/s/2/255` are routed directly to the verse.

## User Stories

**Navigation UI**

1. As a user, I want to tap a hamburger button to open a navigation panel, so that I can browse the Quran structure.
2. As a user, I want to swipe from the left edge of the screen rightward to open the navigation panel, so that I can navigate without tapping a button.
3. As a user, I want to see a list of all 114 surahs with their Arabic names, transliterations, and verse counts, so that I can understand the structure of the Quran.
4. As a user, I want to see a separate tab showing the 30 juz with their starting surahs (e.g. "Juz 1: Al-Fatiha"), so that I can navigate by juz instead of surah.
5. As a user reading Al-Baqarah, I want the current surah to be visually highlighted in the surah list, so that I know where I am in the Quran.
6. As a user, I want the current surah to be automatically scrolled into view in the nav list, so that I don't have to hunt for it.
7. As a user on a phone, I want the nav panel to close automatically after I select a surah, so that I can start reading immediately.
8. As a user on a tablet or desktop, I want the nav panel to stay open after I select a surah, so that I can browse and compare multiple surahs without closing and reopening nav.
9. As a user, I want to close the nav panel by tapping outside it or swiping back toward the left, so that I can dismiss it without a button.

**Search & Deep Links**

10. As a user, I want to type "ba" in a search box and see the surah list filter to show only "Al-Baqarah", so that I can quickly find a surah by name.
11. As a user, I want to type "2:255" in the search box and press Enter to jump directly to Al-Baqarah verse 255, so that I can reference specific verses without manual browsing.
12. As a user, I want to type "Baqarah 100" (surah name + verse number) and jump to that verse, so that natural language input works alongside numeric input.
13. As a user who shares a verse reference like "#/s/2/255" with a friend, I want my friend to be able to open that link and land directly on Al-Baqarah verse 255, so that verses are shareable and linkable.
14. As a user who mistakenly types "2:300" (invalid verse in Al-Baqarah, which has only 286 verses), I want the search input to highlight in red and refuse to navigate, so that I understand the input is invalid without navigating to a wrong place.
15. As a user, I want typos like "2:25a" to be caught and rejected, so that invalid input doesn't break the app.

**Navigation State & Accessibility**

16. As a screen reader user, I want the nav panel to be properly labelled (role="navigation") and for each surah/juz to be a proper link, so that navigation is accessible.
17. As a user, I want keyboard support: Tab to navigate the list, Enter to select, Escape to close nav, so that I can use the app without a mouse.
18. As a user, I want the nav panel to remember which tab (Surahs or Juz) I was last viewing, so that I don't have to re-select the tab every time.

## Implementation Decisions

**Modules to build:**

- **`navigation/`** — Owns the nav panel UI, search input, and navigation dispatch. Exports `async init()` called by the router. On init, fetches the surah list from `dataset/getSurahs()` and juz boundaries from `dataset/getJuz()`. Renders the tabbed nav panel into `#nav-surface`, with a search input at the top. Listens for surah changes via the `reader:position-changed` event to update the current surah highlight. Handles hamburger button clicks and `nav-toggle` button toggle state. Emits `navigation:navigate` events that the router listens to and converts to hash navigation. Maintains viewport auto-scroll via `element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` after the DOM updates with the current surah highlight.

- **`safety/input-validator.js`** (extend from Phase 0) — Already exists per CLAUDE.md as an exception to the no-sibling-imports rule. Exports a `parseNavigationInput(input: string)` function that accepts "2", "2:255", "Al-Baqarah", "Baqarah 255", or a surah number/name and returns `{ surah, verse, valid: boolean, error?: string }`. Uses a safe whitelist of known surah names (from `dataset/`) and validates verse numbers against the surah's ayah count. Returns `{ valid: false, error: "Verse 300 does not exist in Al-Baqarah" }` for invalid input. Never throws; always returns a structured result.

- **`swipe-gesture/`** (new utility, internal to `navigation/`) — Detects right-edge swipe to open nav. Exports `onSwipeRight(callback)` and `offSwipeRight()`. Uses `PointerEvent` (not Touch) for better performance and precision. Requires movement of ≥100px rightward and ≤300ms duration. Only triggers if the swipe starts from `x < 50px` (left edge). Tests should verify that horizontal scrolling does not trigger the gesture, and that rapid successive swipes are debounced.

**Architectural decisions:**

- The search input is always visible at the top of the nav panel. Filtering the surah/juz list happens client-side in `navigation/` — no network calls needed.
- Current surah highlight: listen for `reader:position-changed` (from Story 2) and update the DOM with a `.qa-nav-current` class on the surah element. The CSS applies a left accent bar (subtle, ~3px, accent color). Auto-scroll is immediate (no debounce).
- Juz data: `dataset/getJuz()` returns an array of `{ juzNumber: 1, startingSurah: 1, name: "Al-Fatiha" }` objects. This data is pre-computed at build time from the quran.com API and stored in `public/dataset/juz.json`.
- Deep link routing: the router already parses `#/s/:surah/:verse` (see Phase 0). In this story, the `reader/` module is updated to accept a `:verse` parameter and scroll to that verse on init (Story 2's resume-indicator logic applies: if user is already at that verse, no indicator; if not, show the resume button).
- Input validation happens in real-time: as the user types, the search input validates against the surah list. When they press Enter on a navigation input (e.g., "2:255"), `input-validator.parseNavigationInput()` is called. If valid, emit `navigation:navigate` with the parsed surah/verse. If invalid, set the input's `aria-invalid="true"` and highlight in red; do not navigate.
- Responsive close: on `init()`, check `window.matchMedia('(max-width: 768px)')` to determine if nav should auto-close. This is stored as an instance variable `shouldAutoClose`. After navigation, if `shouldAutoClose`, call `closeNav()` which sets `#nav-surface.hidden = true` and resets `#nav-toggle.aria-expanded = false`.
- Tab memory: store the selected tab name in `localStorage` as `__NAV_ACTIVE_TAB__` (surah | juz). On init, check this key and default to `"surah"` if not found.

**IDB/Storage:**

- No new IDB stores. The `dataset/` module already fetches surah and juz data from `public/dataset/`. `localStorage` is used only for the active tab preference (exception to "no localStorage" rule because it's UI state, not user data).

**Performance targets:**

- Surah list rendering: ≤ 100ms for all 114 items.
- Search filter: ≤ 50ms response time when typing.
- Swipe gesture: ≤ 100ms to open nav after swipe is detected.

**Testing decisions:**

- **`navigation/`** — Integration test with a mock dataset. Render the nav panel, verify Surahs and Juz tabs are present. Type "ba" in the search input, verify only Al-Baqarah remains visible. Simulate `reader:position-changed { surah: 2 }` event, verify the current-surah highlight appears and auto-scrolls into view. Click a surah, verify `navigation:navigate` event is emitted with the correct surah. Test responsive close: set viewport to 500px wide, click a surah, verify nav closes.

- **`input-validator.parseNavigationInput()`** — Unit test with a static surah list. Test inputs: "2" → `{ surah: 2, valid: true }`, "2:255" → `{ surah: 2, verse: 255, valid: true }`, "Baqarah 100" → `{ surah: 2, verse: 100, valid: true }`, "baqarah" (case-insensitive) → `{ surah: 2, valid: true }`, "2:300" (invalid verse) → `{ valid: false, error: "..." }`, "2:25a" (non-numeric) → `{ valid: false, error: "..." }`, "xyz" (unknown surah) → `{ valid: false, error: "..." }`. No async; all results instant.

- **`swipe-gesture/`** — Unit test with PointerEvent simulation. Simulate a pointer down at x=30, move to x=130 within 200ms, verify callback fires. Simulate a horizontal scroll (pointer down, move 500px to the right over 2s), verify callback does NOT fire (duration too long). Simulate swipe from x=100 (not near edge), verify callback does not fire. Test that `offSwipeRight()` removes listeners and no callback fires.

## Out of Scope

- Analytics on which surahs are most visited (Story 9)
- Customizing surah display (order, filtering) — not in scope
- Verse marks UI integration in nav — that's Story 4
- Review hub navigation — Story 5
- Search by keyword in verse content — that's full-text search, permanently out of scope

## Further Notes

- The swipe gesture should not interfere with page scrolling. Use `event.preventDefault()` only after confirming the gesture meets the criteria; early `preventDefault()` will lock the page.
- Surah names in the nav are fetched from `surahs.json` in the dataset, which includes both Arabic and transliterated names. Verify the license allows this display.
- The `#nav-toggle` button should have `aria-expanded` set to reflect the nav's open/closed state. When nav is open, `aria-expanded="true"`; when closed, `aria-expanded="false"`.
- Input validation must reject any input that is not a known surah or verse reference. This is important for security (prevent accidental navigation to malformed hashes) and UX (clear feedback).
- The `localStorage` exception for UI state (`__NAV_ACTIVE_TAB__`) is acceptable per CLAUDE.md's "no localStorage" rule because it's UI preference, not user-generated Quran data. The rule exists to prevent storing marks or settings in localStorage (which is lost on browser clear).

## Grill-Me Decisions (20 locked)

| Q   | Decision                                        | Choice                                                     |
| --- | ----------------------------------------------- | ---------------------------------------------------------- |
| 1   | Search validation timing                        | Real-time: validate & highlight after each keystroke       |
| 2   | Case sensitivity & transliteration              | Case-insensitive, exact transliteration (no fuzzy match)   |
| 3   | Numeric input "2" without verse                 | Valid: navigate to Surah 2 verse 1                         |
| 4   | Misspelled surah name                           | Reject (strict matching, no fuzzy match)                   |
| 5   | Out-of-range verse error                        | Show specific error, don't navigate on Enter               |
| 6   | Edge cases (0, negative, decimal, leading zero) | Strict: integer in [1, ayahCount] only                     |
| 7   | Swipe gesture debouncing                        | State-aware: ignore if nav already open                    |
| 8   | Swipe vs. horizontal scroll conflict            | Detect scroll position first; swipe only if scroll = 0     |
| 9   | Responsive close on resize                      | Listen to resize; auto-close if crossing ≤768px threshold  |
| 10  | Current surah highlight (multi-tab)             | Independent per tab; no BroadcastChannel sync in Story 3   |
| 11  | Deep link verse validation                      | Validate in reader/init(); fall back to verse 1 gracefully |
| 12  | Juz tap behavior                                | Navigate to first verse of that juz                        |
| 13  | Search input after navigation                   | Clear on desktop/tablet; hidden on mobile (nav closes)     |
| 14  | Keyboard tab order                              | Focus lands on highlighted surah; arrow keys navigate      |
| 15  | Escape key                                      | Closes nav panel entirely                                  |
| 16  | aria-expanded timing                            | Update immediately on click (before animation)             |
| 17  | Search filter performance                       | Synchronous (114 surahs, <5ms per filter)                  |
| 18  | Search filter scope                             | Search name (substring) + surah number; not Arabic text    |
| 19  | First-time user highlight                       | Surah 1 by default (provides context)                      |
| 20  | Tab memory persistence                          | Restore from localStorage; persists across sessions        |
