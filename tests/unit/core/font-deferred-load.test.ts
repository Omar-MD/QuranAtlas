import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Regression guard for the iOS WebKit deferred-load font bug.
// Apple Dev Forum 671608: @font-face fonts are never fetched on iOS Safari
// when the font is only used in dynamically-injected DOM (Svelte router
// mounts reader post-onboarding) — falls through to a system fallback.
// Workaround: the Arabic Quranic font must appear in the initial HTML
// referenced by an Arabic codepoint inside its unicode-range, in the
// render tree, with a renderable font size. Round 1 (font-size:1px +
// position:-9999px) was insufficient on real iPhones — iOS defers paint
// for sub-pixel font and off-viewport content, so font registration
// never fires. Round 2 uses visibility:hidden + zero box + 16px font.
describe('iOS WebKit font deferred-load workaround in index.html', () => {
  const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8')
  const family = 'Amiri Quran'

  it(`registers ${family} via a hidden element with an Arabic codepoint`, () => {
    const escFamily = family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(
      `<div[^>]*aria-hidden="true"[^>]*style="[^"]*font-family:\\s*'${escFamily}'[^"]*"[^>]*>[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF]+</div>`,
    )
    expect(html).toMatch(re)
  })

  // The workaround element must stay in the render tree (display:none drops
  // it and re-triggers the bug) and must have a renderable font-size (iOS
  // skips paint for sub-pixel font, which also skips font registration).
  const blocks = html.match(/<div[^>]*aria-hidden="true"[^>]*Amiri Quran[^>]*>[\s\S]*?<\/div>/g) ?? []

  it('workaround div is present (single Amiri Quran face)', () => {
    expect(blocks.length).toBe(1)
  })

  const block = blocks[0]

  it('never display:none', () => {
    expect(block).toBeDefined()
    expect(block!).not.toMatch(/display:\s*none/i)
  })

  it('visibility:hidden keeps it in the render tree', () => {
    expect(block!).toMatch(/visibility:\s*hidden/i)
  })

  it('font-size at least 12px (iOS skips paint for sub-pixel)', () => {
    const m = block!.match(/font-size:\s*(\d+)px/i)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(12)
  })
})
