# Storyboard System — Design Spec

## Overview

A dedicated storyboard entry point for UI/UX iteration with annotation-based feedback, device-agnostic preview (desktop + mobile), and scene-based navigation. All storyboard code lives in `storyboard/` at the project root — zero overlap with `src/`.

**Purpose**: Enable rapid design iteration and UX flow testing without affecting the product codebase. When a component is implemented in `src/`, the storyboard automatically uses the real one.

**Key capabilities**:
- Scene switcher (Reader, Nav, Marks, Review, Settings)
- State variants per scene (default, with resume, with marks, error, etc.)
- Theme toggle (Light / Sepia / Dark) using the same `data-theme` mechanism
- Device toggle (Desktop full-width / Mobile 375px frame)
- Click-to-annotate: click any element to attach feedback comments
- Persistent annotations saved to `.superpowers/annotations.json`

## Architecture

### File Layout

```
storyboard/                          ← All storyboard code (root level)
├── index.html                       ← Entry point HTML
├── controller.js                    ← Scene switcher, overlay UI, device toggle
├── mock-data.js                     ← Mock surahs, marks, positions, settings
├── annotations.js                   ← Load/save annotation comments
├── overlay.css                      ← Overlay styles (device frame, comment panel, dots)
└── scenes/
    ├── reader.js                    ← Imports real src/reader/index.js
    ├── nav.js                       ← Mock DOM (nav is still a stub in src/)
    ├── marks.js                     ← Mock DOM (marks is still a stub in src/)
    ├── review.js                    ← Mock DOM (review is still a stub in src/)
    └── settings.js                  ← Mock DOM (settings is still a stub in src/)

src/                                 ← Product code ONLY (no storyboard imports)
├── core/                            ← db, events, router, theme.css, constants
├── data/                            ← dataset.js, offline.js
├── reader/                          ← index.js, scroll-tracker.js
├── nav/                             ← index.js (stub)
├── marks/                           ← store.js, editor.js, indicator.js, tags.js (stubs)
├── review/                          ← hub.js, state.js (stubs)
├── settings/                        ← index.js (stub)
├── about/                           ← index.js (stub)
├── safety/                          ← input-validator.js
├── a11y/                            ← announcer.js
└── sw.js

vite.config.js                       ← Product build (index.html only)
vite.storyboard.config.js            ← Dev-only, extends base config
```

### Vite Configuration

**`vite.config.js`** — unchanged for product builds. Only `index.html` is an entry point.

**`vite.storyboard.config.js`** — separate config for storyboard dev:

```js
import { resolve } from 'path'
import baseConfig from './vite.config.js'

export default {
  ...baseConfig,
  root: '.',
  plugins: [], // No PWA plugin for storyboard
  build: {
    rollupOptions: {
      input: {
        storyboard: resolve(__dirname, 'storyboard/index.html'),
      },
    },
  },
}
```

**npm scripts**:
```json
{
  "dev": "vite",
  "dev:storyboard": "vite --config vite.storyboard.config.js"
}
```

### How the Two Configs Stay Separate

- `npm run dev` → loads `vite.config.js` → serves `index.html` → product app
- `npm run dev:storyboard` → loads `vite.storyboard.config.js` → serves `storyboard/index.html` → storyboard
- Both share the same `src/` directory via relative imports
- The PWA plugin is excluded from the storyboard config (no service worker needed)
- Production `npm run build` uses only `vite.config.js` — storyboard is never bundled

## Mock Data Layer

### `storyboard/mock-data.js`

Provides realistic data that mirrors the actual dataset structure:

```js
// Surah list (11 surahs for nav preview)
export const SURAHS = [
  { n: 1, name: 'Al-Fatiha', arabic: 'الفاتحة', type: 'Meccan', count: 7, juz: 1 },
  { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', type: 'Medinan', count: 286, juz: 1 },
  { n: 3, name: 'Aal-E-Imran', arabic: 'آل عمران', type: 'Medinan', count: 200, juz: 3 },
  // ... 8 more
]

// Full surah content (Arabic + English arrays)
export const SURAHS_CONTENT = {
  1: {
    ar: ['بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ', ...],
    en: ['In the name of God, the Gracious, the Merciful', 'All praise is due to God...', ...],
  },
  2: {
    ar: ['الٓمٓ', 'ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ', ...],
    en: ['Alif, Lam, Meem', 'This is the Book about which there is no doubt...', ...],
  },
}

// Mock marks
export const MOCK_MARKS = {
  '1:1': { verseKey: '1:1', tags: ['favourite'], updatedAt: Date.now() },
  '1:5': { verseKey: '1:5', tags: ['study'], updatedAt: Date.now() },
  '2:255': { verseKey: '2:255', tags: ['reflection', 'favourite'], updatedAt: Date.now() },
}

// Mock reading position
export const MOCK_POSITIONS = {
  's2': { id: 's2', surah: 2, verse: 25, savedAt: Date.now() },
}

// Mock settings
export const MOCK_SETTINGS = {
  theme: 'light',
  translationVisible: true,
  fontSize: 1,
}
```

### Data Injection

The storyboard intercepts module-level data access by:

1. **For implemented components** (reader): The scene module calls the real component's `init()` but first injects mock data into IndexedDB and mocks `fetch()` to return `SURAHS_CONTENT` instead of hitting the network.

2. **For stub components** (nav, marks, review, settings): The scene module renders mock DOM directly, using `SURAHS`, `MOCK_MARKS`, etc. as data sources.

## Scene System

### Scene Contract

Every scene module in `storyboard/scenes/` exports:

```js
// Name displayed in the scene switcher
export const name = 'Reader'

// State variants available in the dropdown
export const variants = [
  { label: 'Default', state: { surah: 1 } },
  { label: 'With Resume', state: { surah: 2, hasPosition: true } },
  { label: 'With Marks', state: { surah: 1, hasMarks: true } },
  { label: 'Translation Hidden', state: { surah: 1, hideTranslation: true } },
  { label: 'Error State', state: { surah: 1, forceError: true } },
]

// Render the scene into the container
export async function render(container, state) { ... }

// Clean up: remove listeners, reset DOM
export function cleanup() { ... }
```

### Scene Lifecycle

```
1. User clicks scene button
2. Controller calls currentScene.cleanup()
3. Controller clears #main-content, #top-bar, #nav-surface, #bottom-nav
4. Controller calls newScene.render(container, currentState)
5. Scene renders into the app shell containers
6. Annotations are re-applied (colored dots on annotated elements)
```

### Scene: Reader (`storyboard/scenes/reader.js`)

Imports the real `src/reader/index.js` and calls `init()` with mock data:

```js
import { init as initReader } from '../../src/reader/index.js'
import { SURAHS_CONTENT, SURAHS, MOCK_POSITIONS, MOCK_MARKS } from '../mock-data.js'

export const name = 'Reader'
export const variants = [
  { label: 'Default', state: { surah: 1 } },
  { label: 'With Resume', state: { surah: 2, hasPosition: true } },
  { label: 'With Marks', state: { surah: 1, hasMarks: true } },
  { label: 'Translation Hidden', state: { surah: 1, hideTranslation: true } },
  { label: 'Error State', state: { surah: 1, forceError: true } },
]

export async function render(container, state) {
  // Inject mock data into IDB
  if (state.hasPosition) {
    await put('positions', MOCK_POSITIONS['s2'])
  }
  if (state.hideTranslation) {
    await put('settings', { key: 'translationVisible', value: false })
  }

  // Mock fetch to return surah content
  setupMockFetch(SURAHS_CONTENT[state.surah], SURAHS)

  // Call real reader
  await initReader({ surah: String(state.surah) }, { savePosition: false })
}

export function cleanup() {
  // Reader exports cleanup internally
  // Reset mock fetch
  restoreRealFetch()
}
```

### Scene: Nav (`storyboard/scenes/nav.js`)

Renders mock DOM since `src/nav/index.js` is a stub:

```js
import { SURAHS, MOCK_MARKS } from '../mock-data.js'

export const name = 'Nav'
export const variants = [
  { label: 'Default', state: {} },
  { label: 'With Search', state: { showSearch: true } },
]

export async function render(container, state) {
  const navSurface = document.getElementById('nav-surface')
  navSurface.hidden = false
  navSurface.innerHTML = `
    <div class="qa-nav-panel">
      <input type="search" placeholder="Search surah or verse" ...>
      <ul class="qa-surah-list">
        ${SURAHS.map(s => `
          <li class="qa-surah-item" data-surah="${s.n}">
            <span class="qa-surah-number">${s.n}</span>
            <span class="qa-surah-name">${s.name}</span>
            <span class="qa-surah-meta">${s.count} verses</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `
}

export function cleanup() {
  document.getElementById('nav-surface').innerHTML = ''
  document.getElementById('nav-surface').hidden = true
}
```

### Scene: Marks (`storyboard/scenes/marks.js`)

Renders the mark editor modal mock:

```js
import { MOCK_MARKS, getTagDefaults } from '../mock-data.js'

export const name = 'Marks'
export const variants = [
  { label: 'New Mark', state: { verseKey: '1:1' } },
  { label: 'Existing Mark', state: { verseKey: '1:1', existing: true } },
]

export async function render(container, state) {
  // Renders bottom-sheet modal with tag grid
}

export function cleanup() { ... }
```

### Scene: Review (`storyboard/scenes/review.js`)

Renders the review hub mock:

```js
import { MOCK_MARKS, SURAHS_CONTENT } from '../mock-data.js'

export const name = 'Review'
export const variants = [
  { label: 'All Marks', state: { filter: 'all' } },
  { label: 'Favourite Only', state: { filter: 'favourite' } },
]

export async function render(container, state) {
  // Renders filter chips + grouped marks list
}

export function cleanup() { ... }
```

### Scene: Settings (`storyboard/scenes/settings.js`)

Renders the settings page mock:

```js
import { MOCK_SETTINGS } from '../mock-data.js'

export const name = 'Settings'
export const variants = [
  { label: 'Default', state: {} },
]

export async function render(container, state) {
  // Renders settings groups: Appearance, Reading, Data, About
}

export function cleanup() { ... }
```

## Annotation System

### Data Structure

Annotations are stored in `.superpowers/annotations.json`:

```json
{
  "reader.basmala": {
    "selector": ".qa-basmala",
    "comments": [
      { "text": "Font size too small compared to design mock", "resolved": false, "at": "2026-04-04T15:00:00Z" },
      { "text": "Fixed — increased to 1.75rem", "resolved": true, "at": "2026-04-04T16:00:00Z" }
    ]
  },
  "reader.verse": {
    "selector": ".qa-verse",
    "comments": [
      { "text": "Line height needs increase for readability", "resolved": false, "at": "2026-04-04T15:05:00Z" }
    ]
  }
}
```

### Annotation Key Convention

Keys follow the pattern `{scene}.{component}`:
- `reader.basmala` — basmala element in Reader scene
- `reader.verse` — verse blocks in Reader scene
- `nav.surah-item` — surah list items in Nav scene
- `marks.tag-grid` — tag selection grid in Marks scene
- `review.filter-chip` — filter chips in Review scene
- `settings.theme-picker` — theme picker in Settings scene

### `storyboard/annotations.js`

```js
// Load annotations from .superpowers/annotations.json
export async function loadAnnotations() { ... }

// Save annotations (writes to .superpowers/annotations.json)
export async function saveAnnotations(annotations) { ... }

// Get annotation count for a key
export function getAnnotationCount(key) { ... }

// Get unresolved count
export function getUnresolvedCount(key) { ... }
```

### Annotation Flow

1. **On scene render**: `applyAnnotations(container)` reads the annotations file, finds elements matching each selector, and places colored dots:
   - Red dot: has unresolved comments
   - Green dot: all comments resolved
   - Orange dot: no comments yet (newly annotated)

2. **Click to annotate**: Clicking an annotated element opens the comment panel. Clicking an unannotated element prompts to create a new annotation.

3. **Comment panel**: Slides in from the right, shows all comments for the selected component, with a text input to add new comments and a "Resolve" button.

4. **Persistence**: Comments are written to `.superpowers/annotations.json` via a Vite middleware or fetch API.

### Comment Panel UI

```
┌─────────────────────────────────┐
│ ✕  reader.basmala              │
├─────────────────────────────────┤
│                                 │
│  Font size too small            │
│  — 2 min ago                    │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Fixed — increased to 1.75rem   │
│  [Resolved] — 5 min ago         │
│                                 │
├─────────────────────────────────┤
│  [Add comment...]        [Send] │
│  [Resolve All]                  │
└─────────────────────────────────┘
```

## Overlay UI

### Layout

The overlay is a fixed-position panel in the top-right corner:

```
┌──────────────────────────────────┐
│ ⚡ Storyboard                    │
├──────────────────────────────────┤
│ SCENE                            │
│ [Reader] [Nav] [Marks] [Review]  │
│ [Settings]                       │
├──────────────────────────────────┤
│ THEME                            │
│ ○ Light   ○ Sepia   ○ Dark       │
├──────────────────────────────────┤
│ STATE                            │
│ [Default (first load)        ▼]  │
├──────────────────────────────────┤
│ DEVICE                           │
│ [🖥 Desktop] [📱 Mobile]         │
├──────────────────────────────────┤
│ ANNOTATIONS                      │
│ [💬 3 open]                     │
└──────────────────────────────────┘
```

### Responsive Behavior

- **Desktop**: Overlay is a fixed panel (280px wide) in the top-right corner
- **Mobile**: Overlay collapses to a floating action button (FAB) in the bottom-right corner. Tapping FAB opens a full-screen bottom sheet with the same controls
- **Device toggle**: When "Mobile" is selected, the app content is rendered inside a constrained container (`max-width: 375px`, centered, with device bezel styling)

### Overlay CSS (`storyboard/overlay.css`)

All overlay styles are scoped to `.qa-storyboard-*` classes to avoid conflicts with product CSS.

## Storyboard Entry Point

### `storyboard/index.html`

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuranAtlas — Storyboard</title>
  <link rel="stylesheet" href="/src/core/theme.css">
  <link rel="stylesheet" href="/storyboard/overlay.css">
</head>
<body>
  <div id="app-shell">
    <header id="top-bar"></header>
    <main id="main-content"></main>
    <nav id="nav-surface" hidden></nav>
    <footer id="bottom-nav"></footer>
  </div>
  <div id="storyboard-overlay"></div>
  <div id="comment-panel"></div>
  <script type="module" src="/storyboard/controller.js"></script>
</body>
</html>
```

### `storyboard/controller.js`

```js
import { loadAnnotations, saveAnnotations } from './annotations.js'
import * as readerScene from './scenes/reader.js'
import * as navScene from './scenes/nav.js'
import * as marksScene from './scenes/marks.js'
import * as reviewScene from './scenes/review.js'
import * as settingsScene from './scenes/settings.js'

const SCENES = { reader: readerScene, nav: navScene, marks: marksScene, review: reviewScene, settings: settingsScene }

let currentScene = null
let currentState = null
let annotations = null

export async function init() {
  annotations = await loadAnnotations()
  renderOverlay()
  switchScene('reader')
  setupAnnotationListeners()
}

export async function switchScene(sceneName) {
  if (currentScene) {
    currentScene.cleanup()
  }
  const scene = SCENES[sceneName]
  currentScene = scene
  currentState = scene.variants[0].state
  await scene.render(document.getElementById('main-content'), currentState)
  applyAnnotations(document.getElementById('app-shell'))
  updateStateDropdown(scene.variants)
}

export async function switchState(state) {
  currentScene.cleanup()
  currentState = state
  await currentScene.render(document.getElementById('main-content'), state)
  applyAnnotations(document.getElementById('app-shell'))
}

// ... overlay rendering, annotation click handlers, device toggle
```

## Upgrade Path: When a Stub Becomes Real

When a component is implemented in `src/`, the corresponding storyboard scene file is updated to import the real component:

**Before** (stub):
```js
// storyboard/scenes/nav.js — renders mock DOM
export async function render(container, state) {
  container.innerHTML = `<nav class="qa-nav-panel">...</nav>`
}
```

**After** (implemented):
```js
// storyboard/scenes/nav.js — imports real component
import { init as initNav } from '../../src/nav/index.js'

export async function render(container, state) {
  await initNav(state)
}
```

The `src/` directory is never modified for storyboard purposes. Only the storyboard scene file changes.

## Testing

### Manual Testing Checklist

1. `npm run dev:storyboard` starts without errors
2. All 5 scenes render correctly
3. Theme switching works (Light / Sepia / Dark)
4. Device toggle switches between desktop and mobile views
5. State variants render different content per scene
6. Click-to-annotate works on any element
7. Comments persist across page reloads
8. Resolved annotations show green dots
9. Comment panel opens/closes correctly
10. No product code is affected (run `npm run dev` to verify)

### No Product Impact

- `npm run build` produces the same output as before (storyboard is not included)
- `npm run dev` serves only the product app
- `src/` has zero imports from `storyboard/`
- ESLint only lints `src/` (unchanged)

## Future Enhancements

- **Export annotations**: Generate a markdown summary of open comments for sharing
- **Screenshot capture**: Take snapshots of specific scenes/states for comparison
- **Diff view**: Compare current rendering against a baseline screenshot
- **Keyboard shortcuts**: Quick scene/state switching via keyboard
- **Annotation filters**: Show only unresolved, or filter by scene
