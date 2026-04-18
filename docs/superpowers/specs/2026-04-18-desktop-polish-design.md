# Desktop polish — font scale, mark editor, review hub, onboarding

**Date:** 2026-04-18
**Status:** Approved. Ready for implementation plan.
**Follows:** `2026-04-18-desktop-redesign-design.md` (that plan landed; this fixes the rough edges the user discovered during dogfooding + expands font system + redesigns onboarding for desktop.)

---

## Problems observed

The user walked through the app after the first desktop redesign and flagged:

1. **Font scale is coarse** — only 3 steps (`small=0.875`, `medium=1`, `large=1.15`). The smallest is still too large for some viewports. Quran.com offers 10 steps; we'll add granularity without going that far.
2. **Font size preview in Settings doesn't react to the slider** — CSS hardcodes `font-size: 1rem / 0.8125rem` instead of binding to `--qa-text-size-arabic / --qa-text-size-translation * --qa-font-size-base`.
3. **Font size preview order is wrong** — Arabic is on the left (appended first in LTR parent), translation is on the right. User expects the reverse: translation left, Arabic right.
4. **No keyboard shortcut for font size** — power users expect `⌘↑ / ⌘↓`.
5. **Mark editor desktop layout has dead space** — the 2-col body puts note+label in col 1 and all-tags in col 2. Col 2 is much taller, leaving empty space under the 96px note in col 1.
6. **Review hub rail can't multi-select** — clicking a tag replaces the single filter. No way to ask "show me marks tagged *reflect* OR *gratitude*".
7. **Review hub cards "stick to columns"** — the 2-col card grid wastes space in a reading app; cards are narrow + boxy.
8. **Review hub duplicates multi-tagged marks** — `renderTagGrouped` puts the same mark under every one of its tags. A mark tagged `['reflect', 'gratitude']` renders twice.
9. **FVR header not correctly spaced on desktop** — the 720px header sits inside a full-width `mainContent`, and the cards below have no matching centering.
10. **"Marks sticking to left column" in FVR** — same root cause as #7 (2-col card grid applied universally).
11. **Left rail reportedly rendering twice** in review hub — user observation; not yet reproduced in code; will reproduce empirically in implementation.
12. **Onboarding looks cramped on desktop** — `.qa-onboarding` is capped at `max-width: 420px` with a 2.25rem Arabic brand mark. On a 1440px viewport it reads as a tiny postcard.
13. **Onboarding doesn't teach shortcuts** — users don't discover `⌘K`, `g r / g s / g ,`, long-press, or the new `⌘↑ / ⌘↓` font controls.

---

## Overall architectural shift in the review hub

Before this change, the "Group by" segment did two things at once:
- Changed which bucket list appeared in the rail
- Changed how cards were grouped inside the main area (with headers between groups)

That coupling is what causes duplication (tag grouping duplicates multi-tagged marks) and "cards stuck in a column" visual clutter. This spec decouples the two:

- **Rail = faceted filter.** Shows one of three bucket lists (Tag / Surah / Date). Clicking a row filters the card list. Nothing else.
- **Cards = flat, unique, single-column, sorted by `updatedAt` desc.** Each mark renders exactly once regardless of how many tags it carries. Tags are visible as chips on the card.
- **Multi-select = OR (tag grouping only).** Clicking multiple tag rows accumulates an OR filter. A chip bar above the cards shows active filters with `×` to remove. Surah / Date buckets remain single-select (rare to want "surah 2 OR 67").

`currentState.groupBy` is retained but semantically becomes "which rail bucket list is shown". The old `renderTagGrouped` / `renderGrouped` / `renderFlat` trio collapses into a single `renderCardList(container, marks)`.

---

## Work units

Each unit is independently buildable + verifiable + committable. Playwright verification at **375×667 mobile, 768×1024 tablet, 1440×900 desktop** is required for any unit touching CSS or onboarding.

---

### Unit 1 — Font system expansion

**Files:**
- `src/settings/font-size.js` (modify)
- `src/settings/panel.js` (modify — preview DOM order)
- `src/core/theme.css` (modify — preview CSS binding)
- `src/nav/command-sheet.js` (modify — `bumpFont` + global shortcut handler)
- `tests/unit/settings/font-size.test.js` (create — scale + migration)

**Scope:**

1. **Expand `SCALE`** in `font-size.js`:
   ```js
   const SCALE = { xs: 0.75, sm: 0.875, md: 1.0, lg: 1.15, xl: 1.3 }
   const OPTIONS = ['xs', 'sm', 'md', 'lg', 'xl']
   const DEFAULT_SIZE = 'md'
   ```
2. **IDB backward-compat migration** in `loadFontSize()`: if the stored value is `'small'`, resolve to `'sm'`; `'medium'` → `'md'`; `'large'` → `'lg'`. On resolution, also write the new key back (fire-and-forget) so subsequent loads are clean.
3. **Preview DOM order** in `panel.js:buildFontSection()`: append `enSpan` first, then `arSpan`. The `enSpan.textContent` becomes `'The Most Gracious \u00B7 '` (trailing separator + space); `arSpan.textContent` stays the Arabic phrase. LTR parent → translation on the left.
4. **Preview CSS binding** in `theme.css`:
   ```css
   .qa-font-preview-ar {
     font-family: var(--qa-font-arabic);
     color: var(--qa-ambient-parchment);
     font-size: calc(var(--qa-text-size-arabic) * var(--qa-font-size-base) * 0.7);
     line-height: var(--qa-line-height-arabic);
   }
   .qa-font-preview-en {
     color: var(--qa-ambient-muted);
     font-size: calc(var(--qa-text-size-translation) * var(--qa-font-size-base) * 0.8);
   }
   ```
   (The `* 0.7 / 0.8` scaling keeps the preview physically compact relative to the real reader — it previews *relative* change, not absolute size.)
5. **Keyboard shortcuts** in `command-sheet.js:onKeydown()`:
   - Replace the hardcoded `['small', 'medium', 'large']` in `bumpFont` with `getFontSizeOptions()`.
   - Add a new branch at the top of the outside-sheet flow (after the `⌘K` branch, before the `g`-chord branch):
     ```js
     if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
       if (e.key === 'ArrowUp')   { e.preventDefault(); bumpFont(+1); return }
       if (e.key === 'ArrowDown') { e.preventDefault(); bumpFont(-1); return }
     }
     ```
     The existing input-target guard (skip INPUT/TEXTAREA/SELECT) applies.
   - After `bumpFont` writes, call `announce()` with e.g. `'Font size: large'`.
6. **Unit test** (`font-size.test.js`):
   - `SCALE` has 5 entries in ascending order.
   - `loadFontSize()` returns `'md'` for fresh install, `'sm'` for legacy `'small'`, etc.
   - `setFontSize('invalid')` returns `false`, doesn't write.

**Verification:**
- Settings sheet at desktop: slider has 5 stops; drag end-to-end → Arabic + English preview spans both resize smoothly.
- Open mark editor, reader, about — computed `font-size` on `.qa-verse-arabic` changes proportionally.
- Press `⌘↓` on reader → font shrinks one step + screen reader announces. Press `⌘↑` → grows. Repeat through bounds (should clamp).
- Press `⌘↑` while focused in a textarea → should be a no-op (guard).
- Fresh install in Playwright — stored value starts at `'md'`. Manually seed IDB `{ key: 'fontSize', value: 'medium' }` → reload → applied as `'md'` and rewritten.

---

### Unit 2 — Mark editor column rebalance

**Files:** `src/core/theme.css` only

**Scope:**

Change the `@media (min-width: 1180px)` grid-column assignments inside `.qa-sheet--mark .qa-mark-body`:

- **Col 1 (left):** `.qa-mark-label`, `.qa-mark-note`, `.qa-mark-selected` (the currently-selected tag pills)
- **Col 2 (right):** `.qa-mark-search`, `.qa-mark-all-head`, `.qa-mark-chips--all`

```css
.qa-sheet--mark .qa-mark-body > .qa-mark-label,
.qa-sheet--mark .qa-mark-body > .qa-mark-note,
.qa-sheet--mark .qa-mark-body > .qa-mark-selected     { grid-column: 1; }

.qa-sheet--mark .qa-mark-body > .qa-mark-search,
.qa-sheet--mark .qa-mark-body > .qa-mark-all-head,
.qa-sheet--mark .qa-mark-body > .qa-mark-chips--all   { grid-column: 2; }
```

The pills that previously sat alone in col 2 move to col 1 under the note. This balances the two columns — col 1 (note + selected pills) is closer in height to col 2 (all-tags list) — and creates a more intuitive grouping ("what you're marking" on the left).

Mobile layout unchanged (no 2-col grid there).

**Verification:**
- 1440×900: open mark editor. Col 1 bottom should reach ≥60% of col 2's bottom when at least 1 tag is selected. Screenshot in each theme.
- 375×667: mark editor stays bottom-sheet; DOM order of children means label → note → selected → search → all-head → chips stacks naturally.
- E2E: click a tag chip in col 2 → it appears in col 1 (under note).

---

### Unit 3 — Review hub architecture refactor (core)

**Files:**
- `src/review/hub.js` (modify)
- `src/core/theme.css` (modify)

**Scope:**

1. **Collapse card-rendering to a single `renderCardList(container, marks)`.**
   - Delete `renderTagGrouped`, `renderGrouped`, `renderFlat`.
   - The new function sorts marks by `updatedAt` desc, iterates unique marks once, appends one card per mark via `renderMarkCard`.
   - No group headers. Tag chips on each card (existing `renderMarkCard` behavior) communicate tag membership.
   - `renderLoadMore` continues to work: it calls `renderCardList(cardList, nextPage)`.
2. **Drop the 2-col card grid CSS** at desktop.
   - Remove the `.qa-review-card-list { display: grid; grid-template-columns: repeat(2, ...) }` rule inside the `@media (min-width: 1180px)` block.
   - Remove the `.qa-review-tag-header, .qa-review-surah-header { grid-column: 1 / -1 }` rule (no longer needed).
   - `.qa-review-card-list` retains its role as a container; add simple vertical spacing between cards.
3. **Rail state split** in `hub.js`:
   - `let _railActiveTags = new Set()` for tag multi-select.
   - `let _railActiveGroup = null` stays, but now only used for surah/date grouping.
   - Both reset on `init()` and in the cleanup returned function.
4. **Rail click behavior:**
   - Tag-mode: toggle the row's key in `_railActiveTags`. A row shows `.qa-review-rail-row--on` iff its key is in the Set.
   - Surah/date mode: existing single-select toggle (unchanged).
   - Switching the group-by seg clears both `_railActiveTags` and `_railActiveGroup`.
5. **Filter logic in `render()`:**
   - After `filterMarks(sortedMarks, currentState)` (the legacy activeTag + surahFilter), apply rail filters:
     - Tag mode with non-empty `_railActiveTags`: `marks.filter(m => m.tags.some(t => _railActiveTags.has(t)))`.
     - Surah mode with `_railActiveGroup`: filter by surah number (as before).
     - Date mode with `_railActiveGroup`: filter by YYYY-MM (as before).
6. **Chip bar** above the card list (tag mode + `_railActiveTags.size > 0` only):
   - Container `.qa-review-filter-bar` inside `cardHost`, rendered before `cardList`.
   - One `.qa-review-filter-chip` per active tag, with a dot (color from `getColorForTag`), the tag name, and a `×` button.
   - Clicking `×` removes that tag from `_railActiveTags` and rerenders.
   - A `Clear all` button at the end clears `_railActiveTags` entirely.
7. **`renderControls` still runs** and appends `.qa-review-controls` (hidden at desktop via existing CSS `.qa-review-layout .qa-review-controls { display: none }`). Mobile keeps the dropdown controls.

**Verification:**
- 1440×900 with 4 seeded marks (one multi-tagged): count `.qa-review-card` → should equal 4 regardless of groupBy. Previously `tag` groupBy would have yielded 6+.
- Click two tag rows → card count = union; chip bar shows both tags; rail rows both show `--on`.
- Click one chip `×` → that tag clears; card count drops to the single-tag result.
- Click `Clear all` → `_railActiveTags` empty; chip bar disappears; full card list returns.
- Mobile 375×667: no `.qa-review-layout`, no rail, no chip bar (chip bar only renders inside `cardHost` when `isDesktop && tag-mode && active`). Dropdown controls work as before.
- Cards render as a single column, full width of `main` column at desktop.

---

### Unit 4 — FVR layout fix

**Files:**
- `src/review/hub.js` (modify)
- `src/core/theme.css` (modify)

**Scope:**

1. In `initTagDeepLink()` (FVR entry), wrap the FVR content (header + card list) in a `.qa-fvr-layout` container:
   ```js
   const layout = document.createElement('div')
   layout.className = 'qa-fvr-layout'
   container.appendChild(layout)
   renderFvrHeader(layout, tag, marks)
   render(layout)  // render() at isFvr=true will append cards to this layout
   ```
2. In `render()`, when `isFvr`, use `container` (the layout wrapper passed in) as `cardHost`. No `.qa-review-layout`, no rail, no chip bar.
3. `.qa-fvr-layout` CSS (apply at all viewports, not just desktop):
   ```css
   .qa-fvr-layout { max-width: 720px; margin: 0 auto; }
   ```
   Remove the desktop-only duplicate block.

**Verification:**
- 1440×900 FVR: header + cards are both horizontally centered within a 720px column. `bounds.left === bounds.right` for both.
- 375×667 FVR: no horizontal gutters introduced (max-width constraint only applies when viewport > 720px).
- Card count equals unique marks tagged with that tag (no duplication — FVR was already not duplicating, so this is a sanity check).

---

### Unit 5 — Diagnose and fix "double rail"

**Files:** `src/review/hub.js` (where `render()` lives). If the root cause is an event-driven re-entry, no other files need to change. If diagnosis shows a CSS containment issue, `src/core/theme.css` may also be touched.

**Scope:**

Empirical reproduction at 1440×900 via Playwright:

1. Reload the dev server to guarantee HMR cache is clean.
2. Navigate to `/#/review`. Count `document.querySelectorAll('.qa-review-rail').length` — expect 1.
3. Trigger each rerender source:
   - Click a rail row → recount.
   - Click a group-by seg button in the rail → recount.
   - Synthetically emit `Events.SYNC_UPDATE_RECEIVED` via `page.evaluate` → recount.
   - Navigate away and back to `/#/review` → recount.
4. If a count > 1 is reached, inspect the sequence of `render()` invocations to determine the root cause.

Two hypotheses to investigate first:
- `renderControls` closure captures `container = cardHost` (the `main` column, not `mainContent`). At desktop the hidden seg buttons still have listeners; if any path triggers them programmatically, they call `render(main)` which appends a new `.qa-review-layout` *inside* `main` — producing nested rails.
- `reloadMarks` is async; a SYNC event fired while the first render is in-flight could queue a second render that isn't guarded.

Fix to ship regardless of root cause: add a `_renderToken = 0` guard. Increment at the top of each `render(mainContent)` invocation; capture the token locally; only commit the DOM append if the local token still matches the module counter when async work returns. Also: always pass `mainContent` (not `cardHost`) to nested callbacks that call back into `render()`. This is a shallow belt-and-suspenders fix that prevents any future double-render from this entry point.

**Verification:** After fix, trigger all 4 sources from above; rail count never exceeds 1.

(This unit may merge into Unit 3 if the root cause sits inside the refactored render flow.)

---

### Unit 6 — Onboarding desktop responsive

**Files:** `src/core/theme.css` only

**Scope:**

Add responsive scale-ups above the existing mobile rules. Mobile unchanged.

Tablet `@media (min-width: 768px)`:
```css
.qa-onboarding { max-width: 560px; padding: 40px 32px 56px; }
.qa-onb-mark { font-size: 3rem; }
.qa-onb-blessing { font-size: 0.9375rem; max-width: 360px; }
.qa-onb-verse { font-size: 1.0625rem; }
.qa-onb-headline { font-size: 2rem; }
.qa-onb-lede { font-size: 0.9375rem; }
```

Desktop `@media (min-width: 1180px)`:
```css
.qa-onboarding { max-width: 680px; padding: 64px 48px 72px; }
.qa-onb-page { min-height: 60vh; }
.qa-onb-mark { font-size: 3.75rem; }
.qa-onb-tag { font-size: 0.75rem; }
.qa-onb-blessing { font-size: 1rem; }
.qa-onb-verse { font-size: 1.25rem; }
.qa-onb-headline { font-size: 2.5rem; line-height: 1.2; }
.qa-onb-lede { font-size: 1rem; max-width: 520px; margin-inline: auto; }
.qa-onb-swatches { gap: 14px; }
```

**Verification:**
- 375×667 — baseline unchanged (compare against a committed screenshot).
- 768×1024 tablet — wordmark visibly larger, container still feels snug.
- 1440×900 desktop — wordmark reads as brand hero, body text comfortable, lede doesn't stretch edge-to-edge.
- Existing landscape guard at `@media (max-height: 500px)` continues to work.

---

### Unit 7 — Onboarding "Power up" shortcuts screen

**Files:**
- `src/onboarding/screens.js` (add new screen)
- `src/onboarding/index.js` (register in flow)
- `src/core/theme.css` (add styles for the new page)

**Scope:**

1. New screen inserted as the **second-to-last** step (before the final "Start reading" page). Example structure:
   ```
   <page>
     <headline>A few shortcuts</headline>
     <lede>QuranAtlas is faster than tapping. These work anywhere.</lede>
     <div class="qa-onb-shortcuts">
       <div class="qa-onb-shortcut-row">
         <kbd class="qa-onb-kbd">⌘K</kbd>
         <span>Search verses, tags, surahs</span>
       </div>
       <div class="qa-onb-shortcut-row">
         <kbd class="qa-onb-kbd">⌘↑</kbd> / <kbd class="qa-onb-kbd">⌘↓</kbd>
         <span>Font size</span>
       </div>
       <div class="qa-onb-shortcut-row">
         <kbd class="qa-onb-kbd">g</kbd> <kbd class="qa-onb-kbd">r</kbd>
         <span>Review hub</span>
       </div>
       <div class="qa-onb-shortcut-row">
         <kbd class="qa-onb-kbd">g</kbd> <kbd class="qa-onb-kbd">s</kbd>
         <span>Surah list</span>
       </div>
       <div class="qa-onb-shortcut-row">
         <kbd class="qa-onb-kbd">g</kbd> <kbd class="qa-onb-kbd">,</kbd>
         <span>Settings</span>
       </div>
       <div class="qa-onb-shortcut-row">
         <span class="qa-onb-kbd qa-onb-kbd--gesture">Long-press</span>
         <span>Mark &amp; tag a verse</span>
       </div>
     </div>
     <cta-row>
       <button primary>Next</button>
     </cta-row>
   </page>
   ```
2. Use OS detection to swap `⌘` for `Ctrl` on non-Mac (reuse `navigator.platform` or an existing helper if one exists; otherwise inline `/Mac/.test(navigator.platform)`).
3. CSS:
   ```css
   .qa-onb-shortcuts {
     display: grid;
     grid-template-columns: 1fr;
     gap: 10px;
     margin: 16px 0 20px;
     text-align: left;
   }
   .qa-onb-shortcut-row {
     display: flex;
     align-items: center;
     gap: 12px;
     font-size: 0.875rem;
     color: var(--qa-ambient-parchment);
   }
   .qa-onb-kbd {
     display: inline-flex;
     align-items: center;
     justify-content: center;
     min-width: 28px;
     padding: 2px 8px;
     border: 1px solid var(--qa-ambient-border);
     border-radius: 5px;
     background: var(--qa-ambient-surface);
     color: var(--qa-ambient-kbd-color, var(--qa-ambient-accent));
     font-family: var(--qa-font-ui);
     font-size: 0.75rem;
     font-weight: 600;
   }
   .qa-onb-kbd--gesture {
     font-weight: 400;
     font-size: 0.75rem;
     text-transform: uppercase;
     letter-spacing: 0.1em;
   }
   @media (min-width: 1180px) {
     .qa-onb-shortcuts { grid-template-columns: 1fr 1fr; gap: 14px 32px; }
     .qa-onb-shortcut-row { font-size: 1rem; }
   }
   ```

**Verification:**
- Fresh install at 1440×900 → onboarding navigates through screens → reaches "A few shortcuts" → shortcuts render as 2-col grid → tapping `Next` advances to final CTA.
- 768×1024 tablet → 1-col stacked rows (default).
- 375×667 mobile → same 1-col, stacks cleanly, no overflow.
- On a Windows/Linux user agent (`navigator.platform = 'Win32'`), all `⌘` render as `Ctrl`.

---

### Unit 8 — E2E coverage

**Files:**
- `tests/e2e/desktop-layouts.spec.js` (extend)
- `tests/e2e/journey-a-onboarding.spec.js` (extend — shortcuts screen + desktop scale check)
- `tests/e2e/journey-d-settings.spec.js` (extend — 5-step font slider + preview reacts)

**Scope:**

New / extended tests:
- Font preview binds to tokens: set slider to `xs` → measure computed `fontSize` on `.qa-font-preview-ar` → set to `xl` → measure again → expect xl > xs with ratio ~1.73 (0.75 → 1.3).
- Font shortcut: focus the reader, press `⌘↑` → size attribute on `<html>` updates.
- Mark editor rebalance: open at 1440×900, select a tag → `.qa-mark-selected` is inside col 1 (computed `gridColumn === '1'`).
- Review hub multi-tag OR: seed marks, click two rail rows in tag mode, expect card count = union and chip bar has 2 chips with × buttons.
- Review hub no-duplication: seed a multi-tagged mark, expect exactly 1 `.qa-review-card[data-mark="<key>"]`.
- Review hub single-col cards: `.qa-review-card-list` has `gridTemplateColumns === 'none'` at desktop.
- FVR desktop centering: measure `.qa-fvr-layout` bounding rect — `left === (viewportWidth - width) / 2`.
- Onboarding desktop: 1440×900 fresh install — measure `.qa-onboarding` width = 680px, `.qa-onb-mark` fontSize ≥ 60px.
- Onboarding shortcuts screen: reachable via "Next" from previous step; `.qa-onb-shortcuts` 2-col at desktop, 1-col at mobile; at least 6 rows rendered.

---

### Unit 9 — Docs

**Files:**
- `docs/context/user-journeys.md`

**Scope:**

1. Journey D (Settings): note the 5-step font slider + `⌘↑ / ⌘↓` shortcut + preview reordering (translation left, Arabic right).
2. Journey E (Reviewing marks):
   - Rewrite E2 "Swap grouping" as "Switch rail bucket list" — clarify grouping is faceted, not card-nesting.
   - Add new E-sub-journey: "Filter by multiple tags" — click multiple rail rows → chip bar appears → × or Clear all to remove.
   - Note cards are a flat single-column list, no duplication.
3. Journey A (Onboarding): add "Power up" step between the existing theme/tags step and the final CTA; describe the shortcut list.
4. Add a top-level "Keyboard shortcuts" reference section:
   - `⌘K` (or `Ctrl+K`) — command sheet
   - `⌘↑ / ⌘↓` — font size
   - `g r / g s / g ,` — navigation chords
   - Long-press — mark editor

---

## Cross-cutting requirements

- **Responsive on all viewports.** Every CSS change in this spec must be verified at 375×667, 768×1024, and 1440×900. If a rule inadvertently affects a non-target viewport, roll it back or scope with a media query.
- **Backward compatibility.** IDB font-size values (`'small' / 'medium' / 'large'`) continue to resolve to the new tokens on read. No schema bump.
- **Accessibility.**
  - Font shortcut announces new size via `announce()`.
  - Rail chip bar `×` buttons have `aria-label` describing the tag being removed.
  - Onboarding shortcuts screen uses `<kbd>` semantics.
- **No regressions.** `pnpm run build && pnpm run test:run` stays clean at the end of each commit. Existing e2e specs keep passing (`pnpm exec playwright test --project=chromium`).

---

## Clustering + commit plan

9 commits in order. Each commit ends with the app in a working state.

1. `feat(font): 5-step scale + preview token binding + en-first preview + ⌘↑/⌘↓ shortcuts`
2. `feat(desktop): rebalance mark editor — selected pills in left col`
3. `refactor(review): single-column de-duped card list + multi-tag OR filter + chip bar`
4. `fix(review): FVR wrapped in .qa-fvr-layout; desktop centering restored`
5. `fix(review): guard against double render` (merge into #3 if diagnosis points there)
6. `feat(onboarding): responsive desktop scale-up — larger wordmark, hero, headline`
7. `feat(onboarding): add Power up shortcuts screen`
8. `test(e2e): coverage for chip bar, font preview, mark editor balance, onboarding`
9. `docs: user-journeys — review filter model, shortcuts, onboarding shortcuts step`

---

## Success criteria

- Font size preview in Settings reacts in real time to slider changes; translation on the left, Arabic on the right; 5 discrete steps.
- `⌘↑ / ⌘↓` (and Ctrl on non-Mac) grows/shrinks font anywhere in the app; announces to screen readers; doesn't collide with focused inputs.
- Mark editor at 1440×900: no dead space under the note.
- Review hub: each mark appears once; multi-tag OR filter works via rail + chip bar; cards flow in a single column; FVR centered on 720px.
- Left rail never renders more than once.
- Onboarding at 1440×900 feels desktop-native (680px container, 3.75rem wordmark); "Power up" screen teaches the five core shortcuts + long-press.
- All three viewports (mobile, tablet, desktop) verified on every CSS-touching unit.
