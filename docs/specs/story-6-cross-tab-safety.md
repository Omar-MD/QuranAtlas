# Story 6: Single-tab safety

**Phase:** 3 (P3)
**Priority:** P3
**Depends on:** Story 4 (verse marks)

---

## Summary

Multiple tabs remain consistent via BroadcastChannel sync, with conflict resolution when a stale tab has unsaved changes.

## Functional Requirements

### FR-019: Cross-tab sync

- `BroadcastChannel('quran-atlas:db-events')` broadcasts all mark mutations
- `visibilitychange` to `'visible'` triggers lightweight IDB re-read for any missed updates
- `missedUpdatesWhileHidden` flag prevents redundant re-renders
- Debounce re-sync to avoid double rendering

### FR-019b: versionchange handler

- IDB `versionchange` event handler closes the database and shows "please reload" message
- Prevents stale schema access across tabs during upgrades

### FR-019c: Conflict resolution

- When a stale tab has a draft mark in the editor and a newer version exists in IDB: show "preserve your changes or load latest" choice
- If no draft at risk: apply latest silently

## Acceptance Criteria

- [ ] Mark saved in tab A appears in tab B within 1 second (BroadcastChannel)
- [ ] Tab B returning from background catches up on missed mark changes (visibilitychange)
- [ ] No double re-render on tab switch (debounce verified)
- [ ] IDB versionchange shows reload prompt in stale tabs
- [ ] Conflict resolution UI appears when stale tab has unsaved draft
- [ ] Choosing "preserve" keeps the local draft; "load latest" discards it

## Data Dependencies

- BroadcastChannel: `'quran-atlas:db-events'`
- Events: `sync:update-received`, `sync:conflict-detected`
