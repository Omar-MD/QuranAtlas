---
issue: 9
title: "Story 9: Settings & About"
state: OPEN
---

## Problem Statement

Users have no way to personalize the reading experience (dark mode support is critical for Arabic text reading at night), no way to control how much storage they're using, and no way to understand what data they've entrusted to the app or how to reclaim it. New users also have no entry point for installing the app to their home screen, and no canonical place to learn what the app is, what versions they're running, or who built it.

## Solution

Create a Settings page accessible via `#/settings` in the bottom nav bar, with a theme switcher (3 color swatches: light, sepia, dark) and a destructive "Clear All Data" button at the bottom (requires typing "DELETE" to confirm). Theme changes apply instantly and persist to IDB. Create an About page at `#/about` showing the app name and mission ("Read, reflect, remember"), QuranAtlas version (from `package.json`), dataset version (from `datasetMeta.version` in IDB), attribution block (Bridges' Translation, KFGQPC font), storage quota usage with a warning if >80%, and a "Install App" button that appears only when the PWA install prompt is available.

Both pages are top-level routes and accessible from the nav bar. All theme changes are applied via CSS variables scoped to `:root`, ensuring consistent application across the entire UI.

**Font size controls are DEFERRED.** Browser zoom works perfectly in a PWA and covers the same need. Dark mode is far more critical for night reading.

## User Stories

1. As a reader, I want to switch to dark mode for night reading so that my eyes don't strain when reading in low light.
2. As a reader, I want to switch to sepia mode for a warm, book-like appearance so that I can read for extended periods without fatigue.
3. As a reader, I want my theme choice to persist across sessions so that I don't have to re-select it every time I open the app.
4. As a reader, I want instant visual feedback when I change the theme so that I can see the effect immediately.
5. As a reader, I want a single button to clear all my reading history, bookmarks, and cached data so that I can reset the app if I'm having issues or passing the device to someone else.
6. As a reader, I want to be warned before clearing all data so that I don't accidentally delete years of reading progress.
7. As a reader, I want to know how much storage the app is using so that I can decide if I need to clear cache or uninstall.
8. As a reader, I want an easy way to install the app to my home screen so that I can access it more quickly.
9. As a reader, I want to know what version of the dataset I'm reading so that I can report bugs or request updates based on a specific version.
10. As a new user, I want to read about the app's mission and learn who built it so that I can trust the app and understand its values.

## Implementation Decisions

### Modules to Build / Modify

**`src/core/router.js`**

- Add routes: `#/settings` → `settings/index.js`, `#/about` → `about/index.js`
- Both are top-level page routes (not nested under reader)

**`src/settings/index.js`** (new)

- Default export: `<div>` or `<main>` page structure with two sections:
  - Theme section: `<fieldset>` with 3 color swatch thumbnails + labels (Light, Sepia, Dark)
  - Clear data section: red `<button>` at bottom with `aria-label="Clear all data"` + danger styling
- Event listeners: on swatch click, emit `settings:theme-changed` + save to IDB + apply CSS class

**`src/settings/theme.js`** (new)

- `loadTheme()` — read IDB `settings["theme"]` or default to 'light'
- `setTheme(themeName)` — write to IDB, emit `settings:theme-changed`, update `html[data-theme]`
- Initialize on app load

**`src/settings/clear-data.js`** (new)

- `openClearDataModal()` — show modal with input field + warning text + "CANCEL" / "CLEAR" buttons
- Input must equal "DELETE" (case-insensitive) to enable "CLEAR" button
- On confirm: `caches.delete('quran-dataset-v1')` + `caches.delete('quran-dataset-staging')` + `caches.delete('quran-fonts-v1')` + IDB `deleteDatabase()` + emit `settings:data-cleared` + navigate to reader
- Handle async errors gracefully (log to console, show error toast)

**`src/about/index.js`** (new)

- Default export: `<main>` with sections:
  - App name + mission: `<h1>QuranAtlas</h1><p>Read, reflect, remember</p>`
  - Versions: `<dl>` showing App version + Dataset version
  - Attribution: credits for Bridges' Translation, KFGQPC font
  - Storage: `<meter>` or progress bar + quota text
  - PWA install: button shown only if `beforeinstallprompt` event fired

**`src/about/versions.js`** (new)

- `getAppVersion()` — return `__APP_VERSION__` (injected by Vite; add to `vite.config.js` as `define.APP_VERSION`)
- `getDatasetVersion()` — read IDB `datasetMeta.version` or "(not yet installed)"

**`src/about/attribution.js`** (new)

- Return HTML string or component with:
  - "Quran translation by Fadel Soliman (Bridges' Translation) — license at bridges.org.uk"
  - "Arabic typography by KFGQPC (King Fahd Glyphic and Typographic Project)"
  - "Font: Scheherazade New (SIL Open Font License)"
  - "Built with Vite, Lightning CSS, Workbox"

**`src/about/storage.js`** (new)

- `getStorageEstimate()` — call `navigator.storage.estimate()` → `{ quota, usage }`
- Return `{ usage, quota, percent, isWarning }` where `isWarning = percent > 0.8`
- Render as: `<meter value="usage" max="quota"></meter>` + percentage text + warning if >80%

**`src/about/pwa-install.js`** (new)

- `initPWAInstall()` — listen for `beforeinstallprompt` event, store it, show "Install App" button
- On button click: `event.prompt()` → `event.userChoice` → log choice
- Hide button if `beforeinstallprompt` never fires (not a PWA-capable context)

**`src/core/events.js`**

- Add: `settings:theme-changed`, `settings:data-cleared` events

**`src/index.html`**

- Add Settings to bottom nav bar; update nav structure to include 4 links (Reader, Review, Marks, Settings)
- Add About link (e.g., in a hamburger menu or as a separate nav item if space allows)

**CSS (new file `src/core/theme.css`)**

- Define theme variables:

  ```css
  :root {
    --qa-light-bg-primary: #ffffff;
    --qa-light-text-primary: #1a1a1a;
    /* ... more light vars ... */

    --qa-sepia-bg-primary: #f5e6d3;
    --qa-sepia-text-primary: #2c2416;
    /* ... more sepia vars ... */

    --qa-dark-bg-primary: #0f0f13;
    --qa-dark-text-primary: #e8e6e3;
    /* ... more dark vars ... */
  }

  /* Default to light; override with data-attr or class */
  html[data-theme="sepia"] {
    --qa-bg-primary: var(--qa-sepia-bg-primary);
    /* ... etc */
  }

  html[data-theme="dark"] {
    --qa-bg-primary: var(--qa-dark-bg-primary);
    /* ... etc */
  }
  ```

### IDB

- `settings` store (keyPath: `key`): read/write `{ key, value }` — one record per setting. Known keys: `"theme"` (value: `"light"|"sepia"|"dark"`).
  - Initialized on first app load with default: `{ key: 'theme', value: 'light' }`

### Events

All emitted via `src/core/events.js` pub/sub.

| Event                        | Payload        | Emitter         |
| ---------------------------- | -------------- | --------------- |
| `settings:theme-changed`     | `{ from, to }` | `theme.js`      |
| `settings:data-cleared`      | `{}`           | `clear-data.js` |

### Performance

- Theme switch: instant (CSS update only)
- Storage estimate fetch: ≤100 ms (native API)
- IDB read/write: ≤50 ms
- Page load: Settings and About pages ≤500 ms (minimal async operations)

## Testing Decisions

Tests exercise only observable behaviour: IDB state, CSS applied, navigation, event emissions.

**`src/settings/` — integration tests (Vitest + fake-indexeddb + jsdom)**

- Theme save to IDB: click swatch → IDB `settings["theme"]` updated with new record + event emitted
- Theme persistence: load page → saved theme applied automatically
- Clear data flow: button click → modal appears → input validation works → confirm clears IDB + caches + redirects to reader
- Storage estimate: About page shows correct quota/usage and warning if >80%
- PWA install: button hidden if `beforeinstallprompt` never fires; visible if it does; click calls `event.prompt()`

**`src/about/versions.js` — unit tests**

- `getAppVersion()` returns semver string
- `getDatasetVersion()` returns version string or "(not yet installed)"

Prior art: Story 3 (IDB read/write patterns), Story 4 (event emission + IDB save pattern)

## Out of Scope

- Changing theme color palette (fixed dark/light/sepia palettes)
- Keyboard shortcuts for theme switching
- High contrast mode or other a11y themes (beyond dark/sepia/light)
- Font size controls — **DEFERRED**
- Custom font selection (embedded font only: Scheherazade New)
- Storage quota increase or cloud sync
- Device storage quota management (browser-level setting)
- Detailed attribution UI (modal or separate page) — inline attribution only
- Password protection for clear-data button (only text entry)

## Further Notes

- **Nav bar structure:** Bottom nav currently has Reader, Review, Marks (3 items). Story 9 adds Settings as 4th item. About may be in a hamburger or separate. Determine in mockup design.
- **Theme persistence:** Store theme as `data-theme` attribute on `<html>` (not a class) for cleaner CSS targeting. Sync IDB on load via `loadTheme()`.
- **Clear data destructiveness:** After clearing, user sees an empty reader. Ideally, there's no "Undo" — data is gone. Message: "All data cleared. Start fresh?"
- **Storage quota:** Some browsers don't support `navigator.storage.estimate()`. Gracefully degrade to "Storage info not available" if not supported.
- **PWA install:** `beforeinstallprompt` only fires on Chromium browsers and only if PWA criteria are met (manifest, SW, etc.). On iOS Safari, PWA install is different (user manually adds to home screen); we can detect iOS and show alternate CTA.
- **App version injection:** Vite's `define` plugin injects `__APP_VERSION__` at build time. Set in `vite.config.js`: `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`
- **A11y:** All theme swatches need `aria-label` and focus indicators. Clear data button needs `aria-label="Clear all data and reset to defaults"`. Modal needs `role="dialog"` and focus trap.
- **Mockups:** Required before implementation (Story 9 constraint). Must include Settings page layout (theme swatches, clear data button) and About page layout (versions, attribution block, storage meter, PWA install button). 2–4 mockups per surface, all browser-renderable HTML in `mockups/`.

## Grill-Me Decisions (12 locked)

| Q                       | Decision                                                 | Choice               |
| ---                     | ---                                                      | ---                  |
| Settings route          | `#/settings` navigation link                             | Nav link             |
| Nav bar placement       | Bottom nav bar (like Marks, Review)                      | Bottom nav           |
| Theme switcher UI       | 3 thumbnail color swatches; click to preview             | Thumbnail swatches   |
| Theme change behavior   | Instant save on click (no confirmation)                  | Instant save         |
| Theme impl approach     | Full CSS vars at :root per theme                         | CSS vars system      |
| Font size feature       | **DEFERRED** to Phase 3                                  | Deferred             |
| Clear data action       | Bottom of Settings, red button + "DELETE" text entry     | Red button + confirm |
| About page sections     | Versions, attribution, PWA install CTA, storage, mission | All included         |
| App mission/slogan      | "Read, reflect, remember"                                | Mission set          |
| Storage quota threshold | Warn if usage >80% of quota                              | 80% threshold        |
| Font size default       | N/A (deferred)                                           | Deferred             |
| Font size persistence   | N/A (deferred)                                           | Deferred             |
