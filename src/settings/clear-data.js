/**
 * Clear data: confirmation flow and data deletion.
 */

import { deleteDB } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { announce } from '../a11y/announcer.js'

/**
 * Show clear data confirmation and handle the deletion flow.
 * @returns {Promise<boolean>} Whether data was cleared
 */
export async function showClearDataConfirmation() {
  // Create modal backdrop
  const backdrop = document.createElement('div')
  backdrop.className = 'qa-modal-backdrop'
  backdrop.setAttribute('role', 'dialog')
  backdrop.setAttribute('aria-modal', 'true')
  backdrop.setAttribute('aria-labelledby', 'clear-data-title')

  // Modal content
  const modal = document.createElement('div')
  modal.className = 'qa-modal'

  const title = document.createElement('h2')
  title.id = 'clear-data-title'
  title.textContent = 'Clear All Data?'

  const message = document.createElement('p')
  message.textContent = 'This will permanently delete all saved reading positions, marks, and settings. This action cannot be undone.'

  const actions = document.createElement('div')
  actions.className = 'qa-modal-actions'

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'qa-btn qa-btn-secondary'
  cancelBtn.textContent = 'Cancel'

  const confirmBtn = document.createElement('button')
  confirmBtn.className = 'qa-btn qa-btn-danger'
  confirmBtn.textContent = 'Clear All Data'
  confirmBtn.setAttribute('aria-describedby', 'clear-warning')

  actions.appendChild(cancelBtn)
  actions.appendChild(confirmBtn)

  modal.appendChild(title)
  modal.appendChild(message)
  modal.appendChild(actions)
  backdrop.appendChild(modal)

  return new Promise((resolve) => {
    const cleanup = () => {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop)
      }
      document.removeEventListener('keydown', handleEscape)
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        cleanup()
        resolve(false)
      }
    }

    cancelBtn.addEventListener('click', () => {
      cleanup()
      resolve(false)
    })

    confirmBtn.addEventListener('click', async () => {
      cleanup()
      const success = await clearAllData()
      resolve(success)
    })

    confirmBtn.addEventListener('click', async () => {
      cleanup()
      const success = await clearAllData()
      resolve(success)
    })

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        cleanup()
        resolve(false)
      }
    })

    document.addEventListener('keydown', handleEscape)
    document.body.appendChild(backdrop)
    cancelBtn.focus()
    announce('Clear data confirmation dialog opened')
  })
}

/**
 * Clear all application data including cache and IndexedDB.
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllData() {
  try {
    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }

    // Clear IndexedDB
    await deleteDB()

    // Clear localStorage (if any)
    localStorage.clear()

    emit(Events.SETTINGS_DATA_CLEARED, {})
    announce('All data has been cleared. Reloading...')

    // Reload after brief delay
    setTimeout(() => {
      window.location.reload()
    }, 1500)

    return true
  } catch (error) {
    console.error('Failed to clear data:', error)
    announce('Error clearing data. Please try again.')
    return false
  }
}
