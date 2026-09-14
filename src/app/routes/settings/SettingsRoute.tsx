import { useEffect, useRef, useState } from 'react'

import { matchReactRoute } from '../../router/routes'
import { clearReactSettingsReaderAnchor, restoreReactSettingsReaderAnchor } from '../../settings-overlay-events'
import { SettingsShell } from '../../../components/settings/SettingsShell'
import { IncludedAssetsSection } from '../../../components/settings/IncludedAssetsSection'
import { OfflineDataSection } from '../../../components/settings/OfflineDataSection'
import { MushafEditionSection } from '../../../components/settings/MushafEditionSection'
import { MushafSettings } from '../../../components/settings/MushafSettings'
import { SettingsGroup } from '../../../components/settings/SettingsGroup'
import { ThemeControls } from '../../../components/settings/ThemeControls'
import { VerseReadingControls } from '../../../components/settings/VerseReadingControls'
import { useSettingsForm } from '../../../components/settings/useSettingsForm'
import { Button, ChoiceButton, Status } from '../../../components/ui'
import { subscribeReactReaderPreferencesChanged } from '../../../storage/reader-preferences'
import { readNativeSettings } from '../../../storage/native-reader-store'
import { DEFAULT_READER_ASSET_PROFILE } from '../../../../shared/reader-assets/default-profile'
import type { NormalizedRect } from '../../../components/reader/mushaf-page-framing'
import {
  describeMushafPage,
  loadMushafPageProfileContext,
  pageForVerseInMushafManifest,
  type MushafResolvedPage,
  loadMushafFramingCapability,
} from '../../../packs/mushaf-page-asset'
import { loadReaderSurah, type ReaderVerse } from '../../../data/reader-corpus'
import { readActiveReaderProfile } from '../../../storage/reader-settings'
import { mushafImagePlacement } from '../../../components/reader/mushaf-page-framing'
import { Select } from '../../../components/ui'
import { REACT_ROUTES } from '../../router/routes'

export type SettingsRouteMode = 'verse' | 'mushaf'

// S8 settings: desktop 640 px dialog-style shell, mobile full-height sheet;
// fixed section order — Reading (view-specific, with live preview) /
// Translation / Appearance / Mushaf edition / Downloads / About. Sections use
// quiet eyebrow headings + hairlines, one label per control.
export function SettingsRoute({
  initialAssetsExpanded,
  mode = 'verse',
  onClose = () => undefined,
  pageImageUrl = null,
  previousHash = '#/s/1',
  returnFocusId,
}: {
  initialAssetsExpanded?: boolean
  mode?: SettingsRouteMode
  onClose?: () => void
  pageImageUrl?: string | null
  previousHash?: string
  returnFocusId?: string
}) {
  // S9 downloads surface: opened via the #/assets route (or the Downloads
  // link row) it renders the download rows inside the same shell.
  const [previewVerses, setPreviewVerses] = useState<ReaderVerse[]>([])
  const [previewPage, setPreviewPage] = useState<MushafResolvedPage | null>(null)
  const downloadsOpen = initialAssetsExpanded ?? false
  const downloadsSectionRef = useRef<HTMLDivElement | null>(null)
  // Arriving from the drawer Downloads row (or #/assets) should land on the
  // download rows, not the top of the settings shell.
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
    let epoch = 0
    const refresh = async () => {
      const request = ++epoch
      const profile = await readActiveReaderProfile()
      const route = matchReactRoute(previousHash)
      const [saved] = await readNativeSettings(['currentPosition'])
      const position = saved?.value as { surah?: number; verse?: number } | undefined
      const surah = route.type === 'reader' ? route.surah : (position?.surah ?? 1)
      const verse =
        route.type === 'reader'
          ? (route.ayah ?? (position?.surah === surah ? position.verse : 1) ?? 1)
          : (position?.verse ?? 1)
      if (mode === 'verse') {
        const corpus = await loadReaderSurah(surah, profile)
        if (active && request === epoch && corpus.status === 'ready') {
          const index = Math.max(
            0,
            corpus.verses.findIndex((item) => item.verse === verse),
          )
          setPreviewVerses(corpus.verses.slice(index, index + 2))
        }
      }
      if (mode === 'mushaf') {
        const context = await loadMushafPageProfileContext(profile)
        const page =
          route.type === 'mushaf' ? route.page : (pageForVerseInMushafManifest(context.manifest, { surah, verse }) ?? 1)
        const descriptor = describeMushafPage(context, page)
        if (active && request === epoch) setPreviewPage(descriptor.resolved)
      }
    }
    void refresh().catch(() => undefined)
    const unsubscribe = subscribeReactReaderPreferencesChanged(() => {
      void refresh().catch(() => undefined)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [mode, previousHash])

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

  function navigateFromSettings(hash: string) {
    onClose()
    window.location.hash = hash
  }

  return (
    <SettingsShell onClose={onClose} returnFocusId={returnFocusId} subtitle="" title="Settings">
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

      <SettingsGroup description="Applies to the view you are reading in." title="Reading">
        {mode === 'verse' ? (
          <VerseSettingsPreview verses={previewVerses} translationVisible={preferences.translationVisible}>
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
          </VerseSettingsPreview>
        ) : (
          <MushafSettingsPreview page={previewPage} framing={preferences.mushafPageFraming}>
            <MushafSettings
              framing={preferences.mushafPageFraming}
              framingWriteStatus={mushafFramingWriteStatus}
              hasValidFraming={framingCapability.hasValidFraming}
              mode={preferences.mushafViewMode}
              onFramingChange={setMushafPageFraming}
              onModeChange={setMushafViewMode}
              onRetryFraming={retryMushafPageFraming}
              pageImageUrl={previewPage?.assetUrl ?? pageImageUrl}
              page={previewPage}
            />
          </MushafSettingsPreview>
        )}
      </SettingsGroup>

      <SettingsGroup title="Translation">
        <div className="qar-react-settings-row">
          <span className="qar-react-settings-row-copy">
            <span className="qar-react-settings-row-label">Translation</span>
            <span className="qar-react-settings-row-control">Shown below each verse</span>
          </span>
          <TranslationSelector
            onChange={(visible) => setTranslationVisible(visible)}
            value={preferences.translationVisible}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Appearance">
        <ThemeControls
          dimPageImages={preferences.dimPageImages}
          onDimPageImagesChange={setDimPageImages}
          onThemeChange={setTheme}
          theme={preferences.theme}
        />
      </SettingsGroup>

      <MushafEditionSection />

      {downloadsOpen ? (
        <div className="qar:scroll-mt-20" data-settings-downloads-section="true" ref={downloadsSectionRef}>
          <OfflineDataSection />
          <IncludedAssetsSection onVisibleChange={setIncludedAssetsVisible} visible={includedAssetsVisible} />
        </div>
      ) : (
        <>
          <SettingsGroup title="Downloads">
            <DownloadsLinkRow onOpen={() => navigateFromSettings(REACT_ROUTES.assets)} />
          </SettingsGroup>
          <SettingsGroup title="About">
            <ChoiceButton
              className="qar-react-settings-linkrow"
              data-settings-about="true"
              onClick={() => navigateFromSettings(REACT_ROUTES.about)}
            >
              <span className="qar-react-settings-row-copy">
                <span className="qar-react-settings-row-label">About</span>
                <span className="qar-react-settings-row-control">Sources, numbering, and app updates</span>
              </span>
              <span aria-hidden="true" className="qar-react-list-row-chevron">
                ›
              </span>
            </ChoiceButton>
          </SettingsGroup>
        </>
      )}

      <span className="qar:sr-only">
        Settings are open. Close this panel to return to {settingsReturnDestination(previousHash)}.
      </span>
    </SettingsShell>
  )
}

// Live preview (S8): a dedicated preview block inside the sheet — the reader
// behind the sheet is never used. Type sizes and spacing tokens cascade from
// the root data attributes, so the preview updates as controls change.
function VerseSettingsPreview({
  children,
  verses,
  translationVisible,
}: {
  children: React.ReactNode
  verses: ReaderVerse[]
  translationVisible: boolean
}) {
  return (
    <div className="qar:grid qar:gap-4">
      <section aria-label="Preview of your reading settings" className="qar-settings-preview">
        {verses.map((verse) => (
          <div className="qar-settings-preview-verse" key={verse.key}>
            <p className="qar-reader-verse-arabic" dir="rtl" lang="ar">
              {verse.arabic}
            </p>
            {translationVisible && verse.translation ? (
              <p className="qar-reader-verse-translation">{verse.translation}</p>
            ) : null}
          </div>
        ))}
      </section>
      {children}
    </div>
  )
}

function MushafSettingsPreview({
  children,
  page,
  framing,
}: {
  children: React.ReactNode
  page: MushafResolvedPage | null
  framing: number
}) {
  const placement = mushafImagePlacement(page?.displaySize, page?.framing?.textFrame, framing)
  return (
    <div className="qar:grid qar:gap-4">
      <section
        aria-label="Preview of your page settings"
        className="qar-settings-preview qar:grid qar:place-items-center"
      >
        {page ? (
          <div className="qar-settings-page-preview" style={{ aspectRatio: placement.ratio }}>
            <img
              alt={`Preview of page ${page.page}`}
              className="qar-react-mushaf-page-image"
              src={page.assetUrl}
              style={placement.image}
            />
          </div>
        ) : (
          <Status title="Page preview unavailable" tone="info" />
        )}
      </section>
      {children}
    </div>
  )
}

// Translation section: the shipped translation list (existing data); the
// switch controls visibility (existing behaviour).
const AVAILABLE_TRANSLATIONS = [{ id: 'bridges', label: 'Bridges — Fadel Soliman (Quranic Universal Library)' }]

function TranslationSelector({ onChange, value }: { onChange: (visible: boolean) => void; value: boolean }) {
  return (
    <Select
      value={value ? 'bridges' : 'off'}
      label="Translation"
      onValueChange={(next) => onChange(next === 'bridges')}
      options={[
        ...AVAILABLE_TRANSLATIONS.map((translation) => ({ label: translation.label, value: translation.id })),
        { label: 'Off — Arabic only', value: 'off' },
      ]}
    />
  )
}

// S8 Downloads link row: deep-link to S9 carrying a live size summary for the
// current edition's page images (from the availability index). Offline or on a
// read failure the row falls back to a plain description — the size is a
// nicety, never a gate.
function DownloadsLinkRow({ onOpen }: { onOpen: () => void }) {
  const [sizeText, setSizeText] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [{ loadMushafEditionEntries }, { formatOfflineBytes }] = await Promise.all([
          import('../../../launch/mushaf-edition-setup'),
          import('../../../offline/download/offline-pack-plan'),
        ])
        const [profile, entries] = await Promise.all([readActiveReaderProfile(), loadMushafEditionEntries()])
        const entry = entries.find((candidate) => candidate.mushafEditionId === profile.mushafEditionId)
        if (active && entry?.totalBytes != null) setSizeText(formatOfflineBytes(entry.totalBytes))
      } catch {
        // Plain description stays when the index is unavailable.
      }
    })()
    return () => {
      active = false
    }
  }, [])
  return (
    <ChoiceButton className="qar-react-settings-linkrow" data-settings-downloads="true" onClick={onOpen}>
      <span className="qar-react-settings-row-copy">
        <span className="qar-react-settings-row-label">Downloads</span>
        <span className="qar-react-settings-row-control">
          {sizeText ? `Mushaf page images · ${sizeText}` : 'Reader texts and Mushaf page images'}
        </span>
      </span>
      <span aria-hidden="true" className="qar-react-list-row-chevron">
        ›
      </span>
    </ChoiceButton>
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
