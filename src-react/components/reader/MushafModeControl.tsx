import { SegmentedControl } from '../ui'

export type MushafViewMode = 'auto' | 'fit-page' | 'fit-width'

export function MushafModeControl({ mode = 'auto', onModeChange }: { mode?: MushafViewMode; onModeChange?: (mode: MushafViewMode) => void }) {
  const selectedMode = mode === 'fit-width' ? 'fit-width' : 'fit-page'

  return (
    <SegmentedControl
      label="Mushaf view mode"
      onValueChange={(value) => onModeChange?.(value as MushafViewMode)}
      options={[{ label: 'Page', value: 'fit-page' }, { label: 'Width', value: 'fit-width' }]}
      value={selectedMode}
    />
  )
}
