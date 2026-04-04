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
