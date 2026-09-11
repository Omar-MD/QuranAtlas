import { useEffect, useRef, useState } from 'react'

import { matchReactRoute } from '../../router/routes'
import { clearReactSettingsReaderAnchor, restoreReactSettingsReaderAnchor } from '../../settings-overlay-events'
import { SettingsShell } from '../../../components/settings/SettingsShell'
import { IncludedAssetsSection } from '../../../components/settings/IncludedAssetsSection'
import { OfflineDataSection } from '../../../components/settings/OfflineDataSection'
import { MushafEditionSection } from '../../../components/settings/MushafEditionSection'
import { MushafSettings } from '../../../components/settings/MushafSettings'
import { SettingsGroup } from '../../../components/settings/SettingsGroup'
import { ThemeNightControls } from '../../../components/settings/ThemeNightControls'
import { VerseSettings } from '../../../components/settings/VerseSettings'
import { useSettingsForm } from '../../../components/settings/useSettingsForm'
import { Button, Status, Switch } from '../../../components/ui'
import { subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'
import { readNativeSettings } from '../../../storage/native-reader-store'
import { DEFAULT_READER_ASSET_PROFILE } from '../../../../shared/reader-assets/default-profile'
import type { NormalizedRect } from '../../../components/reader/mushaf-page-framing'
import { loadMushafFramingCapability } from '../../../packs/mushaf-page-asset'

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
  const [framingCapability, setFramingCapability] = useState<{
    hasValidFraming: boolean
    representativeTextFrame?: NormalizedRect
  }>({ hasValidFraming: false })
  // §3 wiring: the framing effect tracks the edition id it resolved and
  // re-runs only when the native edition id actually changes.
  const framingEditionIdRef = useRef<string | null>(null)
  const framingLoadEpochRef = useRef(0)
  const {
    mushafFramingWriteStatus,
    retryMushafPageFraming,
    retrySettingsWrite,
    settingsWriteError,
    settingsWriteStatus,
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
    const loadFramingCapability = () => {
      const epoch = framingLoadEpochRef.current + 1
      framingLoadEpochRef.current = epoch
      void readNativeSettings(['riwayah', 'mushafEditionId'])
        .then(([riwayah, mushafEditionId]) => {
          const editionId =
            typeof mushafEditionId?.value === 'string'
              ? mushafEditionId.value
              : DEFAULT_READER_ASSET_PROFILE.mushafEditionId
          return loadMushafFramingCapability({
            mushafEditionId: editionId,
            riwayah: riwayah?.value === 'qaloon' ? 'qaloon' : DEFAULT_READER_ASSET_PROFILE.riwayah,
          }).then((capability) => ({ capability, editionId }))
        })
        .then(({ capability, editionId }) => {
          if (!active || framingLoadEpochRef.current !== epoch) return
          framingEditionIdRef.current = editionId
          setFramingCapability(capability)
        })
        .catch(() => {
          // Preserve-on-failure: a refresh keeps the current capability and
          // the mount default is already the no-framing capability.
        })
    }
    loadFramingCapability()
    const unsubscribe = subscribeReactReaderPreferencesChanged(() => {
      // The shared event carries no edition id — read the native one and
      // re-run the capability load only on an actual edition change.
      void readNativeSettings(['mushafEditionId'])
        .then(([mushafEditionId]) => {
          const editionId =
            typeof mushafEditionId?.value === 'string'
              ? mushafEditionId.value
              : DEFAULT_READER_ASSET_PROFILE.mushafEditionId
          if (editionId === framingEditionIdRef.current) return
          loadFramingCapability()
        })
        .catch(() => undefined)
    })
    return () => {
      active = false
      unsubscribe()
    }
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
      {!settingsWriteError && settingsWriteStatus === 'saving' ? (
        <Status description="Your change is being saved on this device." title="Saving settings…" tone="info" />
      ) : null}
      {settingsWriteError ? (
        <Status
          action={
            <Button
              disabled={settingsWriteStatus === 'saving'}
              onClick={retrySettingsWrite}
              size="sm"
              variant="secondary"
            >
              {settingsWriteStatus === 'saving' ? 'Saving...' : 'Retry'}
            </Button>
          }
          title={settingsWriteError}
          tone="error"
        />
      ) : null}
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
      <WirdSettingsSection enabled={preferences.wirdReaderStatusVisible} onEnabledChange={setWirdReaderStatusVisible} />
      <SettingsGroup title="Appearance">
        <ThemeNightControls
          nightMode={preferences.nightMode}
          onNightModeChange={setNightMode}
          onThemeChange={setTheme}
          theme={preferences.theme}
        />
      </SettingsGroup>
      <MushafEditionSection />
      <OfflineDataSection />
      <IncludedAssetsSection onVisibleChange={setIncludedAssetsVisible} visible={includedAssetsVisible} />
      <span className="qar:sr-only">
        Settings are open. Close this panel to return to {settingsReturnDestination(previousHash)}.
      </span>
    </SettingsShell>
  )
}

function shouldShowIncludedAssetsByDefault(): boolean {
  return !window.matchMedia?.('(max-width: 767px)').matches
}

function settingsReturnDestination(hash: string): string {
  const route = matchReactRoute(hash)
  switch (route.type) {
    case 'reader':
      return 'the reader'
    case 'mushaf':
      return `Mushaf page ${route.page}`
    case 'surahs':
      return 'the Surah list'
    case 'bookmarks':
      return 'your bookmarks'
    case 'search':
      return 'search'
    case 'about':
      return 'About'
    default:
      return 'the previous screen'
  }
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
          <Switch checked={enabled} label="Enable Daily Wird" onCheckedChange={onEnabledChange} />
        </div>
      </div>
    </SettingsGroup>
  )
}
