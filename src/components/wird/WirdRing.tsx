import type { CSSProperties, ReactNode } from 'react'
import { Check, ListChecks } from 'lucide-react'

// One ring implementation (brief §15.5/§15.11): conic accent fill on a border
// track, masked to the stroke. md = 64 px in the Wird sheet hero; sm = 28 px
// in the desktop reader-header indicator. Children are decorative.
export function WirdRing({
  children,
  label,
  size,
  value,
}: {
  children?: ReactNode
  label: string
  size: 'sm' | 'md'
  value: number
}) {
  const complete = value >= 100
  const defaultChildren =
    size === 'sm' ? (
      complete ? (
        <Check size={15} strokeWidth={1.65} />
      ) : (
        <ListChecks size={15} strokeWidth={1.65} />
      )
    ) : (
      `${value}%`
    )
  return (
    <span
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className={`qar-react-wird-ring qar-react-wird-ring--${size}`}
      role="progressbar"
      style={{ '--qa-react-wird-ring-progress': `${Math.min(100, Math.max(0, value)) * 3.6}deg` } as CSSProperties}
    >
      <span aria-hidden="true" className="qar-react-wird-ring-face">
        {children ?? defaultChildren}
      </span>
    </span>
  )
}
