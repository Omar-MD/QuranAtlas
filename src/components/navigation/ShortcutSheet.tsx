import { Button, Sheet } from '../ui'

export function ShortcutSheet() {
  return (
    <Sheet title="Shortcuts" trigger={<Button size="sm" variant="ghost">Open shortcuts</Button>}>
      <dl className="qar:grid qar:gap-2 qar:text-sm">
        <div className="qar:flex qar:justify-between qar:gap-3"><dt>G then S</dt><dd>Surahs</dd></div>
        <div className="qar:flex qar:justify-between qar:gap-3"><dt>T</dt><dd>Translation</dd></div>
      </dl>
    </Sheet>
  )
}
