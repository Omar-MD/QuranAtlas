---
issue: 7
title: "Story 7: Deep Links & Review Routes"
state: OPEN
---

## Problem Statement

A student bookmarks a tag-filtered review URL or receives a shared verse link. When opened, the app ignores the URL params — `#/t/{tag_label}` lands on a stub, and `#/s/{surah}/{ayah}` is overridden by session restore. There is no way to enter a tag-filtered review view directly from outside the app, and inbound verse links do not navigate to the intended verse.

## Solution

Two URL contracts are honoured:

**1. Tag routes (`#/t/{tag_label}`)** — entering this URL renders the Filtered Verse Review (FVR) directly for the named tag, bypassing the All Marks hub entirely. The tag label is URL-decoded, lowercased, and validated before the IDB lookup. If the tag has no marks — or the label is invalid — an inline not-found state is rendered within the same shell: tag name displayed, descriptive message, link to `#/review`. The `a11y/announcer.js` live region announces the state to screen readers.

**2. Verse deep links (`#/s/{surah}/{ayah}`)** — when both surah and ayah are present in the URL, the reader opens at that exact verse, overriding Story 2's session restore. After load, normal scroll-based position tracking resumes — the user's old IDB position is not overwritten by the deep link itself, but will be overwritten once they scroll.

## User Stories

1. As a student, I want to open `#/t/study` in a new tab and land directly in the FVR for my "study" tag, so that I can share a link to a specific review set with a classmate.
2. As a student, I want to bookmark `#/t/reflection` and return to that tag's FVR on any device, so that I can resume reviewing without navigating through the hub.
3. As a student who follows a `#/t/study` link but has no marks for "study", I want to see an inline "No marks for 'study'" message with a link to the Review Hub, so that I understand the link is valid but the content doesn't exist for me.
4. As a student who follows a malformed or truncated deep link, I want to see the same not-found state — not a blank screen or technical error — so that the experience stays clean and I can get back to the app.
5. As a student, I want the tag name from the URL displayed in the not-found state, so that I know exactly which tag the link pointed to.
6. As a student, I want the not-found state to include a prominent link back to the Review Hub, so that I can continue using the app without pressing back.
7. As a screen reader user landing on a not-found tag route, I want the state announced via a live region, so that I know the page loaded but the tag wasn't found.
8. As a student opening a shared verse link `#/s/2/255`, I want the reader to open at that exact verse regardless of where I last was, so that the link takes me where it promised.
9. As a student with a saved reading position, I want my saved IDB position to remain intact when I open a verse deep link, so that I can return to my reading after viewing the shared verse.
10. As a student who scrolls after following a verse deep link, I want my position to be saved normally, so that the app tracks where I actually am.
11. As a student navigating to `#/s/2` (surah only, no ayah), I want my saved reading position within that surah restored as normal, so that internal navigation is unaffected by deep link logic.
12. As a student opening `#/t/Qur%C3%A2n`, I want it to match the same as `#/t/qurân`, so that shared links work regardless of how the browser encodes or cases the tag.
13. As a student who opens `#/t/study` via deep link, I want the app to remember I was in the review surface, so that relaunching the app returns me to `#/review` (All Marks).
14. As a student in FVR entered via deep link, I want my review state (activeTag, view mode) updated, so that the hub restores correctly on my next in-app visit.
15. As a student tapping a verse in deep-linked FVR to enter preview mode, I want "Back to Review" to return me to `#/review`, so that I always have a path back to the hub.

## Implementation Decisions

### Modules to Build / Modify

**`src/review/`**

- `init({ tag })` handles the tag deep link entry point. When `tag` is present: validate via `validateTagParam(tag)` (lowercases, trims, checks length/chars), query `by-tag` index. Empty result or validation failure → render inline not-found state (tag name displayed, hub link). Success → render FVR directly — hub (All Marks view) never mounts.
- On successful FVR entry: write `settings["lastSurface"] = "review"` and `positions["review"] = { view: "fvr", activeTag: tag, ... }` — same writes as in-app FVR entry.
- Not-found state calls `a11y/announcer.js` with a descriptive message (e.g., "No marks found for '{tag}'. Visit Review Hub to browse your marks.").

**`src/safety/input-validator.js`** _(may be built by Story 4 first)_

- Must export `validateTagParam(str)` that: lowercases, trims, rejects empty, rejects >50 chars, rejects control chars (U+0000–001F, U+007F–009F), collapses internal whitespace.
- **Cross-story constraint:** Story 4 must store tags using this same lowercased/normalised value so that IDB lookups from deep links always match.

**`src/reader/`**

- In `init(params)`: if `params.ayah` is present, open at `{ surah, ayah }` and skip session restore. After render, normal scroll-position tracking resumes — no special mode, no position snapshot.
- If `params.ayah` is absent, Story 2 session restore applies unchanged.
- Out-of-range surah/ayah values: reader owns graceful handling (Story 1/2 concern). Story 7 does not add route-level validation.

### IDB

No schema changes. Tag lookup: `by-tag` index, `openKeyCursor(lowercasedTag)`. Empty cursor = not found. ≤500ms end-to-end (index-only key scan).

### Events

No new events. `review:open` emitted on FVR mount (same as in-app entry). `a11y/announcer.js` called directly for not-found announcement (permitted cross-module import).

### Performance

Tag route: IDB lookup + FVR render ≤500ms. Verse deep link: no extra latency over normal reader load.

## Testing Decisions

A good test exercises only observable behaviour: what's rendered, what IDB operations are performed, what events are emitted. Never test internal state or private helpers.

**`review/` — tag deep link** (integration, jsdom + fake-indexeddb):

- Seed marks with tag "study" (stored lowercase); call `init({ tag: "study" })` → FVR renders with correct marks.
- Call `init({ tag: "STUDY" })` (uppercase) → same FVR (case-insensitive match).
- Call `init({ tag: "nonexistent" })` → not-found state rendered, tag name "nonexistent" displayed, hub link present.
- Call `init({ tag: "" })` → not-found state.
- Call `init({ tag: "x".repeat(51) })` → not-found state (same as not-found, no error message exposed).
- Verify `settings["lastSurface"]` written to "review" and `positions["review"]` updated on successful FVR entry.
- Verify `a11y/announcer.js` called with descriptive message on not-found render.

**`reader/` — deep link precedence** (integration, jsdom + fake-indexeddb):

- Seed saved position at 1:1; call `init({ surah: "2", ayah: "255" })` → reader renders at 2:255, not 1:1.
- Verify IDB position record still shows 1:1 immediately after deep link load (not yet overwritten).
- Call `init({ surah: "2" })` (no ayah) → session restore applies (renders at saved position or default).

**`safety/input-validator.js` — `validateTagParam`** (unit):

- Empty string → invalid. 50-char → valid. 51-char → invalid. Control char → invalid. Mixed case → lowercased. Leading/trailing whitespace → trimmed. Internal double-space → collapsed.

Prior art: `tests/unit/core/db.test.js` for IDB setup patterns; Story 5 hub tests for `positions["review"]` write verification.

## Out of Scope

- Sharing / copy-URL affordance — no UI for generating links
- Deep links to the Review Hub's All Marks view (`#/review`)
- Cross-device mark sync — deep links only work if the user has those marks locally
- PWA share target registration (`share_target` in manifest)
- Verse + tag combined deep links (e.g., `#/s/2/255?tag=study`)

## Further Notes

- **Case normalisation cross-constraint (Story 4):** Tags must be stored lowercased at creation time. `validateTagParam` is the canonical normalisation function for both storage (Story 4) and lookup (Story 7). If Story 4 is implemented first, it must use this function and store lowercase values.
- URL-decoding of tag params happens in `core/router.js` before reaching `init()`. Story 7 code receives a plain decoded string.
- The `#/t/` route is already registered in `src/core/app.js`. No router changes required.
- Invalid input and "tag not found" are indistinguishable to the user — both render the same not-found state. The distinction is an internal implementation detail.
- `validateTagParam` and `a11y/announcer.js` are permitted cross-module imports (CLAUDE.md exceptions).

## Grill-Me Decisions (7 locked)

| Q   | Decision                           | Choice                                                                                                         |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | Tag case sensitivity               | Case-insensitive — `validateTagParam` lowercases; tags stored lowercase at creation (Story 4 cross-constraint) |
| 2   | `lastSurface` on deep link         | Updated to "review" — deep-linked FVR counts as a surface visit                                                |
| 3   | `positions["review"]` on deep link | Overwritten — deep link intent wins; prior hub state replaced                                                  |
| 4   | Invalid verse params               | Reader owns graceful handling — Story 7 passes through without route-level validation                          |
| 5   | Position tracking after deep link  | Normal — scrolling saves position; old position overwritten on first scroll                                    |
| 6   | A11y announcement                  | Not-found state announces via `a11y/announcer.js` live region                                                  |
| 7   | Hub mount on tag deep link         | Bypassed — FVR renders directly; All Marks hub never mounts                                                    |
