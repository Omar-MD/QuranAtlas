export const MUSHAF_COLOR_TOKENS = {
  ground: 'var(--qa-mushaf-ground)',
  ink: 'var(--qa-mushaf-ink)',
  ornament: 'var(--qa-mushaf-ornament)',
  accent: 'var(--qa-mushaf-accent)',
}

const COLORLESS_VALUES = new Set(['none', 'transparent', 'inherit', 'currentcolor'])
const ALLOWED_ELEMENTS = new Set(['svg', 'defs', 'clippath', 'g', 'path'])
const PRESERVED_ATTRS = ['viewBox', 'd', 'fill-rule', 'clip-path', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform', 'id']

export function normalizeColorLiteral(value) {
  const raw = String(value ?? '').trim()
  const lower = raw.toLowerCase()
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

export function classifyMushafColor(value, colorMap) {
  const key = normalizeColorLiteral(value)
  const tokenName = colorMap?.[key]
  if (!tokenName || !MUSHAF_COLOR_TOKENS[tokenName]) {
    throw new Error(`Unclassified Mushaf SVG color: ${value}`)
  }
  return MUSHAF_COLOR_TOKENS[tokenName]
}

export function themeMushafSvg(text, { filename = 'unknown.svg', colorMap } = {}) {
  const source = String(text)
  assertThemeableSvgSafety(source, filename)

  return source.replace(/<([A-Za-z_][\w:.-]*)([^<>]*?)(\/?)>/g, (tag, name, rawAttrs, selfClose) => {
    if (tag.startsWith('</')) return tag
    const local = localName(name)
    if (!ALLOWED_ELEMENTS.has(local)) {
      throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
    }

    const attrs = parseAttributes(rawAttrs, filename)
    let fillFromStyle = null
    let strokeFromStyle = null

    for (const attr of attrs) {
      const attrName = attr.name.toLowerCase()
      if (attrName.startsWith('on')) throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
      if ((attrName === 'href' || attrName === 'xlink:href' || attrName === 'src') && isUnsafeReference(attr.value)) {
        throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
      }

      if (attrName === 'fill' || attrName === 'stroke') {
        attr.value = themedPaintValue(attr.value, colorMap)
      } else if (attrName === 'style') {
        const style = rewriteInlineStyle(attr.value, colorMap)
        attr.value = style.value
        fillFromStyle = style.fill ?? fillFromStyle
        strokeFromStyle = style.stroke ?? strokeFromStyle
      }
    }

    if (fillFromStyle) setPresentationAttribute(attrs, 'fill', fillFromStyle)
    if (strokeFromStyle) setPresentationAttribute(attrs, 'stroke', strokeFromStyle)

    const renderedAttrs = attrs
      .filter((attr) => attr.name.toLowerCase() !== 'style' || attr.value.trim() !== '')
      .map((attr) => ` ${attr.name}=${attr.quote}${escapeAttribute(attr.value)}${attr.quote}`)
      .join('')

    return `<${name}${renderedAttrs}${selfClose}>`
  })
}

export function assertThemeableSvgIntegrity(before, after, filename = 'unknown.svg') {
  const source = String(before)
  const themed = String(after)
  assertSame(extractRootViewBox(source), extractRootViewBox(themed), filename, 'viewBox')

  const beforePaths = extractTagAttrs(source, 'path')
  const afterPaths = extractTagAttrs(themed, 'path')
  assertSame(beforePaths.length, afterPaths.length, filename, 'path count')
  for (let i = 0; i < beforePaths.length; i += 1) {
    assertSame(beforePaths[i].d, afterPaths[i].d, filename, `path d at index ${i}`)
  }

  for (const attrName of PRESERVED_ATTRS) {
    assertSame(JSON.stringify(extractAttributeValues(source, attrName)), JSON.stringify(extractAttributeValues(themed, attrName)), filename, attrName)
  }

  const refs = extractSameDocumentReferences(themed)
  if (refs.some((ref) => !/^#[A-Za-z_][\w:.-]*$/.test(ref))) {
    throw new Error(`Mushaf page ${filename} changed same-document references`)
  }
}

function assertThemeableSvgSafety(text, filename) {
  const decoded = decodeHtmlEntities(text)
  const cssNormalized = normalizeCssEscapes(decoded)
  if (/<!DOCTYPE\b/i.test(decoded) || /<!ENTITY\b/i.test(decoded) || /<\?xml-stylesheet\b/i.test(decoded)) {
    throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
  }
  if (!/^(\s|<\?xml[^>]*>)*<\s*(?:[\w.-]+:)?svg\b/i.test(decoded) || !/<\s*\/\s*(?:[\w.-]+:)?svg\s*>/i.test(decoded)) {
    throw new Error(`Mushaf page ${filename} is not an SVG document`)
  }
  for (const tag of decoded.matchAll(/<\s*\/?\s*([A-Za-z_][\w:.-]*)\b/g)) {
    if (!ALLOWED_ELEMENTS.has(localName(tag[1]))) {
      throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
    }
  }
  if (/<\s*\/?\s*(?:[\w.-]+:)?style\b/i.test(decoded)) {
    throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
  }
  if (/\son[a-z]+\s*=/i.test(decoded) || /@import\b/i.test(cssNormalized) || hasUnsafeCssUrlReference(cssNormalized)) {
    throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
  }
  for (const attr of decoded.matchAll(/\s(?:href|xlink:href|src)\s*=\s*(["'])(.*?)\1/gis)) {
    if (isUnsafeReference(attr[2])) throw new Error(`Mushaf page ${filename} contains unsafe SVG content`)
  }
}

function parseAttributes(rawAttrs, filename) {
  const attrs = []
  const consumed = []
  for (const match of rawAttrs.matchAll(/([:\w.-]+)\s*=\s*(["'])(.*?)\2/gs)) {
    attrs.push({ name: match[1], quote: match[2], value: match[3] })
    consumed.push(match[0])
  }
  const withoutQuotedAttrs = consumed.reduce((remaining, attr) => remaining.replace(attr, ''), rawAttrs)
  if (/[^\s/]/.test(withoutQuotedAttrs)) {
    throw new Error(`Mushaf page ${filename} contains unsupported SVG attributes`)
  }
  return attrs
}

function rewriteInlineStyle(value, colorMap) {
  const kept = []
  let fill = null
  let stroke = null

  for (const declaration of String(value).split(';')) {
    const trimmed = declaration.trim()
    if (!trimmed) continue
    const separator = trimmed.indexOf(':')
    if (separator < 0) {
      kept.push(trimmed)
      continue
    }
    const property = trimmed.slice(0, separator).trim().toLowerCase()
    const propertyValue = trimmed.slice(separator + 1).trim()
    if (property === 'fill') {
      fill = themedPaintValue(propertyValue, colorMap)
    } else if (property === 'stroke') {
      stroke = themedPaintValue(propertyValue, colorMap)
    } else {
      kept.push(`${property}: ${propertyValue}`)
    }
  }

  return { value: kept.join('; '), fill, stroke }
}

function themedPaintValue(value, colorMap) {
  const normalized = normalizeColorLiteral(value)
  if (COLORLESS_VALUES.has(normalized) || /^url\(\s*#[A-Za-z_][\w:.-]*\s*\)$/i.test(normalized)) {
    return String(value).trim()
  }
  return classifyMushafColor(value, colorMap)
}

function setPresentationAttribute(attrs, name, value) {
  const existing = attrs.find((attr) => attr.name.toLowerCase() === name)
  if (existing) {
    existing.value = value
  } else {
    attrs.push({ name, quote: '"', value })
  }
}

function extractRootViewBox(text) {
  const root = String(text).match(/<\s*(?:[\w.-]+:)?svg\b([^>]*)>/i)
  if (!root) return null
  return parseAttributes(root[1], 'svg').find((attr) => attr.name === 'viewBox')?.value ?? null
}

function extractTagAttrs(text, tagName) {
  return [...String(text).matchAll(new RegExp(`<\\s*(?:[\\w.-]+:)?${tagName}\\b([^>]*)>`, 'gi'))]
    .map((match) => Object.fromEntries(parseAttributes(match[1], tagName).map((attr) => [attr.name, attr.value])))
}

function extractAttributeValues(text, attrName) {
  const values = []
  for (const tag of String(text).matchAll(/<\s*[A-Za-z_][\w:.-]*\b([^<>]*?)(?:\/?)>/g)) {
    const attrs = parseAttributes(tag[1], attrName)
    const value = attrs.find((attr) => attr.name === attrName)?.value
    if (value !== undefined) values.push(value)
  }
  return values
}

function extractSameDocumentReferences(text) {
  const refs = []
  for (const match of String(text).matchAll(/\burl\s*\(\s*(#[A-Za-z_][\w:.-]*)\s*\)/g)) refs.push(match[1])
  for (const match of String(text).matchAll(/\s(?:href|xlink:href)\s*=\s*(["'])(#.*?)\1/gi)) refs.push(match[2])
  return refs
}

function assertSame(before, after, filename, subject) {
  if (before !== after) {
    throw new Error(`Mushaf page ${filename} changed ${subject}`)
  }
}

function localName(name) {
  return String(name ?? '').split(':').pop().toLowerCase()
}

function hasUnsafeCssUrlReference(value) {
  for (const match of String(value).matchAll(/\burl\s*\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gis)) {
    const raw = (match[2] ?? match[3] ?? '').trim()
    if (!/^#[A-Za-z_][\w:.-]*$/.test(raw)) return true
  }
  return false
}

function decodeHtmlEntities(value) {
  const named = { amp: '&', apos: "'", colon: ':', gt: '>', lt: '<', quot: '"' }
  return String(value)
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => codepointToString(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => codepointToString(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity)
}

function codepointToString(codepoint) {
  if (!Number.isInteger(codepoint) || codepoint < 0 || codepoint > 0x10ffff) return ''
  return String.fromCodePoint(codepoint)
}

function normalizeCssEscapes(value) {
  return String(value)
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => codepointToString(Number.parseInt(hex, 16)))
    .replace(/\\([^0-9a-f])/gi, '$1')
}

function isUnsafeReference(value) {
  const normalized = normalizeCssEscapes(decodeHtmlEntities(value))
    .replace(/[\u0000-\u001f\u007f\s]+/g, '')
    .toLowerCase()
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/.test(normalized)
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}
