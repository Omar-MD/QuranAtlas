/**
 * Find the nearest scrolling ancestor of `el`.
 *
 * Walks up the DOM looking for an element whose computed `overflow-y` is
 * `auto` or `scroll`. Falls back to `#main-content` by id (the app-shell
 * scroll host) if the walker misses — defensive fallback for dev-tool
 * overrides and tests.
 *
 * Scroll events do NOT bubble. Modules that attach scroll listeners or
 * configure IntersectionObserver with a `root` option need the actual
 * scrolling element, not a visual wrapper.
 *
 * @param el         - Start node for the walk.
 * @param opts.requireOverflowing - When true, additionally require
 *   `scrollHeight > clientHeight`. Use for listeners that must bind to an
 *   element that is actually scrollable right now (chunked-append). Leave
 *   false for observers that want the element that WILL scroll once content
 *   grows (observeScroll over a freshly-mounted list).
 */
export function findScrollAncestor(
  el: HTMLElement,
  opts: { requireOverflowing?: boolean } = {},
): HTMLElement | null {
  const { requireOverflowing = false } = opts
  let cur: HTMLElement | null = el
  while (cur && cur !== document.body && cur !== document.documentElement) {
    const style = getComputedStyle(cur)
    const oy = style.overflowY
    if (oy === 'auto' || oy === 'scroll') {
      if (!requireOverflowing || cur.scrollHeight > cur.clientHeight) {
        return cur
      }
    }
    cur = cur.parentElement
  }
  return document.getElementById('main-content')
}
