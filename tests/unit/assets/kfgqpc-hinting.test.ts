/**
 * Regression guard: KFGQPC HAFS woff2 ships with TrueType hinting tables.
 *
 * Why this test exists: upstream KFGQPC `hafs.18.woff2` ships unhinted
 * (no `fpgm` / `prep` / `cvt`, `maxp.maxFunctionDefs = 0`). FreeType
 * (Skia / Chromium) auto-hints unhinted fonts → strokes thicken on the
 * device grid; CoreGraphics / Quartz (WebKit / Safari macOS + iOS) does
 * NOT auto-hint → strokes hairline. `scripts/font-diag/hint-kfgqpc.sh`
 * runs perpendicular outline embolden + ttfautohint over the upstream
 * TTF and repackages a hinted woff2 so both rasterisers grid-fit
 * identically. This test parses the WOFF2 table directory and asserts
 * the three hinting tables are present — preventing a silent regression
 * back to upstream unhinted bytes.
 *
 * Hafs-only because Warsh and Qaloon (KFGQPC v0.10) have outline-geometry
 * bugs in CoreGraphics that survive every binary post-process. They ship
 * raw upstream and are substituted at the CSS layer on WebKit
 * (`src/styles/tokens/semantic.css` `[data-engine='safari']` block →
 * Amiri Quran). See `docs/context/riwayat-dataset.md` § "Cross-engine
 * rendering" for the full landscape.
 *
 * Test runs in pure Node — no font tooling dependency.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// WOFF2 spec section 5: well-known table tag table. The lower 6 bits of
// each table-directory entry's flags byte index into this list.
const KNOWN_TABLES = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post',
  'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT',
  'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea',
  'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH',
  'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar',
  'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar',
  'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop',
  'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Sill', 'Silt',
]

// Read a WOFF2 UIntBase128: variable length 1-5 bytes, low 7 bits of each
// byte are data, bit 7 set means another byte follows.
function readBase128(buf: Buffer, offset: number): { value: number, next: number } {
  let value = 0
  let n = offset
  for (let i = 0; i < 5; i++) {
    const b = buf[n++]
    value = (value << 7) | (b & 0x7f)
    if ((b & 0x80) === 0) {
      return { value, next: n }
    }
  }
  throw new Error('UIntBase128 too long')
}

function parseWoff2Tables(buf: Buffer): string[] {
  if (buf.toString('ascii', 0, 4) !== 'wOF2') {
    throw new Error('not a WOFF2 file')
  }
  const numTables = buf.readUInt16BE(12)
  const tags: string[] = []
  let cursor = 48 // header is 48 bytes
  for (let i = 0; i < numTables; i++) {
    const flags = buf[cursor++]
    const tagIndex = flags & 0x3f
    let tag: string
    if (tagIndex === 0x3f) {
      tag = buf.toString('ascii', cursor, cursor + 4)
      cursor += 4
    } else {
      tag = KNOWN_TABLES[tagIndex]
    }
    tags.push(tag)
    // origLength
    cursor = readBase128(buf, cursor).next
    // transformLength only present for `glyf` and `loca` per spec
    if (tag === 'glyf' || tag === 'loca') {
      cursor = readBase128(buf, cursor).next
    }
  }
  return tags
}

describe('KFGQPC Hafs woff2 ships hinted — cross-engine rendering parity guard', () => {
  it('hafs.18.woff2 contains fpgm + prep + cvt', () => {
    const path = 'public/fonts/kfgqpc-hafs/hafs.18.woff2'
    const buf = readFileSync(resolve(process.cwd(), path))
    const tags = parseWoff2Tables(buf)
    expect(tags, `${path} table directory`).toContain('fpgm')
    expect(tags, `${path} table directory`).toContain('prep')
    expect(tags, `${path} table directory`).toContain('cvt ')
  })
})
