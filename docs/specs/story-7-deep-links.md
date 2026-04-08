---
issue: 7
title: "Story 7: Deep Links & Review Routes"
state: OPEN
---

## Problem Statement

A student receives a shared verse link. When opened, `#/s/{surah}/{ayah}` is overridden by session restore. Verse deep links do not navigate to the intended verse.

## Solution

**Verse deep links (`#/s/{surah}/{ayah}`)** — when both surah and ayah are present in the URL, the reader opens at that exact verse, overriding Story 2's session restore. After load, normal scroll-based position tracking resumes — the user's old IDB position is not overwritten by the deep link itself, but will be overwritten once they scroll.

**Tag deep links (`#/t/{tag_label}`)** — implemented with a graceful fallback. When a valid tag is present in the URL and the user has marks for that tag in their local IDB, the Review Hub opens with marks filtered to that tag (FVR view). When no marks exist or the tag is invalid, a not-found state is rendered with a link to `#/review`. This is intentional: recipients who do not have the same marks locally see the not-found fallback; recipients who do (e.g., same user on same device) see their marks.

## User Stories

1. As a student opening a shared verse link `#/s/2/255`, I want the reader to open at that exact verse regardless of where I last was, so that the link takes me where it promised.
2. As a student with a saved reading position, I want my saved IDB position to remain intact when I open a verse deep link, so that I can return to my reading after viewing the shared verse.
3. As a student who scrolls after following a verse deep link, I want my position to be saved normally, so that the app tracks where I actually am.
4. As a student navigating to `#/s/2` (surah only, no ayah), I want my saved reading position within that surah restored as normal, so that internal navigation is unaffected by deep link logic.
5. As a student opening `#/t/Qur%C3%A2n`, I want to see a not-found state with a link to the Review Hub if no local marks exist for that tag. *(If marks exist for that tag in local IDB, the Review Hub opens filtered to that tag.)*

## Implementation Decisions

### Modules to Build / Modify

**`src/reader/index.js`**

- In `init(params)`: if `params.ayah` is present, open at `{ surah, ayah }` and skip session restore. After render, normal scroll-position tracking resumes — no special mode, no position snapshot.
- If `params.ayah` is absent, Story 2 session restore applies unchanged.
- Out-of-range surah/ayah values: reader owns graceful handling (Story 1/2 concern). Story 7 does not add route-level validation.

**`src/review/hub.js`**

- `#/t/:tag` route entry point: validates tag via `validateTagParam()`, queries IDB for marks with that tag.
- If marks exist: opens Review Hub with `view: 'fvr'` and `activeTag` set, rendering the marks filtered to that tag.
- If no marks exist or tag is invalid: renders not-found state with a link to `#/review` and an a11y announcement.

### IDB

No schema changes.

### Events

No new events.

### Performance

Verse deep link: no extra latency over normal reader load.

## Testing Decisions

A good test exercises only observable behaviour: what's rendered, what IDB operations are performed, what events are emitted. Never test internal state or private helpers.

**`reader/index.js` — deep link precedence** (integration, jsdom + fake-indexeddb):

- Seed saved position at 1:1; call `init({ surah: "2", ayah: "255" })` → reader renders at 2:255, not 1:1.
- Verify IDB position record still shows 1:1 immediately after deep link load (not yet overwritten).
- Call `init({ surah: "2" })` (no ayah) → session restore applies (renders at saved position or default).

Prior art: `tests/unit/core/db.test.js` for IDB setup patterns.

## Out of Scope

- Tag deep links `#/t/{tag}` — graceful fallback (not-found when no local marks; FVR when marks exist)
- Sharing / copy-URL affordance — no UI for generating links
- Cross-device mark sync — deep links only work if the user has those marks locally
- PWA share target registration (`share_target` in manifest)
- Verse + tag combined deep links (e.g., `#/s/2/255?tag=study`)

## Further Notes

- URL-decoding of params happens in `core/router.js` before reaching `init()`.
- Invalid input renders the same not-found state. The distinction is an internal implementation detail.

## Grill-Me Decisions (7 locked)

| Q   | Decision                           | Choice                                                                                                         |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | Tag deep links                     | **Graceful fallback** — FVR when local marks exist for the tag; not-found state otherwise                      |
| 2   | `#/t/` route behavior              | FVR if marks found for tag; simple not-found with link to `#/review` if none                             |
| 3   | Invalid verse params               | Reader owns graceful handling — Story 7 passes through without route-level validation                          |
| 4   | Position tracking after deep link  | Normal — scrolling saves position; old position overwritten on first scroll                                    |
| 5   | Verse deep links                   | **KEPT** — `#/s/{surah}/{ayah}` opens at exact verse, overrides session restore                                |
| 6   | A11y announcement                  | Not needed for verse deep links (content renders normally)                                                     |
| 7   | Hub mount on tag deep link         | **Implemented** — `hub.js::initTagDeepLink()` handles the route, renders FVR or not-found |
