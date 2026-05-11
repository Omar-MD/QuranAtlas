import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadInlineMushafSvg, prepareInlineMushafSvg } from '../../../../src/read/mushaf/svg-page'

const safeSvg = '<svg viewBox="0 0 10 20"><title>Title</title><desc>Desc</desc><g role="img" aria-label="x"><path tabindex="0" d="M0 0" fill="var(--qa-mushaf-ink)" clip-path="url(#clip0)"/></g></svg>'

function response(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as Response
}

describe('mushaf inline SVG helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('rejects non-dataset and malformed page URLs before fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadInlineMushafSvg('https://example.com/001.svg')).rejects.toThrow(/Invalid Mushaf asset URL/)
    await expect(loadInlineMushafSvg('/dataset/mushaf-pages/qaloon/pages/001.svg?x=1')).rejects.toThrow(/Invalid Mushaf asset URL/)
    await expect(loadInlineMushafSvg('/dataset/mushaf-pages/qaloon/pages/%30%30%31.svg')).rejects.toThrow(/Invalid Mushaf asset URL/)
    await expect(loadInlineMushafSvg('/dataset/mushaf-pages/qaloon/manifest.json')).rejects.toThrow(/Invalid Mushaf asset URL/)
    await expect(loadInlineMushafSvg('/dataset/mushaf-pages/qaloon/pages/../001.svg')).rejects.toThrow(/Invalid Mushaf asset URL/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches a same-origin page URL and returns sanitized inline markup', async () => {
    const fetchMock = vi.fn(async () => response(safeSvg))
    vi.stubGlobal('fetch', fetchMock)

    const svg = await loadInlineMushafSvg('/dataset/mushaf-pages/qaloon/pages/001.svg')

    expect(fetchMock).toHaveBeenCalledWith('/dataset/mushaf-pages/qaloon/pages/001.svg', { signal: undefined })
    expect(svg.viewBox).toEqual({ minX: 0, minY: 0, width: 10, height: 20 })
    expect(svg.viewBoxText).toBe('0 0 10 20')
    expect(svg.markup).toContain('class="qa-mushaf-svg"')
    expect(svg.markup).toContain('aria-hidden="true"')
    expect(svg.markup).not.toContain('<title')
    expect(svg.markup).not.toContain('<desc')
    expect(svg.markup).not.toContain('tabindex')
    expect(svg.markup).not.toContain('role=')
    expect(svg.markup).not.toContain('aria-label')
  })

  it('rewrites raw quran.ws page colors to theme tokens at runtime', () => {
    const svg = prepareInlineMushafSvg(
      '<svg viewBox="0 0 10 20"><path d="M0 0h10v20H0z" fill="rgb(100%, 100%, 100%)"/><path d="M1 1" fill="#231f20"/><path d="M2 2" fill="#000"/></svg>',
    )

    expect(svg.markup).toContain('fill="var(--qa-mushaf-ground)"')
    expect(svg.markup.match(/fill="var\(--qa-mushaf-ink\)"/g) ?? []).toHaveLength(2)
    expect(svg.markup).not.toContain('rgb(')
    expect(svg.markup).not.toContain('#231f20')
    expect(svg.markup).not.toContain('#000')
  })

  it('crops quran.ws page geometry for display while preserving the source viewBox for manifest validation', () => {
    const svg = prepareInlineMushafSvg('<svg viewBox="0 0 900 1379.25"><path d="M0 0" fill="#000"/></svg>')

    expect(svg.viewBoxText).toBe('0 0 900 1379.25')
    expect(svg.viewBox).toEqual({ minX: 60, minY: 60, width: 790, height: 1270 })
    expect(svg.markup).toContain('viewBox="60 60 790 1270"')
  })

  it('rejects missing viewBox and unsafe SVG content', () => {
    expect(() => prepareInlineMushafSvg('<svg><path d="M0 0"/></svg>')).toThrow(/missing viewBox/)
    expect(() => prepareInlineMushafSvg('<svg viewBox="0 0 1 1"><script /></svg>')).toThrow(/unsafe content/)
    expect(() => prepareInlineMushafSvg('<svg viewBox="0 0 1 1"><foreignObject /></svg>')).toThrow(/unsafe content/)
    expect(() => prepareInlineMushafSvg('<svg viewBox="0 0 1 1"><path onclick="x()" /></svg>')).toThrow(/unsafe content/)
    expect(() => prepareInlineMushafSvg('<svg viewBox="0 0 1 1"><style>@import url(x)</style></svg>')).toThrow(/unsafe content/)
    expect(() => prepareInlineMushafSvg('<svg viewBox="0 0 1 1"><path clip-path="url(https://example.com/x)" /></svg>')).toThrow(/unsafe content/)
    expect(() => prepareInlineMushafSvg('<svg viewBox="0 0 1 1"><path clip-path="url(data:text/plain,x)" /></svg>')).toThrow(/unsafe content/)
    expect(() => prepareInlineMushafSvg('<svg viewBox="0 0 1 1"><use href="/dataset/mushaf-pages/qaloon/pages/001.svg#x" /></svg>')).toThrow(/unsafe content/)
    expect(() => prepareInlineMushafSvg('<svg viewBox="0 0 1 1"><path clip-path="/dataset/mushaf-pages/qaloon/pages/001.svg#x" /></svg>')).toThrow(/unsafe content/)
  })

  it('rejects focusable descendants after sanitization', () => {
    expect(() => prepareInlineMushafSvg('<svg viewBox="0 0 1 1"><a href="#x"><path d="M0 0"/></a></svg>')).toThrow(/focusable descendants/)
  })
})
