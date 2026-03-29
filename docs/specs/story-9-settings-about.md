# Story 9: About page + reading settings

**Phase:** 3 (P3)
**Priority:** P3
**Depends on:** Story 1 (PWA), Story 2 (reader)

---

## Summary

Settings surface for themes, storage management, and about page with provenance and version info.

## Functional Requirements

### FR-024: About page

- Displays: app version, dataset version (from `datasetMeta`), provenance info (from `provenance.json`)
- Attribution for Bridges' Translation by Fadel Soliman (bridgesislam.com)
- Attribution for KFGQPC font
- Entry point for PWA install (if not installed) and dataset update check

### FR-026: Themes

- Three themes: light, sepia, dark
- Implemented via CSS custom properties + class toggle on `<html>` (`qa-theme-light`, `qa-theme-sepia`, `qa-theme-dark`)
- All themes must pass WCAG 2.2 AA contrast requirements
- Arabic diacritics contrast >= 4.5:1 in all themes
- Theme preference persisted in IDB `settings` store
- Default: light (or `prefers-color-scheme: dark` media query for initial load)

### FR-018: Storage durability

- Show non-blocking warning if `navigator.storage.persisted()` returns false
- "Clear all data" button with explicit confirmation (type "DELETE" to confirm)
- Clear all data: delete IDB database, delete all caches, unregister SW, reload
- Show storage usage via `navigator.storage.estimate()`

### FR-021: Accessibility audit

- Full WCAG 2.2 AA compliance verified across all three themes
- Focus indicators on all interactive elements (`:focus-visible`)
- Screen reader announcements via `src/a11y/announcer.js`
- `prefers-reduced-motion` honoured for all transitions

## Acceptance Criteria

- [ ] About page shows correct app version and dataset version
- [ ] Provenance text includes attribution for Bridges' Translation by Fadel Soliman
- [ ] All three themes apply correctly and persist across reload
- [ ] Contrast ratio >= 4.5:1 for Arabic diacritics in all themes
- [ ] Storage warning appears when persistence is not granted
- [ ] "Clear all data" requires typing "DELETE" before executing
- [ ] After clear: app returns to fresh state (no marks, no position, no settings)
- [ ] Lighthouse A11y score >= 90 across all themes

## Data Dependencies

- IDB: `settings` (theme), `datasetMeta` (version display)
- Cache: `provenance.json`
- Events: `settings:theme-changed`
