export type NormalizedRect = { x: number; y: number; width: number; height: number }

export type MushafImagePlacement = {
  frame: NormalizedRect
  image: { height: string; left: string; top: string; width: string }
  ratio: number
}

export function clampMushafPageFraming(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

export function interpolateMushafPageFrame(textFrame: NormalizedRect, value: number): NormalizedRect {
  const t = clampMushafPageFraming(value)
  if (!isNormalizedRect(textFrame)) return unitFrame()
  return {
    x: textFrame.x * t,
    y: textFrame.y * t,
    width: 1 + ((textFrame.width - 1) * t),
    height: 1 + ((textFrame.height - 1) * t),
  }
}

export function mushafImagePlacement(
  source: { width: number; height: number } | null | undefined,
  textFrame: NormalizedRect | null | undefined,
  value: number,
): MushafImagePlacement {
  const frame = textFrame && isNormalizedRect(textFrame)
    ? interpolateMushafPageFrame(textFrame, value)
    : unitFrame()
  if (!source || !Number.isFinite(source.width) || !Number.isFinite(source.height) || source.width <= 0 || source.height <= 0) {
    return { frame: unitFrame(), image: { height: '100%', left: '0%', top: '0%', width: '100%' }, ratio: 1 }
  }
  return {
    frame,
    image: {
      height: `${100 / frame.height}%`,
      left: `${-(frame.x / frame.width) * 100}%`,
      top: `${-(frame.y / frame.height) * 100}%`,
      width: `${100 / frame.width}%`,
    },
    ratio: (source.width * frame.width) / (source.height * frame.height),
  }
}

export function isNormalizedRect(value: unknown): value is NormalizedRect {
  if (!value || typeof value !== 'object') return false
  const rect = value as NormalizedRect
  return [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
    && rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0
    && rect.x + rect.width <= 1 && rect.y + rect.height <= 1
}

function unitFrame(): NormalizedRect {
  return { x: 0, y: 0, width: 1, height: 1 }
}
