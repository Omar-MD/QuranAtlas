# Performance — Core Checklist

**Weight: 4** | **Version: 2** | **Items: 22**

## Must-Check Items

> **Not-assessable rule:** If a module referenced by a checklist item does not exist in the codebase, mark the item as `not-assessable` with evidence: "Module not yet implemented (Phase N)". Not-assessable items are excluded from the score denominator.

1. **First verse visible** — First verse appears in DOM within 800ms on 4x CPU throttle (mobile simulation). Measured with `performance.mark()`. Skeleton loader displays during fetch (Story 1 Q1: 3s skeleton → content).
   - Check: `reader/index.js` — `init()` to first verse in DOM
   - Verify: Both short surahs and Al-Baqarah meet the 800ms target. Al-Baqarah first 50-verse chunk renders in ≤ 500ms (Story 2 spec)

2. **Chunked rendering** — Verses render in fixed 50-verse chunks (Story 2 Grill-Me Q7). Next chunk appends when user scrolls within one viewport height of the bottom.
   - Check: `reader/index.js` — `CHUNK_SIZE` equals 50, chunk render loop
   - Verify: `requestAnimationFrame` throttling prevents jank. Chunk size is not configurable or variable

3. **DOM batching** — Verse chunk rendering uses `DocumentFragment` or equivalent to batch DOM insertions. No per-verse `appendChild` in loop.
   - Check: `reader/index.js:130-168` — `renderVerseChunk`
   - Verify: Single DOM insertion per chunk, not 50+ individual insertions

4. **Scroll append efficiency** — `handleScrollAppend` does NOT query all verses in DOM on every scroll. New elements tracked during creation.
   - Check: `reader/index.js:222` — `querySelectorAll('[data-verse]')` usage
   - Verify: O(1) element tracking, not O(n) DOM query

5. **Content visibility** — Off-screen verses use `content-visibility: auto` or equivalent to skip rendering. Browser does not layout invisible content.
   - Check: CSS for verse elements
   - Verify: `content-visibility: auto` with appropriate `contain-intrinsic-size`

6. **Code splitting** — Vite `manualChunks` correctly splits features. Reader chunk does not include nav, marks, review, settings, or about code.
   - Check: `vite.config.js` — `manualChunks` configuration
   - Verify: Each chunk < 150KB gzip (checked by `scripts/check-chunks.js`)

7. **IndexedDB query efficiency** — `getMostRecentPosition()` uses index or cursor, not `getAll()` + JS reduce. Queries scale with data size.
   - Check: `core/db.js:148-171` — position retrieval
   - Verify: Index on `savedAt` or equivalent for O(1) lookup

8. **Non-blocking init** — `reader/index.js::init()` has a single blocking call (`getSurah()`). No secondary blocking fetches delay first render. Skeleton loader displays during the fetch (Story 1 Q1: 3s skeleton, Q13: 5s hard timeout → error + retry).
   - Check: `reader/index.js` — only one awaited data call in init path
   - Verify: No `Promise.all` combining multiple independent fetches. Skeleton → content transition is clean

9. **Memory management** — Event listeners cleaned up on route change. No memory leaks from scroll observers, event subscriptions, or IntersectionObservers.
   - Check: All `cleanup()` / `destroy()` / `unobserve()` functions
   - Verify: Re-navigating to same surah does not double-subscribe

10. **Dataset fetch caching** — Surah data cached after first fetch. Translation toggle re-renders from memory, not re-fetches from network.
    - Check: `reader/index.js` — translation toggle logic
    - Verify: In-memory cache prevents redundant network requests

11. **Search filter response** — `nav/index.js` surah list filter completes in ≤ 50ms. Synchronous filtering of 114 surahs (Story 3 spec, product-info.md).
    - Check: `nav/index.js` — filter function is synchronous, no async or debounced fetch
    - Verify: Typing in search input produces filtered results within 50ms. No network calls during filter

12. **Mark persist latency** — IDB write for mark save/delete completes in < 200ms (Story 4 spec, product-info.md).
    - Check: `marks/store.js` — IDB transaction for save/delete
    - Verify: Single IDB transaction per mark operation. No unnecessary reads before write

13. **Review Hub render time** — Hub initial render with 30 marks completes in ≤ 300ms (Story 5 spec). Pagination loads next 30 without full re-render.
    - Check: `review/hub.js` — initial render path, "Load more" append path
    - Verify: "Load more" appends DOM elements, does not re-render existing marks

14. **visibilitychange re-read latency** — Tab returning to visible state re-reads and renders 30 marks in ≤ 300ms (Story 6 spec, product-info.md).
    - Check: All modules with `visibilitychange` listeners — re-read path
    - Verify: Re-read fetches only displayed data, not full IDB dump

15. **Dataset update check latency** — `checkForUpdate()` manifest fetch + IDB read + version compare completes in ≤ 200ms excluding network download time (Story 8 spec, product-info.md).
    - Check: `data/dataset-updater.js` — check path
    - Verify: No unnecessary IDB reads or cache operations during version comparison

16. **Theme switch latency** — Theme change applies instantly via CSS variable update only (Story 9 spec). No DOM rebuild, no IDB read in the critical path.
    - Check: `settings/theme.js` — `setTheme()` path
    - Verify: IDB write is fire-and-forget, CSS update is synchronous

17. **No layout thrashing** — No read-then-write DOM patterns in loops (e.g., reading `offsetHeight` then setting `style.height` repeatedly). All DOM reads batched before writes.
    - Check: `reader/index.js` render loops, `nav/index.js` surah list rendering, `review/hub.js` mark list rendering
    - Verify: No forced synchronous layout (style recalc) inside loops. Use `requestAnimationFrame` for batched writes after reads

18. **Bundle size budget** — Total production bundle (all chunks combined) stays within a defined ceiling. Individual feature chunks stay under 150KB gzip (enforced by `scripts/check-chunks.js`). Core chunk (app shell) is as small as possible for fast first load.
    - Check: `pnpm build` output sizes, `scripts/check-chunks.js` output
    - Verify: No accidental dependency bloat (e.g., a utility library pulled into the core chunk). Tree-shaking is effective — no dead library code in output

19. **Resource loading strategy** — Critical resources (app shell CSS, core JS) are preloaded. Feature chunks are lazy-loaded on route navigation. Fonts use `font-display: swap` to avoid invisible text during load.
    - Check: `index.html` — `<link rel="preload">` for critical assets. `vite.config.js` — dynamic imports for route modules
    - Verify: Feature modules (`marks/`, `review/`, `settings/`, `about/`) are separate chunks loaded on demand, not bundled into the initial payload

20. **No synchronous IDB on critical path** — All IndexedDB operations are async and never block the main thread during rendering. No `IDBTransaction` results awaited in a render loop.
    - Check: All IDB calls in `reader/index.js::init()`, `nav/index.js::init()` — verify they don't block DOM painting
    - Verify: IDB reads happen before or after render, never interleaved with DOM operations

21. **CSS selector efficiency** — No universal selectors (`*`), deep descendant selectors, or attribute selectors in hot rendering paths. Verse and mark indicator selectors are class-based or data-attribute-based with minimal specificity.
    - Check: `core/theme.css`, verse element styles, mark indicator styles
    - Verify: Selectors are flat (1-2 levels max). No selector matches require full DOM traversal

22. **Animation and transition performance** — Nav panel slide, modal open/close, and any visual transitions use `transform`/`opacity` only (GPU-composited properties). No transitions on `width`, `height`, `top`, `left`, or `margin`.
    - Check: CSS transitions and animations across all features
    - Verify: Nav panel uses `transform: translateX()` for slide. Modal uses `opacity` for fade. No layout-triggering animations
