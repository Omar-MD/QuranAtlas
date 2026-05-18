import { cacheNameFor } from '../../infra/sw/route-defs'
import { displayViewBoxForMushafPage, parseViewBox, viewBoxText as serializeViewBox } from './sizing'
import type { InlineMushafSvg } from './types'

const MUSHAF_PAGE_ASSET_RE = /^\/dataset\/mushaf-pages\/(hafs|warsh|qaloon)\/[a-z0-9]+(?:-[a-z0-9]+)*-v\d+\/pages\/\d{3}\.svg$/
const URL_ATTRS = new Set([
  'clip-path',
  'mask',
  'filter',
  'fill',
  'stroke',
])
const FRAGMENT_ONLY_ATTRS = new Set(['href', 'xlink:href', 'src'])
const COLORLESS_VALUES = new Set(['none', 'transparent', 'inherit', 'currentcolor'])
const RUNTIME_COLOR_TOKENS: Record<string, string> = {
  '#ffffff': 'var(--qa-mushaf-ground)',
  '#000000': 'var(--qa-mushaf-ink)',
  '#231f20': 'var(--qa-mushaf-ink)',
}

export async function loadInlineMushafSvg(
  assetUrl: string,
  signal?: AbortSignal,
): Promise<InlineMushafSvg> {
  let decodedPath = ''
  try {
    decodedPath = decodeURIComponent(assetUrl.split(/[?#]/, 1)[0] ?? '')
  } catch {
    throw new Error(`Invalid Mushaf asset URL: ${assetUrl}`)
  }

  if (
    assetUrl !== decodedPath
    || decodedPath.includes('..')
    || !MUSHAF_PAGE_ASSET_RE.test(decodedPath)
  ) {
    throw new Error(`Invalid Mushaf asset URL: ${assetUrl}`)
  }

  const response = await fetch(decodedPath, { signal }).catch(() => null)
  if (response?.ok) {
    return prepareInlineMushafSvg(await response.text())
  }

  const cached = await cachedSvgResponse(decodedPath).catch(() => null)
  if (cached?.ok) return prepareInlineMushafSvg(await cached.text())

  throw new Error(`Failed to load Mushaf page SVG: ${response?.status ?? 'offline'}`)
}

async function cachedSvgResponse(path: string): Promise<Response | null> {
  if (typeof caches === 'undefined') return null
  const absolute = new URL(path, location.origin)
  const cacheName = cacheNameFor(absolute)
  if (!cacheName) return null
  const cache = await caches.open(cacheName)
  return (await cache.match(absolute.href)) || (await cache.match(path)) || null
}

export function prepareInlineMushafSvg(text: string): InlineMushafSvg {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    throw new Error('Inline SVG parsing is not supported in this environment')
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(text, 'image/svg+xml')
  const parseError = document.querySelector('parsererror')
  if (parseError) throw new Error('Invalid Mushaf page SVG')

  const root = document.documentElement
  if (!root || localName(root) !== 'svg') throw new Error('Invalid Mushaf page SVG')

  validateSafeSvgTree(root)

  const viewBoxText = root.getAttribute('viewBox')?.trim()
  if (!viewBoxText) throw new Error('Mushaf page SVG is missing viewBox')
  const sourceViewBox = parseViewBox(viewBoxText)
  const viewBox = displayViewBoxForMushafPage(sourceViewBox)

  root.removeAttribute('tabindex')
  root.removeAttribute('role')
  removeAriaAttributes(root)
  root.classList.add('qa-mushaf-svg')
  root.setAttribute('aria-hidden', 'true')
  root.setAttribute('focusable', 'false')
  root.setAttribute('viewBox', serializeViewBox(viewBox))

  for (const node of Array.from(root.querySelectorAll('title, desc'))) {
    node.remove()
  }

  for (const element of Array.from(root.querySelectorAll('*'))) {
    element.removeAttribute('tabindex')
    element.removeAttribute('role')
    removeAriaAttributes(element)
    rewriteRuntimePaintAttributes(element)
  }

  const focusable = Array.from(root.querySelectorAll('*')).find(isFocusableSvgDescendant)
  if (focusable) throw new Error('Mushaf page SVG contains focusable descendants')

  const markup = new XMLSerializer().serializeToString(root)
  return { markup, viewBox, viewBoxText }
}

function validateSafeSvgTree(root: Element): void {
  const elements = [root, ...Array.from(root.querySelectorAll('*'))]
  for (const element of elements) {
    const name = localName(element)
    if (name === 'script' || name === 'foreignobject' || name === 'style') {
      throw new Error('Mushaf page SVG contains unsafe content')
    }
    for (const attr of Array.from(element.attributes)) {
      const attrName = attr.name.toLowerCase()
      const attrValue = attr.value
      if (attrName.startsWith('on')) {
        throw new Error('Mushaf page SVG contains unsafe content')
      }
      if (attrName === 'style') validateInlineStyle(attrValue)
      if (FRAGMENT_ONLY_ATTRS.has(attrName) || attrName.endsWith(':href')) {
        validateUrlReference(attrValue.trim())
      } else if (URL_ATTRS.has(attrName)) {
        validateUrlAttribute(attrValue)
      }
    }
  }
}

function validateInlineStyle(value: string): void {
  if (/@import\b/i.test(value)) throw new Error('Mushaf page SVG contains unsafe content')
  for (const match of value.matchAll(/\burl\s*\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gis)) {
    validateUrlReference((match[2] ?? match[3] ?? '').trim())
  }
}

function validateUrlAttribute(value: string): void {
  const trimmed = value.trim()
  if (!/\burl\s*\(/i.test(value)) {
    if (trimmed.startsWith('#') && !isHexColorLiteral(trimmed)) validateUrlReference(trimmed)
    else if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|data:|\/|\.{1,2}\/)/i.test(trimmed)) {
      throw new Error('Mushaf page SVG contains unsafe content')
    }
    return
  }
  for (const match of value.matchAll(/\burl\s*\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gis)) {
    validateUrlReference((match[2] ?? match[3] ?? '').trim())
  }
}

function isHexColorLiteral(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
}

function validateUrlReference(value: string): void {
  if (!/^#[A-Za-z_][\w:.-]*$/.test(value)) {
    throw new Error('Mushaf page SVG contains unsafe content')
  }
}

function rewriteRuntimePaintAttributes(element: Element): void {
  for (const attrName of ['fill', 'stroke']) {
    const value = element.getAttribute(attrName)
    if (value === null) continue
    element.setAttribute(attrName, runtimePaintValue(value))
  }
}

function runtimePaintValue(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('var(--qa-mushaf-')) return trimmed
  const normalized = normalizeColorLiteral(trimmed)
  if (COLORLESS_VALUES.has(normalized) || /^url\(\s*#[A-Za-z_][\w:.-]*\s*\)$/i.test(normalized)) {
    return trimmed
  }
  return RUNTIME_COLOR_TOKENS[normalized] ?? trimmed
}

function normalizeColorLiteral(value: string): string {
  const lower = value.trim().toLowerCase()
  const shortHex = lower.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
  if (shortHex) return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`
  if (/^#[0-9a-f]{6}$/.test(lower)) return lower

  const rgb = lower.match(/^rgba?\(\s*(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*[,/]\s*(?:1|100%))?\s*\)$/)
  if (rgb) {
    const parts = rgb.slice(1, 4).map((part) => Number.parseInt(part, 10))
    if (parts.every((part) => part >= 0 && part <= 255)) {
      return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`
    }
  }

  const percentRgb = lower.match(/^rgba?\(\s*(\d+(?:\.\d+)?)%(?:\s*,\s*|\s+)(\d+(?:\.\d+)?)%(?:\s*,\s*|\s+)(\d+(?:\.\d+)?)%(?:\s*[,/]\s*(?:1|100%))?\s*\)$/)
  if (percentRgb) {
    const parts = percentRgb.slice(1, 4).map((part) => Math.round((Number.parseFloat(part) / 100) * 255))
    if (parts.every((part) => part >= 0 && part <= 255)) {
      return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`
    }
  }

  return lower
}

function removeAriaAttributes(element: Element): void {
  for (const attr of Array.from(element.attributes)) {
    if (attr.name.toLowerCase().startsWith('aria-')) element.removeAttribute(attr.name)
  }
}

function isFocusableSvgDescendant(element: Element): boolean {
  if (element.getAttribute('focusable')?.toLowerCase() === 'true') return true
  if (element.hasAttribute('contenteditable')) return true
  const name = localName(element)
  return name === 'a' && (element.hasAttribute('href') || element.hasAttribute('xlink:href'))
}

function localName(element: Element): string {
  return element.localName.toLowerCase()
}
