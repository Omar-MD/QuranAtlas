import AxeBuilder from '@axe-core/playwright'

/**
 * Run axe-core against the current page and return violations.
 * Serious + critical only by default — skip minor + moderate to keep the catalog focused.
 */
export async function scanA11y(page, opts = {}) {
  const builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  if (opts.include) { builder.include(opts.include) }
  if (opts.exclude) { builder.exclude(opts.exclude) }
  const results = await builder.analyze()
  return results.violations.filter(v =>
    v.impact === 'serious' || v.impact === 'critical'
  )
}

/**
 * Walk forward through focusable elements with Tab, collect their aria-labels / text.
 * Asserts focus is trapped inside `container` if provided.
 */
export async function tabThrough(page, steps = 20, { container } = {}) {
  const trail = []
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate((sel) => {
      const el = document.activeElement
      if (!el) return null
      const inContainer = sel ? !!el.closest(sel) : true
      return {
        tag: el.tagName,
        label: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 60),
        inContainer,
      }
    }, container)
    trail.push(info)
  }
  return trail
}
