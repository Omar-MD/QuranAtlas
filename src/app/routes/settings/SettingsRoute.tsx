import { useEffect, useRef, useState } from 'react'

import { matchReactRoute } from '../../router/routes'
import { clearReactSettingsReaderAnchor, restoreReactSettingsReaderAnchor } from '../../settings-overlay-events'
import { SettingsShell } from '../../../components/settings/SettingsShell'
import { IncludedAssetsSection } from '../../../components/settings/IncludedAssetsSection'
import { OfflineDataSection } from '../../../components/settings/OfflineDataSection'
import { MushafSettings } from '../../../components/settings/MushafSettings'
import { SettingsGroup } from '../../../components/settings/SettingsGroup'
import { ThemeControls } from '../../../components/settings/ThemeControls'
import { VerseReadingControls } from '../../../components/settings/VerseReadingControls'
import { useSettingsForm } from '../../../components/settings/useSettingsForm'
import { Button, Select, Status } from '../../../components/ui'
import { subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'
import { readNativeSettings } from '../../../storage/native-reader-store'
import { DEFAULT_READER_ASSET_PROFILE } from '../../../../shared/reader-assets/default-profile'
import type { NormalizedRect } from '../../../components/reader/mushaf-page-framing'
import { loadMushafFramingCapability } from '../../../packs/mushaf-page-asset'

export type SettingsRouteMode = 'verse' | 'mushaf'

// Settings stays minimal: only the controls for the reader the settings panel
// is opened from. No live preview, no About/Downloads link rows, no edition
// switching (editions change from the reader's edition banner) and no notation
// guide (it lives on the About screen). The #/assets route reuses this shell
// as a Downloads-only surface for deep links.
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
  const downloadsOpen = initialAssetsExpanded ?? false
  const downloadsSectionRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!downloadsOpen) return
    const frame = requestAnimationFrame(() => {
      downloadsSectionRef.current?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [downloadsOpen])
  const [includedAssetsVisible, setIncludedAssetsVisible] = useState(
    () => downloadsOpen && shouldShowIncludedAssetsByDefault(),
  )
  const [framingCapability, setFramingCapability] = useState<{
    hasValidFraming: boolean
    representativeTextFrame?: NormalizedRect
  }>({ hasValidFraming: false })
  const framingEditionIdRef = useRef<string | null>(null)
  const framingLoadEpochRef = useRef(0)
  const {
    mushafFramingWriteStatus,
    retryMushafPageFraming,
    retrySettingsWrite,
    settingsWriteError,
    settingsWriteStatus,
    setDimPageImages,
    setFontSize,
    setMushafPageFraming,
    setMushafViewMode,
    setTheme,
    setTranslationFontSize,
    setTranslationVisible,
    setVerseSpacing,
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
      title={downloadsOpen ? 'Downloads' : 'Settings'}
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

      {downloadsOpen ? (
        <div className="qar:scroll-mt-20" data-settings-downloads-section="true" ref={downloadsSectionRef}>
          <OfflineDataSection />
          <IncludedAssetsSection onVisibleChange={setIncludedAssetsVisible} visible={includedAssetsVisible} />
        </div>
      ) : (
        <>
          <SettingsGroup title="Appearance">
            <ThemeControls onThemeChange={setTheme} theme={preferences.theme} />
          </SettingsGroup>

          <SettingsGroup title="Reading">
            {mode === 'verse' ? (
              <>
                <VerseReadingControls
                  fontSize={preferences.fontSize}
                  onFontSizeChange={setFontSize}
                  onTranslationFontSizeChange={setTranslationFontSize}
                  onVerseSpacingChange={setVerseSpacing}
                  onWirdVisibleChange={setWirdReaderStatusVisible}
                  showContinuityToggle
                  translationFontSize={preferences.translationFontSize}
                  verseSpacing={preferences.verseSpacing}
                  wirdVisible={preferences.wirdReaderStatusVisible}
                />
                <div className="qar-react-settings-row">
                  <span className="qar-react-settings-row-label">Translation</span>
                  <TranslationSelector onChange={setTranslationVisible} value={preferences.translationVisible} />
                </div>
              </>
            ) : (
              <MushafSettings
                dimPageImages={preferences.dimPageImages}
                framing={preferences.mushafPageFraming}
                framingWriteStatus={mushafFramingWriteStatus}
                hasValidFraming={framingCapability.hasValidFraming}
                mode={preferences.mushafViewMode}
                onDimPageImagesChange={setDimPageImages}
                onFramingChange={setMushafPageFraming}
                onModeChange={setMushafViewMode}
                onRetryFraming={retryMushafPageFraming}
              />
            )}
          </SettingsGroup>
        </>
      )}

      <span className="qar:sr-only">
        Settings are open. Close this panel to return to {settingsReturnDestination(previousHash)}.
      </span>
    </SettingsShell>
  )
}

function TranslationSelector({ onChange, value }: { onChange: (visible: boolean) => void; value: boolean }) {
  return (
    <Select
      value={value ? 'bridges' : 'off'}
      label="Translation"
      onValueChange={(next) => onChange(next === 'bridges')}
      options={[
        { label: 'Bridges', value: 'bridges' },
        { label: 'Off', value: 'off' },
      ]}
    />
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
