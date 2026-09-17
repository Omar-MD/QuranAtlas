import type { ReactNode } from 'react'

export type SettingsRowProps = {
  label: string
  /** 12 px muted line under the label. */
  helper?: string
  /** §3.3: inline rows put the control on the shared right edge; block rows
      stand it under the label, left-aligned. */
  layout?: 'inline' | 'block'
  htmlFor?: string
  children: ReactNode
}

// One row grammar shared by the Aa sheet and Settings (brief §4.13): label
// left, content-sized control right (inline) or label above a left-aligned
// control (block); hairlines between sibling rows.
export function SettingsRow({ children, helper, htmlFor, label, layout = 'inline' }: SettingsRowProps) {
  const labelText = htmlFor ? (
    <label className="qar-react-settings-row-label" htmlFor={htmlFor}>
      {label}
    </label>
  ) : (
    <span className="qar-react-settings-row-label">{label}</span>
  )
  return (
    <div className={`qar-react-settings-row qar-react-settings-row--${layout}`}>
      <span className="qar-react-settings-row-copy">
        {labelText}
        {helper ? <span className="qar-react-settings-row-control">{helper}</span> : null}
      </span>
      {children}
    </div>
  )
}
