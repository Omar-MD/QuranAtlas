import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Regression guard for the iOS WebKit deferred-load font bug.
// Apple Dev Forum 671608: @font-face fonts are never fetched on iOS Safari
// when the font is only used in dynamically-injected DOM (Svelte router
// mounts reader post-onboarding) — falls through to Amiri fallback.
// Workaround: each KFGQPC family must appear in the initial HTML referenced
// by an Arabic codepoint inside its unicode-range. display:none breaks the
// workaround (drops from render tree), so position:absolute off-screen is
// the only safe pattern.
describe('iOS WebKit font deferred-load workaround in index.html', () => {
  const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8')

  for (const family of ['KFGQPC Hafs', 'KFGQPC Warsh', 'KFGQPC Qaloon']) {
    it(`registers ${family} via an off-screen element with an Arabic codepoint`, () => {
      const escFamily = family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(
        `<div[^>]*aria-hidden="true"[^>]*style="[^"]*position:\\s*absolute[^"]*font-family:\\s*'${escFamily}'[^"]*"[^>]*>[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF]+</div>`,
      )
      expect(html).toMatch(re)
    })
  }

  it('workaround elements never use display:none (would re-trigger the WebKit bug)', () => {
    const matches = html.match(/<div[^>]*aria-hidden="true"[^>]*KFGQPC[^>]*>.*?<\/div>/g) ?? []
    expect(matches.length).toBeGreaterThan(0)
    for (const m of matches) {
      expect(m).not.toMatch(/display:\s*none/i)
    }
  })
})
