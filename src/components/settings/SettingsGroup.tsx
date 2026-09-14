import { type ReactNode, useId } from 'react'

// S8: sections use quiet eyebrow headings + hairlines — never nested bordered
// cards (brief §2.2).
export function SettingsGroup({
  children,
  description,
  title,
}: {
  children: ReactNode
  description?: string
  title: string
}) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="qar-react-settings-section">
      <h2 className="qar-eyebrow" id={titleId}>
        {title}
      </h2>
      {description ? <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">{description}</p> : null}
      {children}
    </section>
  )
}
