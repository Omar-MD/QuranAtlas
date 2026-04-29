import { mount } from 'svelte'
import App from './App.svelte'
import * as haptics from './core/haptics.ts'

// Belt-and-suspenders zoom lock for iOS Safari, which ignores
// user-scalable=no in the viewport meta. The viewport meta still owns
// the primary lock; this catches pinch + ctrl+wheel + double-tap.
document.addEventListener('gesturestart', (e) => e.preventDefault())
document.addEventListener('gesturechange', (e) => e.preventDefault())
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey) { e.preventDefault() }
}, { passive: false })

// Delegated haptic feedback for touch taps on interactive elements.
// Skipped on mouse pointers and when the target is disabled or marked
// `data-no-haptic`. Android delivers a real vibration pulse; iOS has no
// vibrate API so this is a silent no-op (visual :active press still
// fires from base.css). Triggers on pointerdown for snappiest feedback.
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') { return }
  const t = (e.target as Element | null)?.closest?.(
    'button, [role="button"], [role="switch"], [role="radio"], [role="tab"], a, summary, label[for]'
  ) as HTMLElement | null
  if (!t) { return }
  if (t.hasAttribute('disabled') || t.getAttribute('aria-disabled') === 'true') { return }
  if (t.dataset.noHaptic !== undefined) { return }
  const role = t.getAttribute('role')
  if (role === 'switch') { haptics.toggle(); return }
  if (role === 'radio') { haptics.select(); return }
  haptics.tap()
}, { passive: true, capture: true })

const target = document.getElementById('app')
if (!target) { throw new Error('[app] Mount target #app not found in DOM') }
mount(App, { target })
