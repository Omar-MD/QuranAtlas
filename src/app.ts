import { mount } from 'svelte'
import App from './App.svelte'

// Belt-and-suspenders zoom lock for iOS Safari, which ignores
// user-scalable=no in the viewport meta. The viewport meta still owns
// the primary lock; this catches pinch + ctrl+wheel + double-tap.
document.addEventListener('gesturestart', (e) => e.preventDefault())
document.addEventListener('gesturechange', (e) => e.preventDefault())
document.addEventListener('wheel', (e) => {
  if (e.ctrlKey) { e.preventDefault() }
}, { passive: false })

const target = document.getElementById('app')
if (!target) { throw new Error('[app] Mount target #app not found in DOM') }
mount(App, { target })
