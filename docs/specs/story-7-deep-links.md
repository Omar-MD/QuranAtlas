# Story 7: Private deep links

**Phase:** 3 (P3)
**Priority:** P3
**Depends on:** Story 5 (review hub)

---

## Summary

Review deep links allow navigating to a filtered view by tag via URL hash.

## Functional Requirements

### FR-020b: Review deep links

- Route: `#/t/{tag_label}` opens review hub filtered by that tag
- Tag label is URL-decoded and validated against existing tags in IDB
- If tag not found: show "tag not found" state (not error page), with link to review hub
- These are same-device links (no server, no sharing — just bookmarkable within the app)

## Acceptance Criteria

- [ ] `#/t/favorites` opens review hub filtered to "favorites" tag (if exists)
- [ ] `#/t/nonexistent` shows "tag not found" with navigation to review hub
- [ ] URL-encoded tags (`#/t/my%20tag`) decode correctly
- [ ] Tag parameter validated by `input-validator.js` before IDB lookup
- [ ] Deep link resolve completes in < 500 ms

## Data Dependencies

- Router: hash route `#/t/{tag_label}`
- IDB: `marks` store (by-tag index for validation)
- Validation: `input-validator.js` (validateTagParam)
