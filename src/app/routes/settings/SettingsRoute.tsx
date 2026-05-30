import { SettingsShell } from '../../../components/settings/SettingsShell'
import { IncludedAssetsSection } from '../../../components/settings/IncludedAssetsSection'
import { MushafSettings } from '../../../components/settings/MushafSettings'
import { VerseSettings } from '../../../components/settings/VerseSettings'
import { useSettingsForm } from '../../../components/settings/useSettingsForm'
import { SegmentedControl } from '../../../components/ui'

export type SettingsRouteMode = 'verse' | 'mushaf'

export function SettingsRoute({
  mode = 'verse',
  onClose = () => undefined,
  onReaderModeChange = () => undefined,
  previousHash = '#/s/1',
}: {
  mode?: SettingsRouteMode
  onClose?: () => void
  onReaderModeChange?: (mode: SettingsRouteMode) => void
  previousHash?: string
}) {
  const {
    setFontSize,
    setMushafViewMode,
    setNightMode,
    setReadingFlow,
    setTheme,
    setTranslationVisible,
    setWirdReaderStatusVisible,
    state,
  } = useSettingsForm()
  const preferences = state.preferences

  return (
    <SettingsShell
      nightMode={preferences.nightMode}
      onClose={onClose}
      onNightModeChange={setNightMode}
      onThemeChange={setTheme}
      subtitle=""
      theme={preferences.theme}
      title="Settings"
    >
      <div className="qar-react-settings-deck">
        <div className="qar-react-settings-ledger">
          <section className="qar-react-settings-mode-card" aria-labelledby="qar-react-settings-reader-mode">
            <div className="qar-react-settings-section-heading">
              <h3 className="qar-react-settings-section-title" id="qar-react-settings-reader-mode">Reader mode</h3>
              <p className="qar-react-settings-section-note">Verse or Mushaf.</p>
            </div>
            <div className="qar-react-settings-row qar-react-settings-row--control qar-react-settings-row--mode-toggle">
              <SegmentedControl
                label="Reader mode"
                onValueChange={(value) => onReaderModeChange(value as SettingsRouteMode)}
                options={[{ label: 'Verse', value: 'verse' }, { label: 'Mushaf', value: 'mushaf' }]}
                value={mode}
              />
            </div>
          </section>
          <div className="qar-react-settings-mode-panels" data-active-mode={mode}>
            {mode === 'verse' ? (
              <VerseSettings
                fontSize={preferences.fontSize}
                onFontSizeChange={setFontSize}
                onReadingFlowChange={setReadingFlow}
                onTranslationVisibleChange={setTranslationVisible}
                onWirdReaderStatusVisibleChange={setWirdReaderStatusVisible}
                readingFlow={preferences.readerMargin}
                translationVisible={preferences.translationVisible}
                wirdReaderStatusVisible={preferences.wirdReaderStatusVisible}
              />
            ) : (
              <MushafSettings mode={preferences.mushafViewMode} onModeChange={setMushafViewMode} />
            )}
          </div>
        </div>
        <IncludedAssetsSection />
      </div>
      <span className="qar:sr-only">Restores {previousHash} on close.</span>
    </SettingsShell>
  )
}
