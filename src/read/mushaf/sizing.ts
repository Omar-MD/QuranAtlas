export type RectSize = { width: number; height: number }
export type SvgViewBox = { minX: number; minY: number; width: number; height: number }
export type MushafFit = {
  width: number
  height: number
  scale: number
  x: number
  y: number
}

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
