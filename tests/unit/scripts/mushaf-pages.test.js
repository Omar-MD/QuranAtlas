import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  derivePageMappings,
  firstVerseByPage,
  optimizeSvgForDataset,
  quranWsPagePdfUrl,
  riwayatForProfile,
  validateSvgPageSet,
  writeMushafManifest,
} from '../../../scripts/data/mushaf-pages/build.mjs'
import {
  MUSHAF_COLOR_TOKENS,
  assertThemeableSvgIntegrity,
  themeMushafSvg,
} from '../../../scripts/data/mushaf-pages/theme-svg.mjs'
import { hasReusableSvgDocument } from '../../../scripts/data/mushaf-pages/import.mjs'
import { buildManifestPayload } from '../../../scripts/data/manifest/inventory.mjs'

const TEST_COLOR_MAP = {
  '#000000': 'ink',
  '#231f20': 'ink',
  '#ffffff': 'ground',
  '#7a5b28': 'ornament',
  '#9a6b2f': 'accent',
}

async function readCatalogJson(name) {
  return JSON.parse(await readFile(join(process.cwd(), 'data', 'catalog', name), 'utf8'))
}

describe('mushaf asset catalog', () => {
  it('exposes stable edition variants with compatible defaults', async () => {
    const mushafCatalog = await readCatalogJson('mushaf-assets.json')

    expect(mushafCatalog.defaults.qaloon).toBe('qalun-quran-ws-v1')
    expect(mushafCatalog.assets).toContainEqual(expect.objectContaining({
      riwayah: 'qaloon',
      mushafEditionId: 'qalun-quran-ws-v1',
      visibility: 'baseline',
      shipped: true,
    }))

    for (const asset of mushafCatalog.assets) {
      expect(asset.mushafEditionId).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+$/)
      expect(asset.pageCount).toBe(604)
      expect(asset.providerId).toBe('quran-ws')
      expect(asset.licenseId).toBe('quran-ws-free-use')
    }
    for (const [riwayah, mushafEditionId] of Object.entries(mushafCatalog.defaults)) {
      expect(mushafCatalog.assets.some((asset) => asset.riwayah === riwayah && asset.mushafEditionId === mushafEditionId)).toBe(true)
    }
  })
})

describe('mushaf page dataset builder', () => {
  it('builds quran.ws page PDF URLs with the source slug', () => {
    expect(quranWsPagePdfUrl('qalun', 42)).toBe('https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-42.pdf')
  })

  it('derives first verse by page from normalized riwayah ayat', () => {
    const result = firstVerseByPage([
      { sura_no: 1, aya_no: 1, page: '1' },
      { sura_no: 2, aya_no: 1, page: '2' },
      { sura_no: 2, aya_no: 255, page: '85-86' },
      { sura_no: 2, aya_no: 256, page: '86' },
    ])

    expect(result.get(1)).toEqual({ surah: 1, verse: 1 })
    expect(result.get(85)).toEqual({ surah: 2, verse: 255 })
    expect(result.get(86)).toEqual({ surah: 2, verse: 255 })
  })

  it('maps spanning ayat to their start page for verse-to-page navigation', () => {
    const { verseToPage } = derivePageMappings([
      { sura_no: 2, aya_no: 255, page: '85-86' },
    ])

    expect(verseToPage['2:255']).toBe(85)
  })

  it('keeps baseline page output to the default riwayah and full output to every riwayah', () => {
    expect(riwayatForProfile('baseline')).toEqual(['qaloon'])
    expect(riwayatForProfile('full')).toEqual(['hafs', 'warsh', 'qaloon'])
  })

  it('treats catalog profile as having no Mushaf page body output', () => {
    expect(riwayatForProfile('catalog')).toEqual([])
  })

  it('allows clean-checkout builds to skip missing page artifacts unless strict mode is requested', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const missing = join(root, 'missing')

    await expect(validateSvgPageSet(missing, 2, { missing: 'skip' })).resolves.toEqual([])
    await expect(validateSvgPageSet(missing, 2, { missing: 'error' })).rejects.toThrow(/missing page artifact directory/)

    await rm(root, { recursive: true, force: true })
  })

  it('validates that a page set has every required SVG', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const dir = join(root, 'pages')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, '001.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')

    await expect(validateSvgPageSet(dir, 2)).rejects.toThrow(/missing page 002/)

    await writeFile(join(dir, '002.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    await expect(validateSvgPageSet(dir, 2)).resolves.toHaveLength(2)

    await rm(root, { recursive: true, force: true })
  })

  it('rejects unsafe SVG content and external references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const dir = join(root, 'pages')
    await mkdir(dir, { recursive: true })

    await writeFile(join(dir, '001.svg'), '<svg><script>alert(1)</script></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><foreignObject>html</foreignObject></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><rect onclick="alert(1)"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><style>@import url(https://example.com/a.css)</style></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><image href="https://example.com/001.png"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><image href="data:image/png;base64,AAAA"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><a href="javascript:alert(1)"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><s:script xmlns:s="urn:test">alert(1)</s:script></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><a href="java&#x73;cript:alert(1)"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><image href="https&#x3a;//example.com/001.png"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<svg><style>.x{background:u\\72l(https://example.com/x.png)}</style></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<!DOCTYPE svg [<!ENTITY js "javascript:alert(1)">]><svg><a href="&js;"/></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await writeFile(join(dir, '001.svg'), '<?xml-stylesheet href="https://example.com/a.css"?><svg></svg>')
    await expect(validateSvgPageSet(dir, 1)).rejects.toThrow(/unsafe SVG/)

    await rm(root, { recursive: true, force: true })
  })

  it('allows same-document SVG url references emitted by pdftocairo', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const dir = join(root, 'pages')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, '001.svg'), `
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="clip-0"><path d="M 0 0 L 1 1"/></clipPath>
        </defs>
        <g clip-path="url(#clip-0)"><path d="M 0 0 L 1 1"/></g>
      </svg>
    `)

    await expect(validateSvgPageSet(dir, 1)).resolves.toHaveLength(1)

    await rm(root, { recursive: true, force: true })
  })

  it('optimizes exported SVGs without removing same-document references', () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10.123456 20.987654">
        <defs>
          <clipPath id="clip-0">
            <path d="M 1.234567 2.345678 L 3.456789 4.567891"/>
          </clipPath>
        </defs>
        <g clip-path="url(#clip-0)">
          <path d="M 5.555555 6.666666 L 7.777777 8.888888"/>
        </g>
      </svg>`

    const optimized = optimizeSvgForDataset(source)

    expect(optimized.length).toBeLessThan(source.length)
    expect(optimized).not.toContain('<?xml')
    expect(optimized).toContain('url(#clip-0)')
    expect(optimized).toContain('10.12')
    expect(optimized).toContain('1.23')
  })

  it('tokenizes theme colors while preserving SVG geometry and references', () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 20">
      <defs><clipPath id="clip-0"><path d="M 0 0 L 1 1" fill="#000000"/></clipPath></defs>
      <g id="page" clip-path="url(#clip-0)" opacity="0.7" transform="translate(1 2)">
        <path d="M 1 2 L 3 4" fill="#000000" fill-rule="evenodd"/>
        <path d="M 5 6 L 7 8" style="fill: #ffffff; stroke: #7a5b28; opacity: 0.5"/>
        <path d="M 8 9 L 9 10" stroke="#9a6b2f"/>
      </g>
    </svg>`

    const themed = themeMushafSvg(source, { filename: '001.svg', colorMap: TEST_COLOR_MAP })

    expect(themed.match(/<path\b/g)).toHaveLength(source.match(/<path\b/g).length)
    expect(themed).toContain('viewBox="0 0 10 20"')
    expect(themed).toContain('d="M 1 2 L 3 4"')
    expect(themed).toContain('d="M 5 6 L 7 8"')
    expect(themed).toContain('fill-rule="evenodd"')
    expect(themed).toContain('clip-path="url(#clip-0)"')
    expect(themed).toContain('opacity="0.7"')
    expect(themed).toContain('transform="translate(1 2)"')
    expect(themed).toContain(`fill="${MUSHAF_COLOR_TOKENS.ink}"`)
    expect(themed).toContain(`fill="${MUSHAF_COLOR_TOKENS.ground}"`)
    expect(themed).toContain(`stroke="${MUSHAF_COLOR_TOKENS.ornament}"`)
    expect(themed).toContain(`stroke="${MUSHAF_COLOR_TOKENS.accent}"`)
    expect(themed).toContain('style="opacity: 0.5"')
    expect(themed).not.toMatch(/#(?:000000|ffffff|7a5b28|9a6b2f)/i)
    expect(() => assertThemeableSvgIntegrity(source, themed, '001.svg')).not.toThrow()
  })

  it('normalizes source CSS percentage colors before token classification', () => {
    const themed = themeMushafSvg('<svg viewBox="0 0 1 1"><path fill="rgb(100%, 100%, 100%)"/><path fill="rgb(13.725281%, 12.156677%, 12.548828%)"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })

    expect(themed).toContain(`fill="${MUSHAF_COLOR_TOKENS.ground}"`)
    expect(themed).toContain(`fill="${MUSHAF_COLOR_TOKENS.ink}"`)
  })

  it('rejects unclassified colors, unsafe attributes, and remote SVG references while tokenizing', () => {
    expect(() => themeMushafSvg('<svg viewBox="0 0 1 1"><path fill="#123456"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })).toThrow(/Unclassified Mushaf SVG color/)

    expect(() => themeMushafSvg('<svg viewBox="0 0 1 1"><path onclick="alert(1)" fill="#000000"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })).toThrow(/unsafe SVG/)

    expect(() => themeMushafSvg('<svg viewBox="0 0 1 1"><image href="https://example.com/page.png"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })).toThrow(/unsafe SVG/)

    expect(() => themeMushafSvg('<svg viewBox="0 0 1 1"><style>.a{fill:#123456}</style><path class="a" d="M0 0"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })).toThrow(/unsafe SVG/)

    expect(() => themeMushafSvg('<svg viewBox="0 0 1 1"><animate attributeName="href" to="https://example.com"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })).toThrow(/unsafe SVG/)
  })

  it('reuses only safe existing SVG imports', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const good = join(root, 'good.svg')
    const unsafe = join(root, 'unsafe.svg')
    const invalid = join(root, 'invalid.svg')
    await writeFile(good, '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    await writeFile(unsafe, '<svg><script>alert(1)</script></svg>')
    await writeFile(invalid, '<html><svg></svg></html>')

    await expect(hasReusableSvgDocument(good)).resolves.toBe(true)
    await expect(hasReusableSvgDocument(unsafe)).resolves.toBe(false)
    await expect(hasReusableSvgDocument(invalid)).resolves.toBe(false)
    await expect(hasReusableSvgDocument(join(root, 'missing.svg'))).resolves.toBe(false)

    await rm(root, { recursive: true, force: true })
  })

  it('writes a manifest with page bytes, viewBoxes, source PDF URLs, and first verse references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const out = join(root, 'public', 'dataset', 'mushaf-pages', 'qaloon')
    const pages = join(out, 'pages')
    await mkdir(pages, { recursive: true })
    const themedSvg = themeMushafSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 20"><path fill="#000000"/></svg>', {
      filename: '001.svg',
      colorMap: TEST_COLOR_MAP,
    })
    await writeFile(join(pages, '001.svg'), themedSvg)

    const manifestPath = await writeMushafManifest({
      outDir: out,
      riwayah: 'qaloon',
      sourceSlug: 'qalun',
      pageCount: 1,
      firstVerse: new Map([[1, { surah: 1, verse: 1 }]]),
      verseToPage: { '1:1': 1 },
      pageViewBoxes: new Map([[1, '0 0 10 20']]),
    })

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    expect(manifest.riwayah).toBe('qaloon')
    expect(manifest.sourceSlug).toBe('qalun')
    expect(manifest.pages[0]).toMatchObject({
      page: 1,
      assetPath: 'pages/001.svg',
      viewBox: '0 0 10 20',
      sourcePdfUrl: 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-1.pdf',
      firstVerse: { surah: 1, verse: 1 },
    })
    expect(manifest.pages[0].bytes).toBeGreaterThan(0)
    expect(themedSvg).toContain(`viewBox="${manifest.pages[0].viewBox}"`)
    expect(manifest.verseToPage).toEqual({ '1:1': 1 })

    await rm(root, { recursive: true, force: true })
  })

  it('inventories Mushaf page assets as the pages lane', async () => {
    const root = await mkdtemp(join(tmpdir(), 'qa-mushaf-'))
    const datasetDir = join(root, 'public', 'dataset')
    const packDir = join(datasetDir, 'mushaf-pages', 'qaloon')
    const pages = join(packDir, 'pages')
    await mkdir(pages, { recursive: true })
    await writeFile(join(packDir, 'manifest.json'), JSON.stringify({ riwayah: 'qaloon' }))
    await writeFile(join(pages, '001.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')

    const manifest = await buildManifestPayload({
      datasetDir,
      riwayatDir: join(datasetDir, 'riwayat'),
      translationsDir: join(datasetDir, 'translations'),
      provenance: { builtAt: 'test' },
      packageVersion: 'test',
      profileName: 'baseline',
    })

    expect(manifest.lanes.pages).toMatchObject({ enabled: true, files: 2 })
    expect(manifest.files).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: 'mushaf-pages/qaloon/manifest.json',
        lane: 'pages',
        category: 'pages',
        bytes: expect.any(Number),
      }),
      expect.objectContaining({
        path: 'mushaf-pages/qaloon/pages/001.svg',
        lane: 'pages',
        category: 'pages',
        bytes: expect.any(Number),
      }),
    ]))
    expect(manifest.lanes.pages.files).toBe(2)

    await rm(root, { recursive: true, force: true })
  })
})
