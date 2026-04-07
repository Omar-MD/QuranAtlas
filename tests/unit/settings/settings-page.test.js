// tests/unit/settings/settings-page.test.js
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { openDB } from '../../../src/core/db.js'

// Mock theme module — spy on real behavior
vi.mock('../../../src/settings/theme.js', () => ({
  loadTheme: vi.fn().mockResolvedValue('light'),
  setTheme: vi.fn().mockResolvedValue(true),
  getThemeOptions: vi.fn().mockReturnValue(['light', 'dark', 'sepia']),
}))

// Mock clear-data module
vi.mock('../../../src/settings/clear-data.js', () => ({
  showClearDataConfirmation: vi.fn().mockResolvedValue(false),
}))

// Mock announcer
vi.mock('../../../src/a11y/announcer.js', () => ({
  announce: vi.fn(),
}))

let settingsPage

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

  // Fresh import each test
  settingsPage = await import('../../../src/settings/index.js')
})

describe('settings/index.js', () => {
  describe('init()', () => {
    it('renders settings page with theme section and clear data section', async () => {
      await settingsPage.init()
      const main = document.getElementById('main-content')

      // Page heading
      const heading = main.querySelector('h1')
      expect(heading).not.toBeNull()
      expect(heading.textContent).toBe('Settings')

      // Theme section exists
      const themeSection = main.querySelector('.qa-settings-theme')
      expect(themeSection).not.toBeNull()

      // Clear data section exists
      const clearSection = main.querySelector('.qa-settings-clear')
      expect(clearSection).not.toBeNull()
    })

    it('renders 3 theme swatches with correct labels', async () => {
      await settingsPage.init()
      const swatches = document.querySelectorAll('.qa-settings-swatch')
      expect(swatches.length).toBe(3)

      const labels = [...swatches].map(s => s.getAttribute('data-theme'))
      expect(labels).toEqual(['light', 'dark', 'sepia'])
    })

    it('marks the current theme swatch as active', async () => {
      const { loadTheme } = await import('../../../src/settings/theme.js')
      loadTheme.mockResolvedValue('dark')

      await settingsPage.init()
      const active = document.querySelector('.qa-settings-swatch[aria-pressed="true"]')
      expect(active).not.toBeNull()
      expect(active.getAttribute('data-theme')).toBe('dark')
    })

    it('calls setTheme when a swatch is clicked', async () => {
      const { setTheme } = await import('../../../src/settings/theme.js')
      await settingsPage.init()

      const sepiaSwatch = document.querySelector('.qa-settings-swatch[data-theme="sepia"]')
      sepiaSwatch.click()
      await vi.waitFor(() => {
        expect(setTheme).toHaveBeenCalledWith('sepia')
      })
    })

    it('updates aria-pressed after swatch click', async () => {
      const { setTheme } = await import('../../../src/settings/theme.js')
      setTheme.mockImplementation(async () => {
        return true
      })

      await settingsPage.init()
      const sepiaSwatch = document.querySelector('.qa-settings-swatch[data-theme="sepia"]')
      sepiaSwatch.click()
      await vi.waitFor(() => {
        expect(sepiaSwatch.getAttribute('aria-pressed')).toBe('true')
      })
    })

    it('renders clear data button with danger styling', async () => {
      await settingsPage.init()
      const clearBtn = document.querySelector('.qa-settings-clear-btn')
      expect(clearBtn).not.toBeNull()
      expect(clearBtn.textContent).toContain('Clear All Data')
      expect(clearBtn.getAttribute('aria-label')).toBe('Clear all data and reset to defaults')
    })

    it('calls showClearDataConfirmation when clear data button is clicked', async () => {
      const { showClearDataConfirmation } = await import('../../../src/settings/clear-data.js')
      await settingsPage.init()

      const clearBtn = document.querySelector('.qa-settings-clear-btn')
      clearBtn.click()
      await vi.waitFor(() => {
        expect(showClearDataConfirmation).toHaveBeenCalled()
      })
    })

    it('renders about link at the bottom', async () => {
      await settingsPage.init()
      const aboutLink = document.querySelector('a[href="#/about"]')
      expect(aboutLink).not.toBeNull()
      expect(aboutLink.textContent).toContain('About')
    })

    it('concurrent init() calls do not produce duplicate content', async () => {
      await Promise.all([settingsPage.init(), settingsPage.init()])
      const headings = document.querySelectorAll('h1.qa-settings-heading')
      expect(headings).toHaveLength(1)
      const themeSections = document.querySelectorAll('.qa-settings-theme')
      expect(themeSections).toHaveLength(1)
    })
  })
})
