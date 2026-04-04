# Storybook + UxNote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Set up Storybook with UxNote annotations for UI/UX iteration on QuranAtlas components and pages.

**Architecture:** Storybook (`@storybook/html-vite`) runs on its own dev server (port 6006) with viewport switching, theme backgrounds, and state variants. UxNote is vendored and injected as a decorator for click-to-annotate feedback. Stories import real `src/` components when available, render mock DOM for stubs.

**Tech Stack:** Storybook 10.x, @storybook/html-vite, UxNote v1.0.0, Vite 8.x, vanilla JS

---

## File Structure

```
.storybook/
├── main.js                    ← Storybook config (html-vite framework, addons)
├── preview.js                 ← Global decorators, backgrounds, viewport, UxNote injection
└── uxnote.min.js              ← Vendored UxNote script (MIT license)

stories/
├── mock-data.js               ← Mock surahs, content, marks, positions, fetch mock
├── reader.stories.js          ← Reader stories (imports real src/reader/index.js)
├── nav.stories.js             ← Nav stories (mock DOM — src/nav is stub)
├── marks.stories.js           ← Marks stories (mock DOM — src/marks is stub)
├── review.stories.js          ← Review stories (mock DOM — src/review is stub)
└── settings.stories.js        ← Settings stories (mock DOM — src/settings is stub)

package.json                   ← Add storybook scripts + 6 devDependencies
```

**No changes to `src/` or `vite.config.js`.** Storybook is completely isolated.

---

### Task 1: Install Storybook Dependencies and Base Config

**Files:**
- Create: `.storybook/main.js`
- Modify: `package.json` (add scripts + devDependencies)

- [x] **Step 1: Install Storybook dev dependencies**

Run:
```bash
pnpm add -D storybook @storybook/html-vite @storybook/addon-essentials @storybook/addon-interactions
```

Expected: All packages installed under devDependencies.

- [x] **Step 2: Add npm scripts to package.json**

Read `package.json`, then add these scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/",
    "check-chunks": "node scripts/check-chunks.js",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

- [x] **Step 3: Create `.storybook/main.js`**

```js
/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  stories: ['../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  staticDirs: ['../public'],
}

export default config
```

- [x] **Step 4: Verify Storybook starts**

Run:
```bash
timeout 15 pnpm storybook 2>&1 || true
```

Expected: Storybook starts on port 6006, no fatal errors. It will warn about no stories found (we haven't created them yet) — that's fine.

- [x] **Step 5: Commit**

```bash
git add .storybook/main.js package.json pnpm-lock.yaml
git commit -m "chore: add Storybook base config with html-vite framework"
```

---

### Task 2: Mock Data Module

**Files:**
- Create: `stories/mock-data.js`
- Test: `tests/unit/storybook/mock-data.test.js`

- [x] **Step 1: Write tests for mock data**

Create `tests/unit/storybook/mock-data.test.js`:

```js
import {
  SURAHS,
  SURAHS_CONTENT,
  MOCK_MARKS,
  MOCK_POSITIONS,
  setupMockData,
  setupMockFetch,
} from '../../../stories/mock-data.js'

describe('stories/mock-data.js', () => {
  describe('SURAHS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(SURAHS)).toBe(true)
      expect(SURAHS.length).toBeGreaterThan(0)
    })

    it('each surah has required fields', () => {
      for (const s of SURAHS) {
        expect(s).toHaveProperty('n')
        expect(s).toHaveProperty('name')
        expect(s).toHaveProperty('arabic')
        expect(s).toHaveProperty('type')
        expect(s).toHaveProperty('count')
      }
    })

    it('includes Al-Fatiha as surah 1', () => {
      const fatiha = SURAHS.find(s => s.n === 1)
      expect(fatiha).toBeTruthy()
      expect(fatiha.count).toBe(7)
    })
  })

  describe('SURAHS_CONTENT', () => {
    it('has ar and en arrays for surah 1', () => {
      expect(SURAHS_CONTENT[1]).toHaveProperty('ar')
      expect(SURAHS_CONTENT[1]).toHaveProperty('en')
      expect(Array.isArray(SURAHS_CONTENT[1].ar)).toBe(true)
      expect(Array.isArray(SURAHS_CONTENT[1].en)).toBe(true)
    })

    it('surah 1 has 7 verses', () => {
      expect(SURAHS_CONTENT[1].ar.length).toBe(7)
      expect(SURAHS_CONTENT[1].en.length).toBe(7)
    })

    it('ar and en arrays have matching lengths', () => {
      for (const [key, surah] of Object.entries(SURAHS_CONTENT)) {
        expect(surah.ar.length).toBe(surah.en.length)
      }
    })
  })

  describe('MOCK_MARKS', () => {
    it('has verseKey and tags for each entry', () => {
      for (const [key, mark] of Object.entries(MOCK_MARKS)) {
        expect(mark).toHaveProperty('verseKey')
        expect(mark).toHaveProperty('tags')
        expect(Array.isArray(mark.tags)).toBe(true)
      }
    })
  })

  describe('MOCK_POSITIONS', () => {
    it('has required position fields', () => {
      for (const [key, pos] of Object.entries(MOCK_POSITIONS)) {
        expect(pos).toHaveProperty('id')
        expect(pos).toHaveProperty('surah')
        expect(pos).toHaveProperty('verse')
        expect(pos).toHaveProperty('savedAt')
      }
    })
  })

  describe('setupMockFetch', () => {
    let originalFetch

    beforeAll(() => {
      originalFetch = globalThis.fetch
    })

    afterAll(() => {
      globalThis.fetch = originalFetch
    })

    it('returns surah content for dataset URLs', async () => {
      setupMockFetch(1)
      const res = await fetch('/dataset/surah/001.json')
      expect(res.ok).toBe(true)
      const data = await res.json()
      expect(data.ar.length).toBe(7)
    })

    it('returns surahs list for surahs.json', async () => {
      setupMockFetch(1)
      const res = await fetch('/dataset/surahs.json')
      expect(res.ok).toBe(true)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('falls through to original fetch for non-dataset URLs', async () => {
      setupMockFetch(1)
      // This will fail since we don't have a real server, but proves it calls original fetch
      expect(globalThis.fetch).not.toBe(originalFetch)
    })
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run tests/unit/storybook/mock-data.test.js 2>&1
```

Expected: FAIL — module not found (file doesn't exist yet).

- [x] **Step 3: Create mock data module**

Create `stories/mock-data.js`:

```js
/**
 * Mock data for Storybook stories.
 * Mirrors the actual dataset structure so stories render realistic content.
 */

export const SURAHS = [
  { n: 1, name: 'Al-Fatiha', arabic: 'الفاتحة', type: 'Meccan', count: 7, juz: 1 },
  { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', type: 'Medinan', count: 286, juz: 1 },
  { n: 3, name: "Aal-E-Imran", arabic: 'آل عمران', type: 'Medinan', count: 200, juz: 3 },
  { n: 18, name: 'Al-Kahf', arabic: 'الكهف', type: 'Meccan', count: 110, juz: 15 },
  { n: 19, name: 'Maryam', arabic: 'مريم', type: 'Meccan', count: 98, juz: 16 },
  { n: 36, name: 'Ya-Sin', arabic: 'يس', type: 'Meccan', count: 83, juz: 22 },
  { n: 55, name: 'Ar-Rahman', arabic: 'الرحمن', type: 'Medinan', count: 78, juz: 27 },
  { n: 67, name: 'Al-Mulk', arabic: 'الملك', type: 'Meccan', count: 30, juz: 29 },
  { n: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص', type: 'Meccan', count: 4, juz: 30 },
  { n: 113, name: 'Al-Falaq', arabic: 'الفلق', type: 'Meccan', count: 5, juz: 30 },
  { n: 114, name: 'An-Nas', arabic: 'الناس', type: 'Meccan', count: 6, juz: 30 },
]

export const SURAHS_CONTENT = {
  1: {
    ar: [
      'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
      'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ',
      'ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
      'مَـٰلِكِ يَوْمِ ٱلدِّينِ',
      'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
      'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
    ],
    en: [
      'In the name of God, the Gracious, the Merciful',
      'All praise is due to God, Lord of all worlds',
      'The Gracious, the Merciful',
      'Master of the Day of Judgment',
      'You alone we worship, and You alone we ask for help',
      'Guide us along the Straight Path',
      'The path of those You have blessed, not of those who earned Your anger, nor of those who went astray',
    ],
  },
  2: {
    ar: [
      'الٓمٓ',
      'ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ',
      'ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ وَمِمَّا رَزَقْنَـٰهُمْ يُنفِقُونَ',
      'وَٱلَّذِينَ يُؤْمِنُونَ بِمَآ أُنزِلَ إِلَيْكَ وَمَآ أُنزِلَ مِن قَبْلِكَ وَبِٱلْـَٔاخِرَةِ هُمْ يُوقِنُونَ',
      'أُو۟لَـٰٓئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُو۟لَـٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ',
    ],
    en: [
      'Alif, Lam, Meem',
      'This is the Book about which there is no doubt, a guidance for those conscious of God',
      'Who believe in the unseen, establish prayer, and spend out of what We have provided for them',
      'And who believe in what has been revealed to you and what was revealed before you, and of the Hereafter they are certain',
      'Those are upon guidance from their Lord, and it is those who are the successful',
    ],
  },
  36: {
    ar: [
      'يسٓ',
      'وَٱلْقُرْءَانِ ٱلْحَكِيمِ',
      'إِنَّكَ لَمِنَ ٱلْمُرْسَلِينَ',
    ],
    en: [
      'Ya, Sin',
      'By the wise Quran',
      'Indeed you are from among the messengers',
    ],
  },
  55: {
    ar: [
      'ٱلرَّحْمَـٰنُ',
      'عَلَّمَ ٱلْقُرْءَانَ',
      'خَلَقَ ٱلْإِنسَـٰنَ',
    ],
    en: [
      'The Most Merciful',
      'Taught the Quran',
      'Created man',
    ],
  },
  67: {
    ar: [
      'تَبَـٰرَكَ ٱلَّذِى بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَىْءٍ قَدِيرٌ',
    ],
    en: [
      'Blessed is He in whose hand is dominion, and He is over all things competent',
    ],
  },
  112: {
    ar: [
      'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
      'ٱللَّهُ ٱلصَّمَدُ',
      'لَمْ يَلِدْ وَلَمْ يُولَدْ',
      'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
    ],
    en: [
      'Say, "He is God, the One"',
      'God, the Eternal Refuge',
      'He neither begets nor is born',
      'Nor is there to Him any equivalent',
    ],
  },
  113: {
    ar: [
      'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ',
      'مِن شَرِّ مَا خَلَقَ',
      'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ',
      'وَمِن شَرِّ ٱلنَّفَّـٰثَـٰتِ فِى ٱلْعُقَدِ',
      'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
    ],
    en: [
      'Say, "I seek refuge in the Lord of daybreak"',
      'From the evil of that which He created',
      'And from the evil of darkness when it settles',
      'And from the evil of the blowers in knots',
      'And from the evil of an envier when he envies',
    ],
  },
  114: {
    ar: [
      'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ',
      'مَلِكِ ٱلنَّاسِ',
      'إِلَـٰهِ ٱلنَّاسِ',
      'مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ',
      'ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ',
      'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ',
    ],
    en: [
      'Say, "I seek refuge in the Lord of mankind"',
      'The Sovereign of mankind',
      'The God of mankind',
      'From the evil of the retreating whisperer',
      'Who whispers in the breasts of mankind',
      'From among jinn and mankind',
    ],
  },
}

export const MOCK_MARKS = {
  '1:1': { verseKey: '1:1', tags: ['favourite'], updatedAt: Date.now() },
  '1:5': { verseKey: '1:5', tags: ['study'], updatedAt: Date.now() },
  '2:255': { verseKey: '2:255', tags: ['reflection', 'favourite'], updatedAt: Date.now() },
  '36:1': { verseKey: '36:1', tags: ['study'], updatedAt: Date.now() },
}

export const MOCK_POSITIONS = {
  's2': { id: 's2', surah: 2, verse: 25, savedAt: Date.now() },
  's36': { id: 's36', surah: 36, verse: 1, savedAt: Date.now() },
}

/**
 * Inject mock data into IndexedDB for story args.
 * @param {object} args - Story args (hasPosition, hideTranslation, etc.)
 */
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

/**
 * Mock fetch to return surah content instead of hitting the network.
 * @param {number} surahNum - Surah number to mock
 */
export function setupMockFetch(surahNum) {
  const surah = SURAHS_CONTENT[surahNum]
  if (!surah) return

  const originalFetch = globalThis.fetch

  globalThis.fetch = async (url, ...rest) => {
    if (typeof url === 'string' && url.includes('/dataset/surah/')) {
      return { ok: true, status: 200, json: async () => surah }
    }
    if (typeof url === 'string' && url.includes('/dataset/surahs.json')) {
      return { ok: true, status: 200, json: async () => SURAHS }
    }
    return originalFetch(url, ...rest)
  }
}
```

- [x] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm vitest run tests/unit/storybook/mock-data.test.js 2>&1
```

Expected: All 9 tests pass.

- [x] **Step 5: Commit**

```bash
git add stories/mock-data.js tests/unit/storybook/mock-data.test.js
git commit -m "feat(storybook): add mock data module with tests"
```

---

### Task 3: Storybook Preview Config + Reader Stories

**Files:**
- Create: `.storybook/preview.js`
- Create: `stories/reader.stories.js`

- [x] **Step 1: Create `.storybook/preview.js`**

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
}

export default preview
```

- [x] **Step 2: Create `stories/reader.stories.js`**

```js
import { SURAHS_CONTENT, SURAHS, setupMockData, setupMockFetch } from './mock-data.js'

/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Pages/Reader',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    surah: {
      control: { type: 'select' },
      options: [1, 2, 36, 55, 67, 112, 113, 114],
      description: 'Surah number to render',
    },
    hasPosition: {
      control: 'boolean',
      description: 'Show resume indicator',
    },
    hideTranslation: {
      control: 'boolean',
      description: 'Hide English translation',
    },
  },
  args: {
    surah: 1,
    hasPosition: false,
    hideTranslation: false,
  },
}

/**
 * Create the app shell containers that the reader expects.
 */
function createAppShell() {
  // Clean up any existing shell
  const existing = document.getElementById('app-shell')
  if (existing) existing.remove()

  const appShell = document.createElement('div')
  appShell.id = 'app-shell'
  appShell.innerHTML = `
    <header id="top-bar"></header>
    <main id="main-content"></main>
    <nav id="nav-surface" hidden></nav>
    <footer id="bottom-nav"></footer>
  `
  document.body.appendChild(appShell)
  return appShell
}

/**
 * Set the theme based on Storybook background parameter.
 */
function applyThemeFromBackground() {
  const bgEl = document.querySelector('[data-storybook-background]')
  const bgName = bgEl?.textContent?.toLowerCase() || 'light'
  const themeMap = { light: 'light', sepia: 'sepia', dark: 'dark' }
  const theme = themeMap[bgName] || 'light'
  document.documentElement.setAttribute('data-theme', theme)
}

/** Default — Al-Fatiha, no special state */
export const Default = {
  args: { surah: 1 },
  render: async (args) => {
    createAppShell()
    applyThemeFromBackground()
    await setupMockData(args)
    setupMockFetch(args.surah)

    const { init } = await import('../src/reader/index.js')
    await init({ surah: String(args.surah) }, { savePosition: false })

    return document.getElementById('app-shell')
  },
}

/** With resume indicator (saved position on Al-Baqarah) */
export const WithResume = {
  args: { surah: 2, hasPosition: true },
  render: async (args) => {
    createAppShell()
    applyThemeFromBackground()
    await setupMockData(args)
    setupMockFetch(args.surah)

    const { init } = await import('../src/reader/index.js')
    await init({ surah: String(args.surah) }, { savePosition: false })

    return document.getElementById('app-shell')
  },
}

/** Translation hidden */
export const TranslationHidden = {
  args: { surah: 1, hideTranslation: true },
  render: async (args) => {
    createAppShell()
    applyThemeFromBackground()
    await setupMockData(args)
    setupMockFetch(args.surah)

    const { init } = await import('../src/reader/index.js')
    await init({ surah: String(args.surah) }, { savePosition: false })

    return document.getElementById('app-shell')
  },
}
```

- [x] **Step 3: Verify Storybook builds without errors**

Run:
```bash
pnpm build-storybook 2>&1
```

Expected: Build succeeds, outputs to `storybook-static/`. No errors about missing modules or syntax issues.

- [x] **Step 4: Commit**

```bash
git add .storybook/preview.js stories/reader.stories.js
git commit -m "feat(storybook): add Reader stories with resume and translation variants"
```

---

### Task 4: Nav, Marks, Review, Settings Stories

**Files:**
- Create: `stories/nav.stories.js`
- Create: `stories/marks.stories.js`
- Create: `stories/review.stories.js`
- Create: `stories/settings.stories.js`

- [x] **Step 1: Create `stories/nav.stories.js`**

```js
import { SURAHS } from './mock-data.js'

/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Components/Nav Panel',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    showSearch: {
      control: 'boolean',
      description: 'Show search input',
    },
  },
  args: {
    showSearch: true,
  },
}

function renderNavPanel(showSearch) {
  return `
    <div style="position:fixed;top:0;left:0;width:85%;max-width:320px;height:100dvh;background:var(--qa-bg-primary);border-right:1px solid var(--qa-border);box-shadow:2px 0 8px rgba(0,0,0,0.1);z-index:200;overflow-y:auto;">
      ${showSearch ? `
        <div style="padding:1rem;border-bottom:1px solid var(--qa-border);">
          <input type="search" placeholder="Search surah or verse" style="width:100%;padding:0.5rem;border:1px solid var(--qa-border);border-radius:4px;background:var(--qa-bg-secondary);color:var(--qa-text-primary);font-size:0.875rem;">
        </div>
      ` : ''}
      <ul style="list-style:none;padding:0;margin:0;">
        ${SURAHS.map(s => `
          <li style="display:flex;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--qa-border);cursor:pointer;" data-surah="${s.n}">
            <span style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:var(--qa-bg-secondary);border-radius:4px;font-size:0.75rem;color:var(--qa-text-secondary);margin-right:0.75rem;">${s.n}</span>
            <div style="flex:1;">
              <div style="font-size:0.875rem;color:var(--qa-text-primary);">${s.name}</div>
              <div style="font-size:0.75rem;color:var(--qa-text-secondary);">${s.count} verses · ${s.type}</div>
            </div>
            <span style="font-family:'Amiri',serif;font-size:1.1rem;color:var(--qa-text-secondary);direction:rtl;">${s.arabic}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `
}

/** Default — nav panel with search */
export const Default = {
  args: { showSearch: true },
  render: (args) => renderNavPanel(args.showSearch),
}

/** Without search */
export const WithoutSearch = {
  args: { showSearch: false },
  render: (args) => renderNavPanel(args.showSearch),
}
```

- [x] **Step 2: Create `stories/marks.stories.js`**

```js
/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Components/Mark Editor',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    hasExistingMark: {
      control: 'boolean',
      description: 'Show existing tags as selected',
    },
  },
  args: {
    hasExistingMark: false,
  },
}

const TAGS = [
  { label: 'Favourite', color: '#f59e0b', emoji: '⭐' },
  { label: 'Study', color: '#3b82f6', emoji: '📖' },
  { label: 'Reflection', color: '#22c55e', emoji: '💭' },
  { label: 'Question', color: '#a855f7', emoji: '❓' },
]

function renderMarkEditor(hasExistingMark) {
  return `
    <div style="width:375px;max-width:100%;background:var(--qa-bg-primary);border-radius:12px 12px 0 0;box-shadow:0 -4px 20px rgba(0,0,0,0.15);overflow:hidden;">
      <!-- Verse preview -->
      <div style="padding:1rem;border-bottom:1px solid var(--qa-border);background:var(--qa-bg-secondary);">
        <div style="font-size:0.75rem;color:var(--qa-text-secondary);margin-bottom:0.5rem;">Marking verse 1:1</div>
        <div style="font-family:'Amiri',serif;font-size:1.25rem;direction:rtl;text-align:right;color:var(--qa-text-primary);margin-bottom:0.5rem;">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>
        <div style="font-size:0.8rem;color:var(--qa-text-secondary);">In the name of God, the Gracious, the Merciful</div>
      </div>

      <!-- Tag grid -->
      <div style="padding:1rem;">
        <div style="font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">Tags</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
          ${TAGS.map(tag => `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;border:2px solid ${hasExistingMark && tag.label === 'Favourite' ? tag.color : 'var(--qa-border)'};border-radius:8px;cursor:pointer;background:${hasExistingMark && tag.label === 'Favourite' ? tag.color + '15' : 'transparent'};">
              <span style="font-size:1rem;">${tag.emoji}</span>
              <span style="font-size:0.875rem;color:var(--qa-text-primary);">${tag.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Actions -->
      <div style="display:flex;gap:0.5rem;padding:1rem;border-top:1px solid var(--qa-border);">
        ${hasExistingMark ? `
          <button style="flex:1;padding:0.5rem;border:1px solid #ef4444;color:#ef4444;background:transparent;border-radius:6px;font-size:0.875rem;cursor:pointer;">Delete</button>
        ` : ''}
        <button style="flex:1;padding:0.5rem;border:none;color:var(--qa-bg-primary);background:var(--qa-accent);border-radius:6px;font-size:0.875rem;cursor:pointer;">Save</button>
      </div>
    </div>
  `
}

/** New mark — no tags selected */
export const NewMark = {
  args: { hasExistingMark: false },
  render: (args) => renderMarkEditor(args.hasExistingMark),
}

/** Existing mark — Favourite tag selected */
export const ExistingMark = {
  args: { hasExistingMark: true },
  render: (args) => renderMarkEditor(args.hasExistingMark),
}
```

- [x] **Step 3: Create `stories/review.stories.js`**

```js
/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Pages/Review Hub',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    filter: {
      control: { type: 'select' },
      options: ['all', 'favourite', 'study', 'reflection', 'question'],
      description: 'Filter marks by tag',
    },
  },
  args: {
    filter: 'all',
  },
}

const MOCK_REVIEW_DATA = [
  {
    surah: 'Al-Fatiha',
    verses: [
      { key: '1:1', ar: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', en: 'In the name of God, the Gracious, the Merciful', tags: ['favourite'] },
      { key: '1:5', ar: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', en: 'You alone we worship, and You alone we ask for help', tags: ['study'] },
    ],
  },
  {
    surah: 'Ya-Sin',
    verses: [
      { key: '36:1', ar: 'يسٓ', en: 'Ya, Sin', tags: ['study'] },
    ],
  },
]

const TAG_COLORS = {
  favourite: '#f59e0b',
  study: '#3b82f6',
  reflection: '#22c55e',
  question: '#a855f7',
}

function renderReviewHub(filter) {
  const filteredData = MOCK_REVIEW_DATA.map(surah => ({
    ...surah,
    verses: filter === 'all'
      ? surah.verses
      : surah.verses.filter(v => v.tags.includes(filter)),
  })).filter(surah => surah.verses.length > 0)

  return `
    <div style="min-height:100dvh;background:var(--qa-bg-primary);">
      <!-- Header -->
      <div style="padding:1rem;border-bottom:1px solid var(--qa-border);">
        <h2 style="font-size:1.25rem;color:var(--qa-text-primary);margin:0 0 0.75rem;">Review Marks</h2>
        <!-- Filter chips -->
        <div style="display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:0.25rem;">
          ${['all', 'favourite', 'study', 'reflection', 'question'].map(tag => `
            <button style="padding:0.25rem 0.75rem;border:1px solid ${tag === filter ? TAG_COLORS[tag] || 'var(--qa-accent)' : 'var(--qa-border)'};border-radius:999px;font-size:0.75rem;cursor:pointer;background:${tag === filter ? (TAG_COLORS[tag] || 'var(--qa-accent)') + '20' : 'transparent'};color:${tag === filter ? (TAG_COLORS[tag] || 'var(--qa-accent)') : 'var(--qa-text-secondary)'};white-space:nowrap;text-transform:capitalize;">
              ${tag}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Marks list -->
      <div style="padding:1rem;">
        ${filteredData.length === 0 ? `
          <div style="text-align:center;padding:2rem;color:var(--qa-text-secondary);">No marks found for this filter.</div>
        ` : filteredData.map(surah => `
          <div style="margin-bottom:1.5rem;">
            <h3 style="font-size:0.875rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">${surah.surah}</h3>
            ${surah.verses.map(v => `
              <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
                <div style="font-size:0.7rem;color:var(--qa-text-secondary);margin-bottom:0.25rem;">${v.key}</div>
                <div style="font-family:'Amiri',serif;font-size:1.1rem;direction:rtl;text-align:right;color:var(--qa-text-primary);margin-bottom:0.25rem;">${v.ar}</div>
                <div style="font-size:0.8rem;color:var(--qa-text-secondary);margin-bottom:0.5rem;">${v.en}</div>
                <div style="display:flex;gap:0.25rem;">
                  ${v.tags.map(t => `
                    <span style="padding:0.125rem 0.5rem;background:${TAG_COLORS[t]}20;color:${TAG_COLORS[t]};border-radius:999px;font-size:0.7rem;text-transform:capitalize;">${t}</span>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `
}

/** All marks */
export const AllMarks = {
  args: { filter: 'all' },
  render: (args) => renderReviewHub(args.filter),
}

/** Favourite only */
export const FavouriteOnly = {
  args: { filter: 'favourite' },
  render: (args) => renderReviewHub(args.filter),
}

/** Study only */
export const StudyOnly = {
  args: { filter: 'study' },
  render: (args) => renderReviewHub(args.filter),
}
```

- [x] **Step 4: Create `stories/settings.stories.js`**

```js
/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Pages/Settings',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

function renderSettings() {
  return `
    <div style="min-height:100dvh;background:var(--qa-bg-primary);padding:1rem;">
      <h2 style="font-size:1.25rem;color:var(--qa-text-primary);margin:0 0 1.5rem;">Settings</h2>

      <!-- Appearance -->
      <div style="margin-bottom:1.5rem;">
        <h3 style="font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">Appearance</h3>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="font-size:0.875rem;color:var(--qa-text-primary);margin-bottom:0.5rem;">Theme</div>
          <div style="display:flex;gap:0.5rem;">
            <div style="width:32px;height:32px;border-radius:50%;background:#ffffff;border:2px solid var(--qa-accent);"></div>
            <div style="width:32px;height:32px;border-radius:50%;background:#f5e6d3;border:2px solid transparent;"></div>
            <div style="width:32px;height:32px;border-radius:50%;background:#0f0f13;border:2px solid transparent;"></div>
          </div>
        </div>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">Show Translation</span>
            <div style="width:40px;height:24px;background:var(--qa-accent);border-radius:12px;position:relative;">
              <div style="width:20px;height:20px;background:white;border-radius:50%;position:absolute;top:2px;right:2px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reading -->
      <div style="margin-bottom:1.5rem;">
        <h3 style="font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">Reading</h3>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">Show Mark Indicators</span>
            <div style="width:40px;height:24px;background:var(--qa-accent);border-radius:12px;position:relative;">
              <div style="width:20px;height:20px;background:white;border-radius:50%;position:absolute;top:2px;right:2px;"></div>
            </div>
          </div>
        </div>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">Auto-save Position</span>
            <div style="width:40px;height:24px;background:var(--qa-accent);border-radius:12px;position:relative;">
              <div style="width:20px;height:20px;background:white;border-radius:50%;position:absolute;top:2px;right:2px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data -->
      <div style="margin-bottom:1.5rem;">
        <h3 style="font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">Data</h3>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">Dataset Version</span>
            <span style="font-size:0.875rem;color:var(--qa-text-secondary);">1.0.0</span>
          </div>
        </div>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">Marks Count</span>
            <span style="font-size:0.875rem;color:var(--qa-text-secondary);">4</span>
          </div>
        </div>
      </div>

      <!-- About -->
      <div>
        <h3 style="font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">About</h3>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">App Version</span>
            <span style="font-size:0.875rem;color:var(--qa-text-secondary);">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  `
}

/** Default settings page */
export const Default = {
  render: () => renderSettings(),
}
```

- [x] **Step 5: Verify Storybook builds with all stories**

Run:
```bash
pnpm build-storybook 2>&1
```

Expected: Build succeeds with all 5 story groups (Reader, Nav, Marks, Review, Settings). No errors.

- [x] **Step 6: Commit**

```bash
git add stories/nav.stories.js stories/marks.stories.js stories/review.stories.js stories/settings.stories.js
git commit -m "feat(storybook): add Nav, Marks, Review, Settings stories"
```

---

### Task 5: UxNote Integration

**Files:**
- Create: `storybook/uxnote.min.js` (vendored)
- Modify: `.storybook/main.js` (add staticDirs)
- Modify: `.storybook/preview.js` (add UxNote decorator)

- [x] **Step 1: Create `storybook/` directory and download UxNote**

Run:
```bash
mkdir -p storybook && curl -L -o storybook/uxnote.min.js https://github.com/ninefortyonestudio/uxnote/releases/download/v1.0.0/uxnote.min-v1.0.0.js
```

Expected: File downloaded, ~20-50KB.

- [x] **Step 2: Update `.storybook/main.js` to serve the `storybook/` directory**

Read the current `.storybook/main.js`, then update `staticDirs`:

```js
/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  stories: ['../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  staticDirs: ['../public', '../storybook'],
}

export default config
```

- [x] **Step 3: Update `.storybook/preview.js` to inject UxNote**

Read the current `.storybook/preview.js`, then replace it with:

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
    /**
     * Inject UxNote annotation tool into Storybook preview.
     * Loads the vendored script after each story renders.
     */
    (storyFn, context) => {
      const html = storyFn()

      // Inject UxNote after DOM update
      requestAnimationFrame(() => {
        if (!document.getElementById('uxnote-script')) {
          const script = document.createElement('script')
          script.id = 'uxnote-script'
          script.src = '/uxnote.min.js'
          script.defer = true
          document.body.appendChild(script)
        }
      })

      return html
    },
  ],
}

export default preview
```

- [x] **Step 4: Verify Storybook builds**

Run:
```bash
pnpm build-storybook 2>&1
```

Expected: Build succeeds. UxNote script accessible at `/uxnote.min.js`.

- [x] **Step 5: Commit**

```bash
git add storybook/uxnote.min.js .storybook/preview.js .storybook/main.js
git commit -m "feat(storybook): integrate UxNote annotation tool"
```

---

### Task 6: Final Verification and Cleanup

**Files:**
- No new files — verification only

- [x] **Step 1: Run all product tests to ensure nothing broke**

Run:
```bash
pnpm test:run 2>&1
```

Expected: 37/37 tests pass (same as before).

- [x] **Step 2: Run product lint**

Run:
```bash
pnpm lint 2>&1
```

Expected: 0 errors, 1 warning (pre-existing from app.js console.log).

- [x] **Step 3: Run product build**

Run:
```bash
pnpm build 2>&1
```

Expected: Build succeeds, no errors.

- [x] **Step 4: Run Storybook build**

Run:
```bash
pnpm build-storybook 2>&1
```

Expected: Build succeeds, outputs to `storybook-static/`.

- [x] **Step 5: Add .gitignore entries**

Read `.gitignore`, add if not present:

```
storybook-static/
```

- [x] **Step 6: Final commit**

```bash
git add .gitignore
git commit -m "chore: add storybook-static to gitignore"
```

---

## Summary of All Commits

1. `chore: add Storybook base config with html-vite framework`
2. `feat(storybook): add mock data module with tests`
3. `feat(storybook): add Reader stories with resume and translation variants`
4. `feat(storybook): add Nav, Marks, Review, Settings stories`
5. `feat(storybook): integrate UxNote annotation tool`
6. `chore: add storybook-static to gitignore`
