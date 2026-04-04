# Storyboard System — Design Spec (Storybook + UxNote)

## Overview

A Storybook-based UI development environment for QuranAtlas with UxNote annotations for visual feedback. Uses `@storybook/html-vite` for component/page preview with device viewport switching, theme backgrounds, and state variants. UxNote provides click-to-annotate feedback directly on rendered stories.

**Purpose**: Enable rapid design iteration and UX flow testing using industry-standard tools. When a component is implemented in `src/`, Storybook stories import the real module — no custom storyboard infrastructure needed.

**Key capabilities**:
- **Storybook** — component/page preview in isolation with Vite HMR
- **Viewport addon** — device frame toggle (375px mobile, 768px tablet, desktop)
- **Backgrounds addon** — theme switching (Light / Sepia / Dark)
- **Controls/Args** — state variants per story (default, with resume, with marks, error, etc.)
- **Module mocking** — mock dataset.js and db.js for stories that need fake data
- **UxNote** — click-to-annotate any element, export feedback to JSON, email handoff

## Architecture

### File Layout

```
.storybook/                            ← Storybook configuration
├── main.js                            ← Storybook config (html-vite framework)
├── preview.js                         ← Global decorators, backgrounds, theme setup
└── uxnote-decorator.js                ← Injects UxNote into Storybook preview

stories/                               ← Story files (co-located or separate)
├── reader.stories.js                  ← Reader scenes with mock data
├── nav.stories.js                     ← Nav panel scenes
├── marks.stories.js                   ← Mark editor scenes
├── review.stories.js                  ← Review hub scenes
└── settings.stories.js                ← Settings page scenes

src/                                   ← Product code ONLY (no storyboard imports)
├── core/                              ← db, events, router, theme.css, constants
├── data/                              ← dataset.js, offline.js
├── reader/                            ← index.js, scroll-tracker.js
├── nav/                               ← index.js (stub)
├── marks/                             ← store.js, editor.js, indicator.js, tags.js (stubs)
├── review/                            ← hub.js, state.js (stubs)
├── settings/                          ← index.js (stub)
├── about/                             ← index.js (stub)
├── safety/                            ← input-validator.js
├── a11y/                              ← announcer.js
└── sw.js

vite.config.js                         ← Product build (unchanged)
package.json                           ← New scripts: "storybook", "build-storybook"
```

### Dependencies

**New devDependencies**:
- `@storybook/html-vite` — Storybook framework for vanilla HTML/JS with Vite
- `storybook` — Core Storybook package
- `@storybook/addon-viewport` — Device viewport switching (bundled with essentials)
- `@storybook/addon-backgrounds` — Theme background switching (bundled with essentials)
- `@storybook/addon-controls` — State variant controls (bundled with essentials)
- `@storybook/addon-docs` — Auto-generated documentation (bundled with essentials)

**UxNote**: No npm install. Loaded via `<script>` tag from CDN or vendored file in `.storybook/`. MIT license, zero dependencies.

### npm Scripts

```json
{
  "dev": "vite",
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

**Workflow**:
- `npm run dev` → main app at `http://localhost:5173/`
- `npm run storybook` → Storybook at `http://localhost:6006/`
- `npm run build-storybook` → static Storybook build in `storybook-static/` (shareable)

### How Storybook and Product Stay Separate

- Storybook runs on its own dev server (port 6006), completely independent of Vite
- Storybook has its own `.storybook/` config directory — no changes to `vite.config.js`
- Stories import from `src/` via relative paths — `src/` never imports from `stories/`
- `npm run build` (product) is unaffected — Storybook is not part of the product build
- `npm run build-storybook` produces a static site in `storybook-static/` for sharing

## Story Structure

### Story File Pattern

Each story file exports a default meta object and named story exports:

```js
// stories/reader.stories.js

/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Pages/Reader',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      values: [
        { name: 'Light', value: '#ffffff' },
        { name: 'Sepia', value: '#f5e6d3' },
        { name: 'Dark', value: '#0f0f13' },
      ],
    },
  },
  argTypes: {
    surah: {
      control: { type: 'select' },
      options: [1, 2, 3, 36, 55, 67, 112, 113, 114],
      description: 'Surah number to render',
    },
    hasPosition: {
      control: 'boolean',
      description: 'Show resume indicator',
    },
    hasMarks: {
      control: 'boolean',
      description: 'Show mark indicators on verses',
    },
    hideTranslation: {
      control: 'boolean',
      description: 'Hide English translation',
    },
    forceError: {
      control: 'boolean',
      description: 'Simulate network error',
    },
  },
}

// Default story
export const Default = {
  args: { surah: 1 },
}

// With resume indicator
export const WithResume = {
  args: { surah: 2, hasPosition: true },
}

// With marks
export const WithMarks = {
  args: { surah: 1, hasMarks: true },
}

// Translation hidden
export const TranslationHidden = {
  args: { surah: 1, hideTranslation: true },
}

// Error state
export const ErrorState = {
  args: { surah: 1, forceError: true },
}
```

### Render Function

Each story's render function sets up the app shell, injects mock data, and calls the real component:

```js
export const Default = {
  args: { surah: 1 },
  render: async (args) => {
    // Create app shell containers
    const appShell = document.createElement('div')
    appShell.id = 'app-shell'
    appShell.innerHTML = `
      <header id="top-bar"></header>
      <main id="main-content"></main>
      <nav id="nav-surface" hidden></nav>
      <footer id="bottom-nav"></footer>
    `
    document.body.appendChild(appShell)

    // Inject theme CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/src/core/theme.css'
    document.head.appendChild(link)

    // Set theme from background parameter
    const theme = document.querySelector('[data-storybook-background]')?.textContent?.toLowerCase() || 'light'
    document.documentElement.setAttribute('data-theme', theme)

    // Inject mock data into IndexedDB
    await setupMockData(args)

    // Mock fetch to return surah content
    setupMockFetch(args.surah)

    // Import and call real reader
    const { init } = await import('../src/reader/index.js')
    await init({ surah: String(args.surah) }, { savePosition: false })

    return appShell
  },
}
```

### Mock Data Layer

```js
// stories/mock-data.js

export const SURAHS = [
  { n: 1, name: 'Al-Fatiha', arabic: 'الفاتحة', type: 'Meccan', count: 7, juz: 1 },
  { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', type: 'Medinan', count: 286, juz: 1 },
  // ... 8 more for nav list
]

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

export const MOCK_MARKS = {
  '1:1': { verseKey: '1:1', tags: ['favourite'], updatedAt: Date.now() },
  '1:5': { verseKey: '1:5', tags: ['study'], updatedAt: Date.now() },
}

export const MOCK_POSITIONS = {
  's2': { id: 's2', surah: 2, verse: 25, savedAt: Date.now() },
}
```

### Mock Injection

```js
// stories/mock-data.js

export async function setupMockData(args) {
  const { openDB, put } = await import('../src/core/db.js')
  await openDB()

  if (args.hasPosition) {
    await put('positions', MOCK_POSITIONS['s2'])
  }
  if (args.hideTranslation) {
    await put('settings', { key: 'translationVisible', value: false })
  }
}

export function setupMockFetch(surahNum) {
  const surah = SURAHS_CONTENT[surahNum]
  const originalFetch = window.fetch

  window.fetch = async (url, ...rest) => {
    if (typeof url === 'string' && url.includes('/dataset/surah/')) {
      return { ok: true, status: 200, json: async () => surah }
    }
    if (typeof url === 'string' && url.includes('/dataset/surahs.json')) {
      return { ok: true, status: 200, json: async () => SURAHS }
    }
    return originalFetch(url, ...rest)
  }
}

export function restoreRealFetch() {
  // Storybook reloads the iframe per story, so fetch is naturally restored
}
```

## Storybook Configuration

### `.storybook/main.js`

```js
/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  stories: ['../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',  // includes viewport, backgrounds, controls, docs
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  staticDirs: ['../public'],  // Serve dataset files if needed
}

export default config
```

### `.storybook/preview.js`

```js
/** @type { import('@storybook/html').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile (375px)',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet (768px)',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '100%', height: '100%' },
        },
      },
      defaultViewport: 'desktop',
    },
    backgrounds: {
      values: [
        { name: 'Light', value: '#ffffff' },
        { name: 'Sepia', value: '#f5e6d3' },
        { name: 'Dark', value: '#0f0f13' },
      ],
      default: 'Light',
    },
    layout: 'fullscreen',
  },
  decorators: [
    // UxNote decorator — injects annotation tool into preview
    (story) => {
      const container = document.createElement('div')
      container.innerHTML = story()
      return container.innerHTML
    },
  ],
}

export default preview
```

### UxNote Integration

UxNote is injected as a decorator in `.storybook/preview.js` or as a custom addon. The simplest approach:

```js
// .storybook/preview.js — UxNote injection
const preview = {
  // ... other config
  decorators: [
    (storyFn, context) => {
      // Render story
      const html = storyFn()

      // Inject UxNote script after DOM is ready
      requestAnimationFrame(() => {
        if (!document.getElementById('uxnote-script')) {
          const script = document.createElement('script')
          script.id = 'uxnote-script'
          script.src = 'https://github.com/ninefortyonestudio/uxnote/releases/download/v1.0.0/uxnote.min-v1.0.0.js'
          script.defer = true
          document.body.appendChild(script)
        }
      })

      return html
    },
  ],
}
```

Alternatively, UxNote can be vendored locally at `.storybook/uxnote.min.js` to avoid CDN dependency and CSP issues.

## Scene Stories

### Reader Stories (`stories/reader.stories.js`)

Imports the real `src/reader/index.js`. Each variant is a named export with different args.

**Variants**:
- `Default` — Al-Fatiha, no special state
- `WithResume` — Al-Baqarah with saved position (shows resume indicator)
- `WithMarks` — Al-Fatiha with mock marks (shows colored dots on verses)
- `TranslationHidden` — Al-Fatiha with translation toggle off
- `ErrorState` — Simulated network failure

### Nav Stories (`stories/nav.stories.js`)

Since `src/nav/index.js` is a stub, the story renders mock DOM directly:

```js
export const Default = {
  render: () => {
    const nav = document.createElement('nav')
    nav.id = 'nav-surface'
    nav.hidden = false
    nav.innerHTML = `
      <div class="qa-nav-panel">
        <input type="search" placeholder="Search surah or verse" class="qa-nav-search">
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
    return nav.outerHTML
  },
}
```

### Marks Stories (`stories/marks.stories.js`)

Renders the mark editor modal mock:

**Variants**:
- `NewMark` — Empty tag selection for verse 1:1
- `ExistingMark` — Pre-filled tags for verse 1:1

### Review Stories (`stories/review.stories.js`)

Renders the review hub mock:

**Variants**:
- `AllMarks` — Shows all marks grouped by surah
- `FilteredFavourite` — Only marks tagged "favourite"

### Settings Stories (`stories/settings.stories.js`)

Renders the settings page mock:

**Variants**:
- `Default` — All settings at default values

## Upgrade Path: When a Stub Becomes Real

When a component is implemented in `src/`, the corresponding story file is updated to import the real module:

**Before** (stub — renders mock DOM):
```js
// stories/nav.stories.js
export const Default = {
  render: () => `<nav class="qa-nav-panel">...</nav>`,
}
```

**After** (implemented — imports real component):
```js
// stories/nav.stories.js
export const Default = {
  render: async () => {
    const { init } = await import('../src/nav/index.js')
    await init({})
    return document.getElementById('nav-surface').outerHTML
  },
}
```

The `src/` directory is never modified for Storybook purposes. Only the story file changes.

## Annotation Workflow with UxNote

### How UxNote Works in Storybook

1. **UxNote loads** — Script is injected into Storybook's preview iframe via decorator
2. **User annotates** — Click any element in the Storybook preview to pin a comment
3. **Export feedback** — UxNote panel provides "Export JSON" and "Email" buttons
4. **Process feedback** — Exported JSON contains element selectors, comments, and positions

### Annotation Data (UxNote Export)

```json
{
  "title": "QuranAtlas Storybook — Reader/WithResume",
  "date": "2026-04-04T16:00:00Z",
  "annotations": [
    {
      "type": "element",
      "selector": ".qa-basmala",
      "text": "Font size too small compared to design mock",
      "position": { x: 187, y: 120 }
    },
    {
      "type": "element",
      "selector": ".qa-verse:nth-child(3)",
      "text": "Line height needs increase for readability",
      "position": { x: 187, y: 240 }
    }
  ]
}
```

### UxNote Configuration

```js
// .storybook/preview.js — UxNote config
window.uxnoteConfig = {
  colorForHighlight: '#f59e0b',       // Amber (matches QuranAtlas accent)
  isBackdropVisible: false,
  isToolVisibleAtFirstLaunch: true,
  'data-mailto': 'team@example.com',  // Email recipient for feedback handoff
}
```

## Testing

### Manual Testing Checklist

1. `npm run storybook` starts without errors on port 6006
2. All 5 scene groups appear in Storybook sidebar (Reader, Nav, Marks, Review, Settings)
3. Viewport addon switches between Mobile (375px), Tablet (768px), Desktop
4. Backgrounds addon switches themes (Light / Sepia / Dark)
5. Controls panel shows args for each story (surah, hasPosition, etc.)
6. Reader stories render real verses with correct Arabic text
7. UxNote loads in preview — annotation toolbar is visible
8. Click-to-annotate works on any element in the preview
9. Export JSON contains correct selectors and comments
10. No product code is affected (`npm run dev` and `npm run build` unchanged)

### No Product Impact

- `npm run build` produces the same output as before (Storybook is not included)
- `npm run dev` serves only the product app
- `src/` has zero imports from `stories/` or `.storybook/`
- ESLint only lints `src/` (unchanged)
- `vite.config.js` is unchanged

## Future Enhancements

- **Interaction tests** — Use Storybook's `play` function to automate UI flow testing
- **Accessibility addon** — `@storybook/addon-a11y` for automated a11y auditing
- **Visual regression** — Chromatic or Percy for screenshot-based regression testing
- **Published Storybook** — Deploy `storybook-static/` to GitHub Pages for team review
- **Module mocking** — Use Storybook's `parameters.mocks` for advanced data mocking
