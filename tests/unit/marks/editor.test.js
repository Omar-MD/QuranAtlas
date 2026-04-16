import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save, getByVerseKey, getAll } from '../../../src/marks/store.js'

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
  document.body.innerHTML = '<div id="app-shell"><main id="main-content"></main></div>'
  editor = await import('../../../src/marks/editor.js')
})

describe('marks/editor.js', () => {
  describe('openEditor() — cold start (zero marks)', () => {
    it('renders a modal with seed tag chips', async () => {
      await editor.openEditor('2:255')
      const modal = document.querySelector('.qa-mark-modal')
      expect(modal).not.toBeNull()
      expect(modal.getAttribute('role')).toBe('dialog')
      const chips = modal.querySelectorAll('.qa-tag-chip')
      expect(chips.length).toBe(16)
    })

    it('shows hint text when zero marks exist', async () => {
      await editor.openEditor('2:255')
      const hint = document.querySelector('.qa-mark-hint')
      expect(hint).not.toBeNull()
      expect(hint.textContent).toContain('organise')
    })
  })

  describe('openEditor() — existing marks', () => {
    it('shows used tags as chips instead of seeds', async () => {
      await save('1:1', ['favourite', 'custom-one'])
      await editor.openEditor('2:255')
      const chips = document.querySelectorAll('.qa-tag-chip')
      const labels = [...chips].map(c => c.dataset.tag)
      expect(labels).toContain('favourite')
      expect(labels).toContain('custom-one')
    })

    it('does not show hint text when marks exist', async () => {
      await save('1:1', ['favourite'])
      await editor.openEditor('2:255')
      const hint = document.querySelector('.qa-mark-hint')
      expect(hint).toBeNull()
    })

    it('pre-selects chips for tags already on this verse', async () => {
      await save('2:255', ['favourite', 'study'])
      await editor.openEditor('2:255')
      const favChip = document.querySelector('.qa-tag-chip[data-tag="favourite"]')
      expect(favChip.getAttribute('aria-pressed')).toBe('true')
    })
  })

  describe('chip toggle', () => {
    it('toggles chip selection on click', async () => {
      await editor.openEditor('2:255')
      const chip = document.querySelector('.qa-tag-chip')
      expect(chip.getAttribute('aria-pressed')).toBe('false')
      chip.click()
      expect(chip.getAttribute('aria-pressed')).toBe('true')
      chip.click()
      expect(chip.getAttribute('aria-pressed')).toBe('false')
    })
  })

  describe('search/filter', () => {
    it('filters chips by search input', async () => {
      await save('1:1', ['favourite', 'study', 'reflection'])
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      input.value = 'fav'
      input.dispatchEvent(new Event('input'))
      const visibleChips = [...document.querySelectorAll('.qa-tag-chip')]
        .filter(c => c.style.display !== 'none')
      expect(visibleChips.length).toBe(1)
      expect(visibleChips[0].dataset.tag).toBe('favourite')
    })

    it('shows "Create" button when input has no exact match', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      input.value = 'new-tag'
      input.dispatchEvent(new Event('input'))
      const createBtn = document.querySelector('.qa-tag-create-btn')
      expect(createBtn).not.toBeNull()
      expect(createBtn.textContent).toContain('new-tag')
    })

    it('does not show "Create" button when input matches an existing tag', async () => {
      await save('1:1', ['favourite'])
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      input.value = 'favourite'
      input.dispatchEvent(new Event('input'))
      const createBtn = document.querySelector('.qa-tag-create-btn')
      expect(createBtn).toBeNull()
    })
  })

  describe('create tag', () => {
    it('creates a new chip when "Create" button is clicked', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      input.value = 'new-tag'
      input.dispatchEvent(new Event('input'))
      const createBtn = document.querySelector('.qa-tag-create-btn')
      createBtn.click()
      const chips = document.querySelectorAll('.qa-tag-chip')
      const labels = [...chips].map(c => c.dataset.tag)
      expect(labels).toContain('new-tag')
      // New chip should be auto-selected
      const newChip = document.querySelector('.qa-tag-chip[data-tag="new-tag"]')
      expect(newChip.getAttribute('aria-pressed')).toBe('true')
    })

    it('rejects invalid tag labels (empty, >50 chars, control chars)', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      // Empty
      input.value = '   '
      input.dispatchEvent(new Event('input'))
      expect(document.querySelector('.qa-tag-create-btn')).toBeNull()
      // >50 chars
      input.value = 'a'.repeat(51)
      input.dispatchEvent(new Event('input'))
      expect(document.querySelector('.qa-tag-create-btn')).toBeNull()
    })

    it('clears input after creating a tag', async () => {
      await editor.openEditor('2:255')
      const input = document.querySelector('.qa-tag-search')
      input.value = 'new-tag'
      input.dispatchEvent(new Event('input'))
      document.querySelector('.qa-tag-create-btn').click()
      expect(input.value).toBe('')
    })
  })

  describe('save behavior', () => {
    it('save button is disabled when 0 tags selected', async () => {
      await editor.openEditor('2:255')
      const saveBtn = document.querySelector('[data-action="save"]')
      expect(saveBtn.disabled).toBe(true)
    })

    it('save button is enabled when ≥1 tag selected', async () => {
      await editor.openEditor('2:255')
      const chip = document.querySelector('.qa-tag-chip')
      chip.click()
      const saveBtn = document.querySelector('[data-action="save"]')
      expect(saveBtn.disabled).toBe(false)
    })

    it('saves mark with selected tags on Save click', async () => {
      await editor.openEditor('2:255')
      const chip = document.querySelector('.qa-tag-chip')
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
      expect(document.querySelector('.qa-mark-modal')).toBeNull()
      const mark = await getByVerseKey('2:255')
      expect(mark).toBeUndefined()
    })

    it('closes modal on backdrop click', async () => {
      await editor.openEditor('2:255')
      const backdrop = document.querySelector('.qa-mark-backdrop')
      backdrop.click()
      expect(document.querySelector('.qa-mark-modal')).toBeNull()
    })
  })

  describe('delete', () => {
    it('shows delete button only for existing marks', async () => {
      await editor.openEditor('2:255')
      expect(document.querySelector('[data-action="delete"]')).toBeNull()
    })

    it('shows delete button for existing marks and deletes on click', async () => {
      await save('2:255', ['favourite'])
      await editor.openEditor('2:255')
      const deleteBtn = document.querySelector('[data-action="delete"]')
      expect(deleteBtn).not.toBeNull()
      deleteBtn.click()
      await new Promise(r => setTimeout(r, 50))
      expect(document.querySelector('.qa-mark-modal')).toBeNull()
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
      expect(document.querySelector('.qa-mark-modal')).toBeTruthy()
      emit('sync:update-received', { verseKeys: ['2:255'] })
      expect(document.querySelector('.qa-mark-modal')).toBeFalsy()
    })

    it('does not close editor when different mark is deleted in another tab', async () => {
      const { emit } = await import('../../../src/core/events.js')
      await save('2:255', ['favourite'])
      await editor.openEditor('2:255')
      emit('sync:update-received', { verseKeys: ['3:1'] })
      expect(document.querySelector('.qa-mark-modal')).toBeTruthy()
    })
  })
})
