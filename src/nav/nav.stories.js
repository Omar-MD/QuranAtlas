import { setupMockFetch } from '../../stories/mock-data.js'

/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Components/Nav Panel',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

async function renderNav() {
  setupMockFetch(1)

  const { init } = await import('./index.js')
  await init()

  // Open the nav panel so it's visible in the story
  const navSurface = document.getElementById('nav-surface')
  if (navSurface) {
    navSurface.classList.add('qa-nav-open')
  }
  const backdrop = document.querySelector('.qa-nav-backdrop')
  if (backdrop) {
    backdrop.classList.add('qa-nav-open')
  }

  return document.getElementById('app-shell')
}

/** Default — nav panel open with all surahs */
export const Default = {
  render: renderNav,
}
