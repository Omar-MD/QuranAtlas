import { SURAHS_CONTENT, SURAHS, setupMockData, setupMockFetch } from '../../stories/mock-data.js'

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
 * Shared render function for all reader stories.
 * Uses the real init() from reader/index.js with mock data.
 */
async function renderReader(args) {
  await setupMockData(args)
  setupMockFetch(args.surah)

  const { init } = await import('./index.js')
  await init({ surah: String(args.surah) }, { savePosition: false })

  return document.getElementById('app-shell')
}

/** Default — Al-Fatiha, no special state */
export const Default = {
  args: { surah: 1 },
  render: renderReader,
}

/** With resume indicator (saved position on Al-Baqarah) */
export const WithResume = {
  args: { surah: 2, hasPosition: true },
  render: renderReader,
}

/** Translation hidden */
export const TranslationHidden = {
  args: { surah: 1, hideTranslation: true },
  render: renderReader,
}
