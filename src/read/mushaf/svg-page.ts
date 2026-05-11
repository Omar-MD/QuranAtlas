import { parseViewBox } from './sizing'
import type { InlineMushafSvg } from './types'

const MUSHAF_PAGE_ASSET_RE = /^\/dataset\/mushaf-pages\/(hafs|warsh|qaloon)\/pages\/\d{3}\.svg$/
const URL_ATTRS = new Set([
  'clip-path',
  'mask',
  'filter',
  'fill',
  'stroke',
])
const FRAGMENT_ONLY_ATTRS = new Set(['href', 'xlink:href', 'src'])

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

  const response = await fetch(decodedPath, { signal })
  if (!response.ok) throw new Error(`Failed to load Mushaf page SVG: ${response.status}`)
  return prepareInlineMushafSvg(await response.text())
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
  const viewBox = parseViewBox(viewBoxText)

  root.removeAttribute('tabindex')
  root.removeAttribute('role')
  removeAriaAttributes(root)
  root.classList.add('qa-mushaf-svg')
  root.setAttribute('aria-hidden', 'true')
  root.setAttribute('focusable', 'false')

  for (const node of Array.from(root.querySelectorAll('title, desc'))) {
    node.remove()
  }

  for (const element of Array.from(root.querySelectorAll('*'))) {
    element.removeAttribute('tabindex')
    element.removeAttribute('role')
    removeAriaAttributes(element)
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
    if (trimmed.startsWith('#')) validateUrlReference(trimmed)
    else if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|data:|\/|\.{1,2}\/)/i.test(trimmed)) {
      throw new Error('Mushaf page SVG contains unsafe content')
    }
    return
  }
  for (const match of value.matchAll(/\burl\s*\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gis)) {
    validateUrlReference((match[2] ?? match[3] ?? '').trim())
  }
}

function validateUrlReference(value: string): void {
  if (!/^#[A-Za-z_][\w:.-]*$/.test(value)) {
    throw new Error('Mushaf page SVG contains unsafe content')
  }
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
