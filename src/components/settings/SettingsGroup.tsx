import { type ReactNode, useId } from 'react'

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
    <section aria-labelledby={titleId} className="qar-react-settings-group">
      <header className="qar-react-settings-group-heading">
        <h3 id={titleId}>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="qar-react-settings-group-content">{children}</div>
    </section>
  )
}
