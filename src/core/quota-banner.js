/**
 * Storage quota warning and exceeded banner.
 *
 * QUOTA_EXCEEDED  → non-dismissible banner (data loss risk)
 * QUOTA_WARNING   → dismissible banner with "Don't show again" persisted to IDB
 *
 * Both banners link to Settings for clearing data.
 */

import { on } from './events.js'
import { Events } from './constants.js'
import { get, put } from './db.js'
import { announce } from '../a11y/announcer.js'

const SUPPRESS_KEY = 'quota-warning-suppressed'

/** @type {HTMLElement | null} */
let bannerEl = null

function removeBanner() {
  if (bannerEl) {
    bannerEl.remove()
    bannerEl = null
  }
}

/**
 * Build and mount a quota banner.
 * @param {{ dismissible: boolean }} options
 */
function showBanner({ dismissible }) {
  if (bannerEl) return // Already visible

  const banner = document.createElement('div')
  banner.className = 'qa-quota-banner'
  banner.setAttribute('role', 'alert')
  banner.setAttribute('aria-live', 'assertive')

  const message = document.createElement('span')
  message.textContent = 'Storage is running low. '
  banner.appendChild(message)

  const link = document.createElement('a')
  link.href = '#/settings'
  link.className = 'qa-quota-banner-link'
  link.textContent = 'Free up space in Settings.'
  banner.appendChild(link)

  if (dismissible) {
    const dismissBtn = document.createElement('button')
    dismissBtn.className = 'qa-quota-banner-dismiss'
    dismissBtn.textContent = "Don't show again"
    dismissBtn.addEventListener('click', async () => {
      await put('settings', { key: SUPPRESS_KEY, value: true })
      removeBanner()
    })
    banner.appendChild(dismissBtn)
  }

  const shell = document.getElementById('app-shell') || document.body
  shell.appendChild(banner)
  bannerEl = banner

  announce('Storage is running low. Visit Settings to free up space.')
}

/**
 * Subscribe to quota events. Call once on app init.
 */
export function init() {
  on(Events.DB_QUOTA_EXCEEDED, () => {
    removeBanner()
    showBanner({ dismissible: false })
  })

  on(Events.STORAGE_QUOTA_WARNING, async () => {
    if (bannerEl) return // Already shown
    try {
      const suppressed = await get('settings', SUPPRESS_KEY)
      if (suppressed?.value) return
    } catch {
      // IDB read failure — still show the warning
    }
    showBanner({ dismissible: true })
  })
}
