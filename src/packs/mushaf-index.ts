export type MushafExternalImageDescriptor = {
  assetPath: string
  bytes: number
  sha256: string
  width: number
  height: number
  mimeType: 'image/webp'
}

export type MushafExternalImageSource = MushafExternalImageDescriptor & {
  assetUrl: string
}

export type MushafPageFraming = {
  textFrame: { x: number; y: number; width: number; height: number }
  sideLane: 'left' | 'right' | 'none'
}
