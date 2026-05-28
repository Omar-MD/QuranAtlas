import { MushafModeControl } from '../reader/MushafModeControl'

export function MushafSettings() {
  return (
    <section className="qar:grid qar:gap-3 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Mushaf settings">
      <h3 className="qar:m-0 qar:text-base">Mushaf reader</h3>
      <MushafModeControl />
    </section>
  )
}
