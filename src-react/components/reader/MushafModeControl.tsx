import { SegmentedControl } from '../ui'

export type MushafViewMode = 'auto' | 'page' | 'width'

export function MushafModeControl({ mode = 'auto', onModeChange }: { mode?: MushafViewMode; onModeChange?: (mode: MushafViewMode) => void }) {
  return (
    <SegmentedControl
      label="Mushaf view mode"
      onValueChange={(value) => onModeChange?.(value as MushafViewMode)}
      options={[{ label: 'Auto', value: 'auto' }, { label: 'Page', value: 'page' }, { label: 'Width', value: 'width' }]}
      value={mode}
    />
  )
}
