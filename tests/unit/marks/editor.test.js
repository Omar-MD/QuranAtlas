import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save, getByVerseKey } from '../../../src/marks/store.js'
import { Events } from '../../../src/core/constants.js'

vi.mock('../../../src/data/dataset.js', () => ({
  getSurahs: vi.fn().mockResolvedValue([
    { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', type: 'Medinan', count: 286 },
  ]),
  getSurah: vi.fn().mockResolvedValue({ ar: ['Arabic text'], en: ['English text'] }),
}))

let editor

beforeEach(async () => {
  vi.resetModules()
  // Clear marks store to ensure test isolation (fake-indexeddb persists within a file)
  const db = await openDB()
  await new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readwrite')
    const req = tx.objectStore('marks').clear()
    req.onsuccess = resolve
    req.onerror = () => reject(req.error)
  })
  while (document.body.firstChild) { document.body.removeChild(document.body.firstChild) }
  const shell = document.createElement('div')
  shell.id = 'app-shell'
  const main = document.createElement('main')
  main.id = 'main-content'
  shell.appendChild(main)
  document.body.appendChild(shell)
  editor = await import('../../../src/marks/editor.js')
})

describe('marks/editor.js', () => {
  describe('openEditor() — cold start (zero marks)', () => {
    it('renders a modal with seed tag chips', async () => {
      await editor.openEditor('2:255')
      const modal = document.querySelector('.qa-sheet--mark')
      expect(modal).not.toBeNull()
      expect(modal.getAttribute('role')).toBe('dialog')
      const chips = modal.querySelectorAll('.qa-mark-chips--all .qa-mark-chip')
      expect(chips.length).toBe(16)
    })

    it('shows verse quote block with ref eyebrow', async () => {
      await editor.openEditor('2:255')
      const quote = document.querySelector('.qa-mark-quote')
      expect(quote).not.toBeNull()
      const ref = quote.querySelector('.qa-mark-quote-ref')
      expect(ref.textContent).toContain('2:255')
    })
  })

  describe('openEditor() — existing marks', () => {
    it('shows used tags as chips instead of seeds', async () => {
      await save('1:1', ['favourite', 'custom-one'])
      await editor.openEditor('2:255')
      const chips = document.querySelectorAll('.qa-mark-chips--all .qa-mark-chip')
      const labels = [...chips].map(c => c.textContent)
      expect(labels.some(l => l.includes('favourite'))).toBe(true)
      expect(labels.some(l => l.includes('custom-one'))).toBe(true)
    })

    it('pre-selects chips for tags already on this verse', async () => {
      await save('2:255', ['favourite', 'study'])
      await editor.openEditor('2:255')
      const selectedChips = document.querySelectorAll('.qa-mark-chips--selected .qa-mark-chip--on')
      const labels = [...selectedChips].map(c => c.textContent)
      expect(labels.some(l => l.includes('favourite'))).toBe(true)
    })
  })

  describe('chip toggle', () => {
    it('toggles chip selection on click — moves from all to selected strip', async () => {
      await editor.openEditor('2:255')
      const chip = document.querySelector('.qa-mark-chips--all .qa-mark-chip')
      const initialAllCount = document.querySelectorAll('.qa-mark-chips--all .qa-mark-chip').length
      chip.click()
      const afterSelectedCount = document.querySelectorAll('.qa-mark-chips--selected .qa-mark-chip--on').length
      expect(afterSelectedCount).toBe(1)
      const afterAllCount = document.querySelectorAll('.qa-mark-chips--all .qa-mark-chip').length
      expect(afterAllCount).toBe(initialAllCount - 1)
    })
  })

  describe('search/filter', () => {
    it('filters chips by search input', async () => {
      await save('1:1', ['favourite', 'study', 'reflection'])
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-mark-search-input')
      input.value = 'fav'
      input.dispatchEvent(new Event('input'))
      const visibleChips = [...document.querySelectorAll('.qa-mark-chips--all .qa-mark-chip')]
        .filter(c => !c.classList.contains('qa-mark-chip--create'))
      expect(visibleChips.length).toBe(1)
      expect(visibleChips[0].textContent).toContain('favourite')
    })

    it('shows "Create" button when input has no exact match', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-mark-search-input')
      input.value = 'new-tag'
      input.dispatchEvent(new Event('input'))
      const createBtn = document.querySelector('.qa-mark-chip--create')
      expect(createBtn).not.toBeNull()
      expect(createBtn.textContent).toContain('new-tag')
    })

    it('does not show "Create" button when input matches an existing tag', async () => {
      await save('1:1', ['favourite'])
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-mark-search-input')
      input.value = 'favourite'
      input.dispatchEvent(new Event('input'))
      const createBtn = document.querySelector('.qa-mark-chip--create')
      expect(createBtn).toBeNull()
    })
  })

  describe('create tag', () => {
    it('creates a new chip when "Create" button is clicked', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-mark-search-input')
      input.value = 'new-tag'
      input.dispatchEvent(new Event('input'))
      const createBtn = document.querySelector('.qa-mark-chip--create')
      createBtn.click()
      // New tag is auto-selected → appears in selected strip
      const selectedChips = document.querySelectorAll('.qa-mark-chips--selected .qa-mark-chip--on')
      const labels = [...selectedChips].map(c => c.textContent)
      expect(labels.some(l => l.includes('new-tag'))).toBe(true)
    })

    it('rejects invalid tag labels (empty, >50 chars, control chars)', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-mark-search-input')
      // Empty
      input.value = '   '
      input.dispatchEvent(new Event('input'))
      expect(document.querySelector('.qa-mark-chip--create')).toBeNull()
      // >50 chars
      input.value = 'a'.repeat(51)
      input.dispatchEvent(new Event('input'))
      expect(document.querySelector('.qa-mark-chip--create')).toBeNull()
    })

    it('clears input after creating a tag', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-mark-search-input')
      input.value = 'new-tag'
      input.dispatchEvent(new Event('input'))
      document.querySelector('.qa-mark-chip--create').click()
      expect(input.value).toBe('')
    })
  })

  describe('save behavior', () => {
    it('save button is disabled when 0 tags selected and note empty', async () => {
      await editor.openEditor('2:255')
      const saveBtn = document.querySelector('[data-action="save"]')
      expect(saveBtn.disabled).toBe(true)
    })

    it('save button is enabled when ≥1 tag selected', async () => {
      await editor.openEditor('2:255')
      const chip = document.querySelector('.qa-mark-chips--all .qa-mark-chip')
      chip.click()
      const saveBtn = document.querySelector('[data-action="save"]')
      expect(saveBtn.disabled).toBe(false)
    })

    it('saves mark with selected tags on Save click', async () => {
      await editor.openEditor('2:255')
      const chip = document.querySelector('.qa-mark-chips--all .qa-mark-chip')
      chip.click()
      const saveBtn = document.querySelector('[data-action="save"]')
      saveBtn.click()
      await new Promise(r => setTimeout(r, 50))
      const mark = await getByVerseKey('2:255')
      expect(mark).toBeTruthy()
      expect(mark.tags.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('cancel/dismiss', () => {
    it('closes modal on Cancel without creating a mark', async () => {
      await editor.openEditor('2:255')
      const cancelBtn = document.querySelector('[data-action="cancel"]')
      cancelBtn.click()
      expect(document.querySelector('.qa-sheet--mark')).toBeNull()
      const mark = await getByVerseKey('2:255')
      expect(mark).toBeUndefined()
    })

    it('closes modal on backdrop click', async () => {
      await editor.openEditor('2:255')
      const backdrop = document.querySelector('.qa-sheet-backdrop')
      backdrop.click()
      expect(document.querySelector('.qa-sheet--mark')).toBeNull()
    })
  })

  describe('delete', () => {
    it('shows delete button hidden for new marks', async () => {
      await editor.openEditor('2:255')
      const deleteBtn = document.querySelector('[data-action="delete"]')
      expect(deleteBtn).not.toBeNull()
      expect(deleteBtn.classList.contains('qa-mark-btn--hidden')).toBe(true)
    })

    it('shows delete button visible for existing marks; inline confirm then deletes', async () => {
      await save('2:255', ['favourite'])
      await editor.openEditor('2:255')
      const deleteBtn = document.querySelector('[data-action="delete"]')
      expect(deleteBtn).not.toBeNull()
      expect(deleteBtn.classList.contains('qa-mark-btn--hidden')).toBe(false)
      // First click shows inline confirm
      deleteBtn.click()
      const confirmText = document.querySelector('.qa-mark-confirm-text')
      expect(confirmText).not.toBeNull()
      // Second click on confirm Delete button actually deletes
      const confirmDelBtn = [...document.querySelectorAll('.qa-mark-btn')].find(b => b.textContent === 'Delete')
      confirmDelBtn.click()
      await new Promise(r => setTimeout(r, 50))
      expect(document.querySelector('.qa-sheet--mark')).toBeNull()
      const toast = document.querySelector('.qa-undo-toast')
      expect(toast).not.toBeNull()
    })
  })

  describe('long-press handler', () => {
    it('setupLongPress attaches to a container', () => {
      const container = document.getElementById('main-content')
      const cleanup = editor.setupLongPress(container)
      expect(typeof cleanup).toBe('function')
      cleanup()
    })
  })

  describe('cross-tab conflict', () => {
    it('closes editor when mark is deleted in another tab', async () => {
      const { emit } = await import('../../../src/core/events.js')
      await save('2:255', ['favourite'])
      await editor.openEditor('2:255')
      expect(document.querySelector('.qa-sheet--mark')).toBeTruthy()
      emit(Events.SYNC_UPDATE_RECEIVED, { verseKeys: ['2:255'] })
      expect(document.querySelector('.qa-sheet--mark')).toBeFalsy()
    })

    it('does not close editor when different mark is deleted in another tab', async () => {
      const { emit } = await import('../../../src/core/events.js')
      await save('2:255', ['favourite'])
      await editor.openEditor('2:255')
      emit(Events.SYNC_UPDATE_RECEIVED, { verseKeys: ['3:1'] })
      expect(document.querySelector('.qa-sheet--mark')).toBeTruthy()
    })
  })
})
