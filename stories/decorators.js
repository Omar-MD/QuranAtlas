/**
 * Shared Storybook decorators for QuranAtlas stories.
 */

/**
 * App shell decorator.
 * Creates the DOM structure that route handlers expect:
 * #app-shell > #top-bar, #main-content, #nav-surface, #bottom-nav
 *
 * Stories that need the app shell should use this decorator (applied globally).
 * Stories that opt out can set parameters.appShell = false.
 */
export function withAppShell(storyFn, context) {
  // Allow stories to opt out
  if (context.parameters.appShell === false) {
    return storyFn()
  }

  // Clean up any existing shell
  const existing = document.getElementById('app-shell')
  if (existing) {
    existing.remove()
  }

  const appShell = document.createElement('div')
  appShell.id = 'app-shell'

  const topBar = document.createElement('header')
  topBar.id = 'top-bar'

  const mainContent = document.createElement('main')
  mainContent.id = 'main-content'

  const navSurface = document.createElement('nav')
  navSurface.id = 'nav-surface'
  navSurface.hidden = true

  const bottomNav = document.createElement('footer')
  bottomNav.id = 'bottom-nav'

  appShell.appendChild(topBar)
  appShell.appendChild(mainContent)
  appShell.appendChild(navSurface)
  appShell.appendChild(bottomNav)

  document.body.appendChild(appShell)

  // Apply theme from Storybook background
  const bg = context.globals?.backgrounds?.value
  if (bg === '#f5e6d3') {
    document.documentElement.setAttribute('data-theme', 'sepia')
  } else if (bg === '#0f0f13') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.setAttribute('data-theme', 'light')
  }

  // Let the story render into the shell
  const result = storyFn()

  // If the story returned a DOM node, it handles its own rendering
  // If it returned a string, inject into main-content
  if (typeof result === 'string') {
    mainContent.textContent = ''
    const wrapper = document.createElement('div')
    wrapper.textContent = result
    mainContent.appendChild(wrapper)
  }

  return appShell
}
