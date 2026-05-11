export type RectSize = { width: number; height: number }
export type SvgViewBox = { minX: number; minY: number; width: number; height: number }
export type MushafViewMode = 'auto' | 'fit-page' | 'fit-width'
export type ResolvedMushafLayoutMode = Exclude<MushafViewMode, 'auto'>
export type MushafFit = {
  width: number
  height: number
  scale: number
  x: number
  y: number
}

const QURAN_WS_PAGE_WIDTH = 900
const QURAN_WS_PAGE_HEIGHT = 1379.25
const QURAN_WS_DISPLAY_CROP = {
  minX: 60,
  minY: 60,
  width: 790,
  height: 1270,
} satisfies SvgViewBox

export function parseViewBox(value: string): SvgViewBox {
  const parts = value.trim().split(/\s+/).map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error(`Invalid SVG viewBox: ${value}`)
  }

  const [minX, minY, width, height] = parts as [number, number, number, number]
  if (width <= 0 || height <= 0) throw new Error(`Invalid SVG viewBox dimensions: ${value}`)

  return { minX, minY, width, height }
}

export function fitViewBoxIntoRect(viewBox: SvgViewBox, available: RectSize): MushafFit {
  if (
    !Number.isFinite(available.width)
    || !Number.isFinite(available.height)
    || available.width <= 0
    || available.height <= 0
  ) {
    return { width: 0, height: 0, scale: 0, x: 0, y: 0 }
  }

  const scale = Math.min(available.width / viewBox.width, available.height / viewBox.height)
  const width = viewBox.width * scale
  const height = viewBox.height * scale

  return {
    width,
    height,
    scale,
    x: (available.width - width) / 2,
    y: (available.height - height) / 2,
  }
}

export function fitViewBoxToWidth(viewBox: SvgViewBox, width: number): MushafFit {
  if (!Number.isFinite(width) || width <= 0) {
    return { width: 0, height: 0, scale: 0, x: 0, y: 0 }
  }

  const scale = width / viewBox.width
  return {
    width,
    height: viewBox.height * scale,
    scale,
    x: 0,
    y: 0,
  }
}

export function resolveMushafLayoutMode(
  mode: MushafViewMode,
  viewport: RectSize,
): ResolvedMushafLayoutMode {
  if (mode === 'fit-page' || mode === 'fit-width') return mode

  if (viewport.width < 768) return 'fit-width'
  if (viewport.width < 1180 && viewport.height >= viewport.width) return 'fit-width'
  return 'fit-page'
}

export function displayViewBoxForMushafPage(viewBox: SvgViewBox): SvgViewBox {
  const isQuranWsPage = Math.abs(viewBox.minX) < 0.001
    && Math.abs(viewBox.minY) < 0.001
    && Math.abs(viewBox.width - QURAN_WS_PAGE_WIDTH) < 0.001
    && Math.abs(viewBox.height - QURAN_WS_PAGE_HEIGHT) < 0.001

  return isQuranWsPage ? { ...QURAN_WS_DISPLAY_CROP } : viewBox
}

export function viewBoxText(viewBox: SvgViewBox): string {
  return `${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`
}

export type ChipPlacement = 'bottom-center' | 'below-page' | 'inside-safe-bottom'

export function choosePageChipPlacement(input: {
  available: RectSize
  pageFit: MushafFit
  chip: RectSize
  margin: number
}): ChipPlacement {
  const bottomSlotTop = input.available.height - input.margin - input.chip.height
  const pageBottom = input.pageFit.y + input.pageFit.height
  if (pageBottom + input.margin <= bottomSlotTop) return 'bottom-center'
  if (input.available.height - pageBottom >= input.chip.height + input.margin) return 'below-page'
  return 'inside-safe-bottom'
}
