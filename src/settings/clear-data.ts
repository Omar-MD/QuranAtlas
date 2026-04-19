/**
 * Clear data: confirmation flow and data deletion.
 * The `showClearDataConfirmation()` function is an imperative trigger used
 * by `settings/panel-bridge.ts` which the Panel component calls.
 */

import { deleteDB } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import { announce } from '../a11y/announcer.js'
import { suppressNextVersionChange } from '../safety/sync.js'

// Bridge to the mounted ClearDataConfirm Svelte component.
let _showConfirm: (() => Promise<boolean>) | null = null

export function registerClearDataConfirm(fn: () => Promise<boolean>): void {
  _showConfirm = fn
}

/**
 * Show clear data confirmation and handle the deletion flow.
 * Delegates UI to the mounted ClearDataConfirm.svelte component when available;
 * falls back to the legacy DOM implementation otherwise.
 * @returns Whether data was cleared
 */
export async function showClearDataConfirmation(): Promise<boolean> {
  if (_showConfirm) {
    return _showConfirm()
  }
  // Fallback (should not happen after full mount, kept for safety)
  return _legacyShowClearDataConfirmation()
}

async function _legacyShowClearDataConfirmation(): Promise<boolean> {
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

  const warning = document.createElement('p')
  warning.id = 'clear-warning'
  warning.className = 'qa-warning-text'
  warning.textContent = 'Type DELETE to confirm:'

  const confirmInput = document.createElement('input')
  confirmInput.type = 'text'
  confirmInput.className = 'qa-input qa-input-confirm'
  confirmInput.setAttribute('aria-labelledby', 'clear-warning')
  confirmInput.placeholder = 'DELETE'

  const actions = document.createElement('div')
  actions.className = 'qa-modal-actions'

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'qa-mark-btn qa-mark-btn--ghost'
  cancelBtn.textContent = 'Cancel'

  const confirmBtn = document.createElement('button')
  confirmBtn.className = 'qa-mark-btn qa-mark-btn--danger-primary'
  confirmBtn.textContent = 'Clear All Data'
  confirmBtn.disabled = true
  confirmBtn.setAttribute('aria-describedby', 'clear-warning')

  actions.appendChild(cancelBtn)
  actions.appendChild(confirmBtn)

  modal.appendChild(title)
  modal.appendChild(message)
  modal.appendChild(warning)
  modal.appendChild(confirmInput)
  modal.appendChild(actions)
  backdrop.appendChild(modal)

  return new Promise((resolve) => {
    const cleanup = () => {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop)
      }
      document.removeEventListener('keydown', handleEscape)
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup()
        resolve(false)
      }
    }

    cancelBtn.addEventListener('click', () => {
      cleanup()
      resolve(false)
    })

    confirmInput.addEventListener('input', () => {
      const isDelete = confirmInput.value.trim() === 'DELETE'
      confirmBtn.disabled = !isDelete
    })

    confirmBtn.addEventListener('click', async () => {
      if (confirmInput.value.trim() !== 'DELETE') { return }
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
    confirmInput.focus()
    announce('Clear data confirmation dialog opened. Type DELETE to confirm clearing all data.')
  })
}

/**
 * Clear all application data including cache and IndexedDB.
 * @returns Success status
 */
export async function clearAllData(): Promise<boolean> {
  const errors: string[] = []

  // Clear caches
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    } catch (error) {
      logger.error('Failed to clear caches:', { error })
      errors.push('Service worker cache')
    }
  }

  // Clear IndexedDB — suppress the versionchange banner since this tab initiated the deletion
  // suppressNextVersionChange call preserved verbatim (see migration Rule 8.1)
  suppressNextVersionChange()
  try {
    await deleteDB()
  } catch (error) {
    logger.error('Failed to delete IndexedDB:', { error })
    errors.push('IndexedDB')
  }

  // Note: localStorage is intentionally NOT cleared per tech-stack.md
  // (No localStorage is used anywhere in the application)

  if (errors.length > 0) {
    announce(`Some data could not be cleared: ${errors.join(', ')}. Please try again.`)
    return false
  }

  emit(Events.SETTINGS_DATA_CLEARED, {})
  announce('All data has been cleared. Reloading...')

  // Navigate to root before reloading so the router re-runs the launch-restore
  // check with a clean DB. If we reload on a non-root hash (e.g. #/s/1), the
  // router matches that route directly and never calls handleLaunchRestore,
  // so onboarding would not restart even though onboardingComplete is gone.
  setTimeout(() => {
    window.location.href = window.location.origin + window.location.pathname
  }, 1500)

  return true
}
