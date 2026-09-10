// SVG/CSS security decoder shared by the Mushaf page pipeline (audit §5:
// theme-svg.mjs and mushaf-pages/build.mjs kept verbatim copies of this
// security-critical layer). Bodies moved verbatim; both copies were
// byte-identical, so the union added nothing.
import { codepointToString, decodeHtmlEntities } from './html-entities.mjs'

export function localName(name) {
  return String(name ?? '')
    .split(':')
    .pop()
    .toLowerCase()
}

export function hasUnsafeCssUrlReference(value) {
  for (const match of String(value).matchAll(/\burl\s*\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gis)) {
    const raw = (match[2] ?? match[3] ?? '').trim()
    if (!/^#[A-Za-z_][\w:.-]*$/.test(raw)) return true
  }
  return false
}

export function normalizeCssEscapes(value) {
  return String(value)
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => codepointToString(Number.parseInt(hex, 16)))
    .replace(/\\([^0-9a-f])/gi, '$1')
}

export function isUnsafeReference(value) {
  const normalized = normalizeCssEscapes(decodeHtmlEntities(value))
    .replace(/[\p{Cc}\s]+/gu, '')
    .toLowerCase()
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/.test(normalized)
}
