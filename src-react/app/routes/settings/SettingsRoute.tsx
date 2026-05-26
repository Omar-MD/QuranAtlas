import { SettingsShell } from '../../../components/settings/SettingsShell'
import { MushafSettings } from '../../../components/settings/MushafSettings'
import { SourcePicker } from '../../../components/settings/SourcePicker'
import { VerseSettings } from '../../../components/settings/VerseSettings'

export function SettingsRoute() {
  return (
    <SettingsShell>
      <VerseSettings />
      <MushafSettings />
      <SourcePicker />
    </SettingsShell>
  )
}
