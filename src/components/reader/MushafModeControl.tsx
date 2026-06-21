import { SegmentedControl } from '../ui'

export type MushafViewMode = 'auto' | 'fit-page' | 'fit-width' | 'continuous'
export type MushafNavigationMode = 'fit-page' | 'continuous'

export function MushafModeControl({ mode = 'auto', onModeChange }: { mode?: MushafViewMode; onModeChange?: (mode: MushafNavigationMode) => void }) {
  const navigationMode = mode === 'continuous' ? 'continuous' : 'fit-page'

  return (
    <SegmentedControl
      label="Navigation mode"
      onValueChange={(value) => onModeChange?.(value as MushafNavigationMode)}
      options={[{ label: 'Single', value: 'fit-page' }, { label: 'Scroll', value: 'continuous' }]}
      value={navigationMode}
    />
  )
}
