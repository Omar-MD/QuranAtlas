import { Badge } from '../../ui'

export function ThemeChips({ themes }: { themes: Array<{ id: string; label: string }> }) {
  return (
    <div className="qar:flex qar:flex-wrap qar:gap-2" aria-label="Knowledge themes">
      {themes.map((theme) => <Badge key={theme.id}>{theme.label}</Badge>)}
    </div>
  )
}
