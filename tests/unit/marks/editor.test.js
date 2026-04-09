import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save, getByVerseKey } from '../../../src/marks/store.js'

let editor

beforeEach(async () => {
  await openDB()
  document.body.innerHTML = '<div id="app-shell"><main id="main-content"></main></div>'
  editor = await import('../../../src/marks/editor.js')
})

describe('marks/editor.js', () => {
  describe('openEditor()', () => {
    it('renders a modal with tag checkboxes', async () => {
      await editor.openEditor('2:255')

      const modal = document.querySelector('.qa-mark-modal')
      expect(modal).not.toBeNull()
      expect(modal.getAttribute('role')).toBe('dialog')

      const checkboxes = modal.querySelectorAll('input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThanOrEqual(4)
    })

    it('pre-fills checkboxes for an already-marked verse', async () => {
      await save('2:255', ['favourite', 'study'])
      await editor.openEditor('2:255')

      const modal = document.querySelector('.qa-mark-modal')
      const favCheckbox = modal.querySelector('input[value="favourite"]')
      expect(favCheckbox.checked).toBe(true)

      const reflectionCheckbox = modal.querySelector('input[value="reflection"]')
      expect(reflectionCheckbox.checked).toBe(false)
    })

    it('saves mark when Save button is clicked', async () => {
      await editor.openEditor('2:255')

      const modal = document.querySelector('.qa-mark-modal')
      const studyCheckbox = modal.querySelector('input[value="study"]')
      studyCheckbox.checked = true
      studyCheckbox.dispatchEvent(new Event('change'))

      const saveBtn = modal.querySelector('[data-action="save"]')
      saveBtn.click()

      // Wait for async save
      await new Promise(r => setTimeout(r, 50))

      const mark = await getByVerseKey('2:255')
      expect(mark.tags).toContain('study')
    })

    it('closes modal when Cancel button is clicked', async () => {
      await editor.openEditor('2:255')
      const cancelBtn = document.querySelector('[data-action="cancel"]')
      cancelBtn.click()

      const modal = document.querySelector('.qa-mark-modal')
      expect(modal).toBeNull()
    })
  })

  describe('delete from editor', () => {
    it('deletes mark and shows undo toast', async () => {
      await save('2:255', ['favourite'])
      await editor.openEditor('2:255')

      const deleteBtn = document.querySelector('[data-action="delete"]')
      deleteBtn.click()

      await new Promise(r => setTimeout(r, 50))

      // Modal closed
      expect(document.querySelector('.qa-mark-modal')).toBeNull()

      // Undo toast visible
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

    it('does not clear undo toast on navigation events', async () => {
      const { emit } = await import('../../../src/core/events.js')
      const { showUndoToast, clearUndoToast } = await import('../../../src/core/ui.js')
      const container = document.getElementById('main-content')

      const cleanup = editor.setupLongPress(container)
      showUndoToast({
        verseKey: '2:255',
        record: { verseKey: '2:255', tags: ['favourite'] },
        onUndo: vi.fn(),
        onComplete: vi.fn(),
      })

      emit('navigation:navigate', { surah: 3 })

      expect(document.querySelector('.qa-undo-toast')).not.toBeNull()

      clearUndoToast()
      cleanup()
    })
  })

  describe('cross-tab conflict', () => {
    it('closes editor with toast when mark is deleted in another tab', async () => {
      const { emit } = await import('../../../src/core/events.js')
      const store = await import('../../../src/marks/store.js')

      // Create a mark and open the editor
      await store.save('2:255', ['favourite'])
      await editor.openEditor('2:255')

      // Verify editor is open
      expect(document.querySelector('.qa-mark-modal')).toBeTruthy()

      // Simulate cross-tab deletion via sync:update-received
      emit('sync:update-received', { verseKeys: ['2:255'] })

      // Editor should be closed
      expect(document.querySelector('.qa-mark-modal')).toBeFalsy()
    })

    it('does not close editor when different mark is deleted in another tab', async () => {
      const { emit } = await import('../../../src/core/events.js')
      const store = await import('../../../src/marks/store.js')

      await store.save('2:255', ['favourite'])
      await editor.openEditor('2:255')

      emit('sync:update-received', { verseKeys: ['3:1'] })

      // Editor should still be open
      expect(document.querySelector('.qa-mark-modal')).toBeTruthy()
    })
  })
})
