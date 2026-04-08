// tests/unit/about/about-page.test.js
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { openDB, put } from '../../../src/core/db.js'

// Mock announcer
vi.mock('../../../src/a11y/announcer.js', () => ({
  announce: vi.fn(),
}))

let aboutPage

beforeEach(async () => {
  vi.clearAllMocks()
  await openDB()
  document.body.textContent = ''
  const shell = document.createElement('div')
  shell.id = 'app-shell'
  const main = document.createElement('main')
  main.id = 'main-content'
  shell.appendChild(main)
  document.body.appendChild(shell)

  aboutPage = await import('../../../src/about/index.js')
})

describe('about/index.js', () => {
  describe('init()', () => {
    it('renders about page with heading and mission', async () => {
      await aboutPage.init()
      const main = document.getElementById('main-content')

      const heading = main.querySelector('h1')
      expect(heading).not.toBeNull()
      expect(heading.textContent).toBe('QuranAtlas')

      const mission = main.querySelector('.qa-about-mission')
      expect(mission).not.toBeNull()
      expect(mission.textContent).toContain('Read, reflect, remember')
    })

    it('renders app version from __APP_VERSION__', async () => {
      await aboutPage.init()
      const versionEl = document.querySelector('.qa-about-app-version')
      expect(versionEl).not.toBeNull()
      // __APP_VERSION__ is defined as '1.0.0' in vite.config.js
      expect(versionEl.textContent).toContain('1.0.0')
    })

    it('renders dataset version from IDB or fallback', async () => {
      await aboutPage.init()
      const dsVersionEl = document.querySelector('.qa-about-dataset-version')
      expect(dsVersionEl).not.toBeNull()
      // No datasetMeta seeded, so fallback text
      expect(dsVersionEl.textContent).toContain('Not yet installed')
    })

    it('renders dataset version when datasetMeta exists in IDB', async () => {
      await put('datasetMeta', { id: 'version', version: '2.1.0' })
      await aboutPage.init()
      const dsVersionEl = document.querySelector('.qa-about-dataset-version')
      expect(dsVersionEl.textContent).toContain('2.1.0')
    })

    it('renders attribution section', async () => {
      await aboutPage.init()
      const attribution = document.querySelector('.qa-about-attribution')
      expect(attribution).not.toBeNull()
      expect(attribution.textContent).toContain('Bridges')
      expect(attribution.textContent).toContain('KFGQPC')
    })

    it('renders storage section with meter', async () => {
      // Mock navigator.storage.estimate
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockResolvedValue({ usage: 5_000_000, quota: 100_000_000 }),
        },
        configurable: true,
      })

      await aboutPage.init()
      const storageSection = document.querySelector('.qa-about-storage')
      expect(storageSection).not.toBeNull()

      const meter = storageSection.querySelector('meter')
      expect(meter).not.toBeNull()
      expect(Number(meter.value)).toBe(5_000_000)
      expect(Number(meter.max)).toBe(100_000_000)
    })

    it('shows storage warning when usage exceeds 80%', async () => {
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockResolvedValue({ usage: 85_000_000, quota: 100_000_000 }),
        },
        configurable: true,
      })

      await aboutPage.init()
      const warning = document.querySelector('.qa-about-storage-warning')
      expect(warning).not.toBeNull()
    })

    it('hides PWA install button when no beforeinstallprompt has fired', async () => {
      await aboutPage.init()
      const installBtn = document.querySelector('.qa-about-install-btn')
      // Should not be rendered or should be hidden
      expect(installBtn).toBeNull()
    })

    it('shows PWA install button when prompt is available', async () => {
      // Import the pwa-install module to set the stored prompt
      const pwaInstall = await import('../../../src/about/pwa-install.js')
      pwaInstall.setInstallPrompt({ prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) })

      await aboutPage.init()
      const installBtn = document.querySelector('.qa-about-install-btn')
      expect(installBtn).not.toBeNull()
      expect(installBtn.textContent).toContain('Install')
    })

    it('renders back link to settings', async () => {
      await aboutPage.init()
      const backLink = document.querySelector('a[href="#/settings"]')
      expect(backLink).not.toBeNull()
    })

    it('concurrent init() calls do not produce duplicate content', async () => {
      // Run two init() in parallel — second should win, DOM should have only one copy of each section
      await Promise.all([aboutPage.init(), aboutPage.init()])
      const headings = document.querySelectorAll('h1.qa-about-heading')
      expect(headings).toHaveLength(1)
      const versionSections = document.querySelectorAll('.qa-about-versions')
      expect(versionSections).toHaveLength(1)
    })
  })
})
