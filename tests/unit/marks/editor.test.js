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
  })
})
