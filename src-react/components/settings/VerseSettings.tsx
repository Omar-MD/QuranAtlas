import { Slider, Switch } from '../ui'

export function VerseSettings() {
  return (
    <section className="qar:grid qar:gap-3 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Verse settings">
      <h3 className="qar:m-0 qar:text-base">Verse reader</h3>
      <Switch label="Show translation" defaultChecked />
      <Slider label="Font size" defaultValue={[3]} max={5} min={1} step={1} />
      <Slider label="Reading flow" defaultValue={[3]} max={5} min={1} step={1} />
    </section>
  )
}
