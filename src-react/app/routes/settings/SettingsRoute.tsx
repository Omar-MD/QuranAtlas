import { SettingsShell } from '../../../components/settings/SettingsShell'
import { MushafSettings } from '../../../components/settings/MushafSettings'
import { VerseSettings } from '../../../components/settings/VerseSettings'

export function SettingsRoute() {
  return (
    <SettingsShell>
      <VerseSettings />
      <MushafSettings />
      <section className="qar:grid qar:gap-2 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Reader assets">
        <h3 className="qar:m-0 qar:text-base">Reader assets</h3>
        <p className="qar:m-0 qar:text-sm qar:text-muted">Qaloon text, Qaloon Mushaf, and Bridges translation are included by default.</p>
      </section>
    </SettingsShell>
  )
}
