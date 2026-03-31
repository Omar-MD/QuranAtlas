# Story 9: Settings + about | P3 | Requires: Story 1, Story 2

- About: app version, datasetMeta version, provenance.json content, attribution for Bridges' Translation (Fadel Soliman, bridgesislam.com) + KFGQPC font; entry point for PWA install (if not standalone) and dataset update check
- Themes: light/sepia/dark via CSS custom properties + class on `<html>` (`qa-theme-light/sepia/dark`); all WCAG 2.2 AA; Arabic diacritics ≥4.5:1; default light or `prefers-color-scheme:dark`; persisted in IDB settings
- Storage: non-blocking warning if `navigator.storage.persisted()=false`; show `navigator.storage.estimate()`; "Clear all data" requires typing "DELETE" → delete IDB DB + all caches + unregister SW + reload
- Full WCAG 2.2 AA audit across all three themes; `:focus-visible` on all interactive elements; a11y/announcer.js live region; `prefers-reduced-motion` on all transitions; Lighthouse A11y ≥90 all themes
- IDB: settings (theme); events: settings:theme-changed
