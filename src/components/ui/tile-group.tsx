import { useId, type ReactNode } from 'react'

import { cn } from '../../design-system/utils/cn'

export type TileOption = { value: string; label: string; visual: ReactNode; disabled?: boolean }

export type TileGroupProps = {
  label: string
  options: TileOption[]
  value: string
  onValueChange: (value: string) => void
}

// Visual-choice radiogroup (brief §4.2): small picture + label tiles with the
// app's selection pair (accent border + label weight). Used for Theme and
// Verse spacing — never for text-only mode switches (those are
// SegmentedControl's ink pill).
export function TileGroup({ label, options, value, onValueChange }: TileGroupProps) {
  const groupName = useId()
  return (
    <fieldset
      aria-label={label}
      className="qar-react-tile-group"
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the design brief requires an explicit radiogroup role even though the fieldset with radio inputs already implies it
      role="radiogroup"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <label className={cn('qar-react-tile')} data-selected={selected || undefined} key={option.value}>
            <input
              aria-label={`${label}: ${option.label}`}
              checked={selected}
              className="qar:absolute qar:inset-0 qar:z-1 qar:m-0 qar:cursor-pointer qar:opacity-0"
              disabled={option.disabled}
              name={groupName}
              onChange={() => onValueChange(option.value)}
              type="radio"
              value={option.value}
            />
            <span className="qar-react-tile-visual">{option.visual}</span>
            <span aria-hidden="true" className="qar-react-tile-label">
              {option.label}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
