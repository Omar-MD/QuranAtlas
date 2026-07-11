import { useEffect, useState } from 'react'

import { clearReactSettingsReaderAnchor, restoreReactSettingsReaderAnchor } from '../../settings-overlay-events'
import { SettingsShell } from '../../../components/settings/SettingsShell'
import { IncludedAssetsSection } from '../../../components/settings/IncludedAssetsSection'
import { MushafSettings } from '../../../components/settings/MushafSettings'
import { VerseSettings } from '../../../components/settings/VerseSettings'
import { useSettingsForm } from '../../../components/settings/useSettingsForm'
import { Switch } from '../../../components/ui'
import { subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'

export type SettingsRouteMode = 'verse' | 'mushaf'

export function SettingsRoute({
  initialAssetsExpanded,
  mode = 'verse',
  onClose = () => undefined,
  previousHash = '#/s/1',
  returnFocusId,
}: {
  initialAssetsExpanded?: boolean
  mode?: SettingsRouteMode
  onClose?: () => void
  previousHash?: string
  returnFocusId?: string
}) {
  const [includedAssetsVisible, setIncludedAssetsVisible] = useState(
    () => initialAssetsExpanded ?? shouldShowIncludedAssetsByDefault(),
  )
  const {
    setFontSize,
    setMushafFitWidth,
    setMushafViewMode,
    setNightMode,
    setReadingFlow,
    setTheme,
    setTranslationVisible,
    setWirdReaderStatusVisible,
    state,
  } = useSettingsForm()
  const preferences = state.preferences

  useEffect(() => {
    scheduleReaderAnchorRestore()
    const unsubscribe = subscribeReactReaderPreferencesChanged(() => {
      scheduleReaderAnchorRestore()
    })
    return () => {
      unsubscribe()
      clearReactSettingsReaderAnchor()
    }
  }, [])

  return (
    <SettingsShell
      nightMode={preferences.nightMode}
      onClose={onClose}
      onNightModeChange={setNightMode}
      onThemeChange={setTheme}
      returnFocusId={returnFocusId}
      subtitle=""
      theme={preferences.theme}
      title={mode === 'verse' ? 'Verse settings' : 'Mushaf settings'}
    >
      <div className="qar-react-settings-deck">
        <div className="qar-react-settings-ledger">
          <div className="qar-react-settings-mode-panels" data-active-mode={mode}>
            {mode === 'verse' ? (
              <VerseSettings
                fontSize={preferences.fontSize}
                onFontSizeChange={setFontSize}
                onReadingFlowChange={setReadingFlow}
                onTranslationVisibleChange={setTranslationVisible}
                readingFlow={preferences.readerMargin}
                translationVisible={preferences.translationVisible}
              />
            ) : (
              <MushafSettings
                fitWidth={preferences.mushafFitWidth}
                mode={preferences.mushafViewMode}
                onFitWidthChange={setMushafFitWidth}
                onModeChange={setMushafViewMode}
              />
            )}
          </div>
          <WirdSettingsSection
            enabled={preferences.wirdReaderStatusVisible}
            onEnabledChange={setWirdReaderStatusVisible}
          />
        </div>
        <IncludedAssetsSection onVisibleChange={setIncludedAssetsVisible} visible={includedAssetsVisible} />
      </div>
      <span className="qar:sr-only">Restores {previousHash} on close.</span>
    </SettingsShell>
  )
}

function shouldShowIncludedAssetsByDefault(): boolean {
  return window.matchMedia?.('(max-width: 767px)').matches ? false : true
}

function scheduleReaderAnchorRestore(): void {
  window.requestAnimationFrame(() => {
    restoreReactSettingsReaderAnchor()
    window.requestAnimationFrame(restoreReactSettingsReaderAnchor)
  })
  window.setTimeout(restoreReactSettingsReaderAnchor, 90)
}

function WirdSettingsSection({
  enabled,
  onEnabledChange,
}: {
  enabled: boolean
  onEnabledChange: (value: boolean) => void
}) {
  return (
    <section className="qar-react-settings-panel qar-react-settings-panel--wird" aria-label="Daily Wird settings" aria-labelledby="qar-react-settings-wird">
      <div className="qar-react-settings-panel-head">
        <h3 className="qar-react-settings-section-title" id="qar-react-settings-wird">Daily Wird</h3>
        <span className="qar-react-settings-row-control">Reader continuity</span>
      </div>
      <div className="qar-react-settings-panel-controls">
        <div className="qar-react-settings-row qar-react-settings-row--switch">
          <span className="qar-react-settings-row-copy">
            <span className="qar-react-settings-row-label">Daily Wird</span>
            <span className="qar-react-settings-row-control">Show progress in reader and navigation</span>
          </span>
          <Switch
            checked={enabled}
            className="qar-react-settings-switch"
            label="Enable Daily Wird"
            onCheckedChange={onEnabledChange}
          />
        </div>
      </div>
    </section>
  )
}
