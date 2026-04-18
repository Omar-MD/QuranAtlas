/**
 * First-run onboarding flow — 4 screens, progress dots, Skip from screen 2.
 * Persists `onboardingComplete = true` to IDB settings on completion or skip.
 */

import { get, put } from '../core/db.js'
import { renderScreen } from './screens.js'

export async function isComplete() {
  try {
    const rec = await get('settings', 'onboardingComplete')
    return rec?.value === true
  } catch { return false }
}

export async function markComplete() {
  try { await put('settings', { key: 'onboardingComplete', value: true }) } catch { /* ignore */ }
}

export async function init() {
  const mainContent = document.getElementById('main-content')
  if (!mainContent) { return }
  while (mainContent.firstChild) { mainContent.removeChild(mainContent.firstChild) }

  const wrap = document.createElement('div')
  wrap.className = 'qa-onboarding'
  mainContent.appendChild(wrap)

  let screen = 1

  const show = async () => {
    while (wrap.firstChild) { wrap.removeChild(wrap.firstChild) }
    await renderScreen(wrap, screen, {
      total: 5,
      onContinue: () => { screen += 1; if (screen > 5) { finish('fatihah') } else { show() } },
      onSkip: () => { finish('fatihah') },
      onFinishFatihah: () => finish('fatihah'),
      onFinishSurahList: () => finish('surahs'),
    })
  }

  async function finish(dest) {
    await markComplete()
    if (dest === 'surahs') {
      window.location.hash = '#/surahs'
    } else {
      window.location.hash = '#/s/1'
    }
  }

  await show()

  return () => {}
}
