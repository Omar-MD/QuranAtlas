import { JSDOM } from 'jsdom'

const QURAN_WS_SOURCE = { x: 0, y: 0, width: 900, height: 1379.25 }
const QURAN_WS_FALLBACK = { x: 60, y: 60, width: 790, height: 1270 }

export function deriveMushafDisplayViewBox(svgText, filename) {
  const document = new JSDOM(String(svgText), { contentType: 'image/svg+xml' }).window.document
  const root = document.documentElement
  if (root.localName !== 'svg') throw new Error(`Mushaf page ${filename} is not an SVG document`)
  const source = parseViewBox(root.getAttribute('viewBox'), filename)
  const display = isQuranWsSource(source)
    ? displayInkBounds(root, source) ?? QURAN_WS_FALLBACK
    : source
  assertContainedViewBox(display, source, filename)
  return serializeViewBox(display)
}

export function assertContainedViewBox(display, source, filename) {
  const displayRight = display.x + display.width
  const displayBottom = display.y + display.height
  const sourceRight = source.x + source.width
  const sourceBottom = source.y + source.height
  if (
    !Number.isFinite(display.x)
    || !Number.isFinite(display.y)
    || !Number.isFinite(display.width)
    || !Number.isFinite(display.height)
    || display.width <= 0
    || display.height <= 0
    || display.x < source.x
    || display.y < source.y
    || displayRight > sourceRight
    || displayBottom > sourceBottom
  ) {
    throw new Error(`Mushaf page ${filename} display viewBox is outside its source viewBox`)
  }
}

function parseViewBox(text, filename) {
  const parts = String(text ?? '').trim().split(/\s+/).map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part)) || parts[2] <= 0 || parts[3] <= 0) {
    throw new Error(`Mushaf page ${filename} has an invalid viewBox: ${text}`)
  }
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
}

function isQuranWsSource(viewBox) {
  return Math.abs(viewBox.x - QURAN_WS_SOURCE.x) < 0.001
    && Math.abs(viewBox.y - QURAN_WS_SOURCE.y) < 0.001
    && Math.abs(viewBox.width - QURAN_WS_SOURCE.width) < 0.001
    && Math.abs(viewBox.height - QURAN_WS_SOURCE.height) < 0.001
}

function displayInkBounds(root, source) {
  const boxes = Array.from(root.querySelectorAll('path'))
    .filter((element) => !element.closest('defs'))
    .filter((element) => {
      const fill = element.getAttribute('fill')
      const stroke = element.getAttribute('stroke')
      return fill === 'var(--qa-mushaf-ink)'
        || fill === 'var(--qa-mushaf-accent)'
        || stroke === 'var(--qa-mushaf-ink)'
        || stroke === 'var(--qa-mushaf-accent)'
    })
    .map((element) => clippedPathBounds(root, element) ?? pathDataBounds(element.getAttribute('d') ?? ''))
    .filter(Boolean)

  if (boxes.length === 0) return null
  const left = Math.min(...boxes.map((box) => box.x))
  const top = Math.min(...boxes.map((box) => box.y))
  const right = Math.max(...boxes.map((box) => box.x + box.width))
  const bottom = Math.max(...boxes.map((box) => box.y + box.height))
  const margin = 24
  const x = Math.max(source.x, left - margin)
  const y = Math.max(source.y, top - margin)
  const width = Math.min(source.x + source.width, right + margin) - x
  const height = Math.min(source.y + source.height, bottom + margin) - y
  if (width <= 0 || height <= 0) return null
  return {
    x: roundViewBoxNumber(x),
    y: roundViewBoxNumber(y),
    width: roundViewBoxNumber(width),
    height: roundViewBoxNumber(height),
  }
}

function clippedPathBounds(root, element) {
  const clipId = nearestClipPathId(element)
  if (!clipId) return null
  const clipPath = root.querySelector(`defs clipPath#${cssEscape(clipId)}`)
  if (!clipPath) return null
  const boxes = Array.from(clipPath.querySelectorAll('path'))
    .map((path) => pathDataBounds(path.getAttribute('d') ?? ''))
    .filter(Boolean)
  if (boxes.length === 0) return null
  const left = Math.min(...boxes.map((box) => box.x))
  const top = Math.min(...boxes.map((box) => box.y))
  const right = Math.max(...boxes.map((box) => box.x + box.width))
  const bottom = Math.max(...boxes.map((box) => box.y + box.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function nearestClipPathId(element) {
  let current = element
  while (current) {
    const clip = current.getAttribute('clip-path')
    const match = clip?.match(/^url\(#([A-Za-z][\w.-]*)\)$/)
    if (match) return match[1]
    current = current.parentElement
  }
  return null
}

function cssEscape(value) {
  return value.replace(/["\\#.;:[\]>+~*^$|=,\s]/g, '\\$&')
}

function pathDataBounds(d) {
  const values = Array.from(d.matchAll(/-?\d+(?:\.\d+)?/g), (match) => Number(match[0]))
  if (values.length < 2) return null
  const xs = []
  const ys = []
  for (let index = 0; index + 1 < values.length; index += 2) {
    xs.push(values[index])
    ys.push(values[index + 1])
  }
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  const right = Math.max(...xs)
  const bottom = Math.max(...ys)
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(right) || !Number.isFinite(bottom)) return null
  if (right <= x || bottom <= y) return null
  return { x, y, width: right - x, height: bottom - y }
}

function serializeViewBox(viewBox) {
  return `${formatViewBoxNumber(viewBox.x)} ${formatViewBoxNumber(viewBox.y)} ${formatViewBoxNumber(viewBox.width)} ${formatViewBoxNumber(viewBox.height)}`
}

function formatViewBoxNumber(value) {
  return roundViewBoxNumber(value).toString()
}

function roundViewBoxNumber(value) {
  return Number(value.toFixed(3))
}
