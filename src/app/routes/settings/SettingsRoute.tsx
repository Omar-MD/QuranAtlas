import { useEffect, useState } from 'react'

import { clearReactSettingsReaderAnchor, restoreReactSettingsReaderAnchor } from '../../settings-overlay-events'
import { SettingsShell } from '../../../components/settings/SettingsShell'
import { IncludedAssetsSection } from '../../../components/settings/IncludedAssetsSection'
import { MushafSettings } from '../../../components/settings/MushafSettings'
import { SettingsGroup } from '../../../components/settings/SettingsGroup'
import { ThemeNightControls } from '../../../components/settings/ThemeNightControls'
import { VerseSettings } from '../../../components/settings/VerseSettings'
import { useSettingsForm } from '../../../components/settings/useSettingsForm'
import { Switch } from '../../../components/ui'
import { subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'
import { readNativeSettings } from '../../../storage/native-reader-store'
import { loadMushafFramingCapability } from '../../../packs/mushaf-page-asset'
import type { NormalizedRect } from '../../../components/reader/mushaf-page-framing'

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
  const [framingCapability, setFramingCapability] = useState<{ hasValidFraming: boolean; representativeTextFrame?: NormalizedRect }>({ hasValidFraming: false })
  const {
    mushafFramingWriteStatus,
    retryMushafPageFraming,
    setFontSize,
    setMushafFitWidth,
    setMushafPageFraming,
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
    let active = true
    void readNativeSettings(['riwayah', 'mushafEditionId'])
      .then(([riwayah, mushafEditionId]) => loadMushafFramingCapability({
        mushafEditionId: typeof mushafEditionId?.value === 'string' ? mushafEditionId.value : 'qalun-quran-ws-v1',
        riwayah: riwayah?.value === 'qaloon' ? 'qaloon' : 'qaloon',
      }))
      .then((value) => { if (active) setFramingCapability(value) })
      .catch(() => { if (active) setFramingCapability({ hasValidFraming: false }) })
    return () => { active = false }
  }, [])

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
      onClose={onClose}
      returnFocusId={returnFocusId}
      subtitle=""
      title={mode === 'verse' ? 'Verse settings' : 'Mushaf settings'}
    >
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
          framing={preferences.mushafPageFraming}
          framingWriteStatus={mushafFramingWriteStatus}
          hasValidFraming={framingCapability.hasValidFraming}
          mode={preferences.mushafViewMode}
          onFitWidthChange={setMushafFitWidth}
          onFramingChange={setMushafPageFraming}
          onModeChange={setMushafViewMode}
          onRetryFraming={retryMushafPageFraming}
          representativeTextFrame={framingCapability.representativeTextFrame}
        />
      )}
      <WirdSettingsSection
        enabled={preferences.wirdReaderStatusVisible}
        onEnabledChange={setWirdReaderStatusVisible}
      />
      <SettingsGroup title="Appearance">
        <ThemeNightControls
          nightMode={preferences.nightMode}
          onNightModeChange={setNightMode}
          onThemeChange={setTheme}
          theme={preferences.theme}
        />
      </SettingsGroup>
      <IncludedAssetsSection onVisibleChange={setIncludedAssetsVisible} visible={includedAssetsVisible} />
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
    <SettingsGroup title="Reading continuity">
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
    </SettingsGroup>
  )
}
