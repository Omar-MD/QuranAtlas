// tests/unit/about/about-page.test.js
import { beforeEach, describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save as saveMark, getAll as getAllMarks, del as delMark } from '../../../src/marks/store.js'

// Mock announcer
vi.mock('../../../src/a11y/announcer.js', () => ({
  announce: vi.fn(),
}))

let aboutPage

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  const db = await openDB()
  await new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readwrite')
    const req = tx.objectStore('marks').clear()
    req.onsuccess = resolve
    req.onerror = () => reject(req.error)
  })
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

    it('renders app version line', async () => {
      await aboutPage.init()
      const versionEl = document.querySelector('.qa-about-version-line')
      expect(versionEl).not.toBeNull()
      expect(versionEl.textContent).toMatch(/v/)
    })

    it('renders attribution section', async () => {
      await aboutPage.init()
      const attribution = document.querySelector('.qa-about-attribution')
      expect(attribution).not.toBeNull()
      expect(attribution.textContent).toContain('Bridges')
      expect(attribution.textContent).toContain('KFGQPC')
    })

    it('hides PWA install button when no beforeinstallprompt has fired', async () => {
      await aboutPage.init()
      const installBtn = document.querySelector('.qa-about-install-btn')
      expect(installBtn).toBeNull()
    })

    it('shows PWA install button when prompt is available', async () => {
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
      await Promise.all([aboutPage.init(), aboutPage.init()])
      const headings = document.querySelectorAll('h1.qa-about-heading')
      expect(headings).toHaveLength(1)
    })
  })

  describe('blessing verse', () => {
    it('renders the 54:17 blessing in Arabic with dir="rtl"', async () => {
      await aboutPage.init()
      const blessing = document.querySelector('.qa-about-blessing')
      expect(blessing).not.toBeNull()
      expect(blessing.getAttribute('dir')).toBe('rtl')
      expect(blessing.textContent.trim().length).toBeGreaterThan(0)
    })

    it('renders blessing translation text', async () => {
      await aboutPage.init()
      const blessingTranslation = document.querySelector('.qa-about-blessing-translation')
      expect(blessingTranslation).not.toBeNull()
      expect(blessingTranslation.textContent).toContain("Qur'an easy for remembrance")
    })
  })

  describe('stat grid', () => {
    it('renders a 2x2 stat grid', async () => {
      await aboutPage.init()
      const grid = document.querySelector('.qa-about-stat-grid')
      expect(grid).not.toBeNull()
      const cells = grid.querySelectorAll('.qa-about-stat-cell')
      expect(cells.length).toBe(4)
    })

    it('shows 0 marks when no marks exist', async () => {
      await aboutPage.init()
      const cells = [...document.querySelectorAll('.qa-about-stat-cell')]
      const marksCell = cells.find(c => c.querySelector('.qa-about-stat-label')?.textContent === 'Marks')
      expect(marksCell).toBeTruthy()
      expect(marksCell.querySelector('.qa-about-stat-value').textContent).toBe('0')
    })

    it('counts marks correctly', async () => {
      await saveMark('2:255', ['favourite'])
      await saveMark('1:1', ['study'])
      vi.resetModules()
      aboutPage = await import('../../../src/about/index.js')
      await aboutPage.init()
      const cells = [...document.querySelectorAll('.qa-about-stat-cell')]
      const marksCell = cells.find(c => c.querySelector('.qa-about-stat-label')?.textContent === 'Marks')
      expect(marksCell.querySelector('.qa-about-stat-value').textContent).toBe('2')
    })

    it('counts unique tags', async () => {
      await saveMark('2:255', ['favourite', 'study'])
      await saveMark('1:1', ['favourite'])
      vi.resetModules()
      aboutPage = await import('../../../src/about/index.js')
      await aboutPage.init()
      const cells = [...document.querySelectorAll('.qa-about-stat-cell')]
      const tagsCell = cells.find(c => c.querySelector('.qa-about-stat-label')?.textContent === 'Tags')
      expect(tagsCell.querySelector('.qa-about-stat-value').textContent).toBe('2')
    })

    it('counts unique surahs with marks', async () => {
      await saveMark('2:255', ['favourite'])
      await saveMark('2:1', ['study'])
      await saveMark('67:14', ['favourite'])
      vi.resetModules()
      aboutPage = await import('../../../src/about/index.js')
      await aboutPage.init()
      const cells = [...document.querySelectorAll('.qa-about-stat-cell')]
      const surahsCell = cells.find(c => c.querySelector('.qa-about-stat-label')?.textContent.startsWith('Surahs'))
      expect(surahsCell.querySelector('.qa-about-stat-value').textContent).toBe('2')
    })

    it("shows % Qur'an tagged as decimal percentage", async () => {
      await saveMark('2:255', ['favourite'])
      vi.resetModules()
      aboutPage = await import('../../../src/about/index.js')
      await aboutPage.init()
      const cells = [...document.querySelectorAll('.qa-about-stat-cell')]
      const pctCell = cells.find(c => c.querySelector('.qa-about-stat-label')?.textContent.includes('%'))
      expect(pctCell).toBeTruthy()
      const value = pctCell.querySelector('.qa-about-stat-value').textContent
      expect(value).toMatch(/\d+\.\d+%/)
    })
  })
})
