import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { ReaderPageRecipe } from '../../design-system/recipes/reader-page'
import { ReaderChrome, type ReaderMode } from './ReaderChrome'
import { SurahSelector } from './SurahSelector'
import { ReaderWirdStatusIndicator } from './wird/ReaderWirdStatusIndicator'
import { ChromeDrawer } from '../navigation/ChromeFrame'
import { requestReactSettingsOverlay } from '../../app/settings-overlay-events'
import type { WirdSummary } from '../../continuity/wird/types'
import { useNavDrawerController } from '../navigation/nav-drawer-controller'
import { ReaderInteractionProvider } from './ReaderInteractionContext'
import type { MushafChromePin } from './useMushafChromeVisibility'
import { REACT_ROUTES } from '../../app/router/routes'

export function ReaderPageShell({
  bottomStrip,
  bottomStripPinned = false,
  children,
  chromeVisible = true,
  currentSurah = null,
  interactionSuspended = false,
  mode,
  onChromePinChange,
  onModeChange,
  resolveSelectorHref,
  showWirdStatus = true,
  surahName,
  verseRange,
  wirdSummary,
}: {
  bottomStrip?: ReactNode
  /** Mushaf Focus mode pins the strip regardless of the scroll rule. */
  bottomStripPinned?: boolean
  children: ReactNode
  chromeVisible?: boolean
  currentSurah?: number | null
  interactionSuspended?: boolean
  mode: ReaderMode
  onChromePinChange?: (source: MushafChromePin, pinned: boolean) => void
  onModeChange?: (mode: ReaderMode) => void
  resolveSelectorHref?: (hash: string) => Promise<string> | string
  showWirdStatus?: boolean
  surahName?: string
  verseRange?: string
  wirdSummary?: WirdSummary
}) {
  const { dispatch: dispatchDrawer, state: drawerState } = useNavDrawerController()
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [drawerWirdInitialView, setDrawerWirdInitialView] = useState<'card' | 'detail'>('card')
  const dailyWirdVisible = showWirdStatus
  // S3: the mobile verse bottom strip hides on scroll down and returns on
  // scroll up — one stable hidden endpoint, one directional threshold.
  const [stripVisible, setStripVisible] = useState(true)
  const lastScrollTopRef = useRef(0)

  // Chrome pinning: open overlays (drawer) and suspended interaction keep the
  // bars visible regardless of Focus mode (Mushaf S4).
  useEffect(() => {
    onChromePinChange?.('drawer', drawerState.open)
  }, [drawerState.open, onChromePinChange])

  useEffect(() => {
    onChromePinChange?.('interaction', interactionSuspended)
  }, [interactionSuspended, onChromePinChange])

  useEffect(() => {
    if (mode !== 'verse') return undefined
    lastScrollTopRef.current = currentScrollTop()
    setStripVisible(true)

    function onScroll() {
      const top = currentScrollTop()
      const delta = top - lastScrollTopRef.current
      if (top < 20) {
        setStripVisible(true)
        lastScrollTopRef.current = top
        return
      }
      if (delta > 36) {
        setStripVisible(false)
        lastScrollTopRef.current = top
      } else if (delta < -36) {
        setStripVisible(true)
        lastScrollTopRef.current = top
      }
    }

    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [mode])

  // Mushaf Focus mode hides the strip via the pin; the scroll rule is a
  // verse-mode (mobile) affordance only.
  const stripShown = bottomStripPinned || (mode === 'verse' && stripVisible)

  const openDrawer = useCallback(
    (returnFocusId: string, initialWirdView: 'card' | 'detail') => {
      setDrawerWirdInitialView(initialWirdView)
      dispatchDrawer({ returnFocusId, type: 'open' })
    },
    [dispatchDrawer],
  )

  return (
    <ReaderInteractionProvider suspended={interactionSuspended || drawerState.open || selectorOpen}>
      <main
        aria-label={mode === 'verse' ? 'Verse reader' : 'Mushaf reader'}
        className={`qar-react-reader-shell qar:bg-canvas qar:text-text${mode === 'verse' ? ' qar:min-h-screen' : ''}`}
        data-reader-mode={mode}
        id="reader-main"
        tabIndex={-1}
      >
        <ReaderPageRecipe
          chrome={
            <>
              <ReaderChrome
                mode={mode}
                visible={chromeVisible}
                onOpenBookmarks={() => {
                  window.location.hash = REACT_ROUTES.bookmarks
                }}
                onOpenNavigation={() => {
                  openDrawer('reader-navigation-trigger', 'card')
                }}
                onOpenSelector={() => setSelectorOpen(true)}
                onOpenSettings={() => {
                  requestReactSettingsOverlay(mode, 'reader-settings-trigger')
                }}
                onModeChange={onModeChange}
                surahName={surahName}
                verseRange={verseRange}
                wirdStatus={
                  dailyWirdVisible && wirdSummary ? (
                    <ReaderWirdStatusIndicator
                      onOpen={() => {
                        openDrawer('reader-wird-status-trigger', 'detail')
                      }}
                      summary={wirdSummary}
                    />
                  ) : null
                }
              />
              <ChromeDrawer
                controller={{ dispatch: dispatchDrawer, state: drawerState }}
                initialWirdView={dailyWirdVisible ? drawerWirdInitialView : 'card'}
                mode={mode}
                onOpenSurahs={() => {
                  setSelectorOpen(true)
                }}
                showWird={dailyWirdVisible}
              />
              <SurahSelector
                currentSurah={currentSurah}
                onClose={() => setSelectorOpen(false)}
                onNavigate={(hash) => {
                  setSelectorOpen(false)
                  window.location.hash = hash
                }}
                open={selectorOpen}
                resolveHref={resolveSelectorHref}
              />
            </>
          }
          contentClassName={mode === 'mushaf' ? 'qar:max-w-none qar:p-0 qar:flex-1 qar:min-h-0' : undefined}
        >
          {bottomStrip ? (
            <div
              className={
                stripShown
                  ? 'qar-reader-bottom-strip-slot'
                  : 'qar-reader-bottom-strip-slot qar-reader-bottom-strip-slot--hidden'
              }
              inert={!stripShown || undefined}
              aria-hidden={!stripShown || undefined}
              data-bottom-strip={mode}
            >
              {bottomStrip}
            </div>
          ) : null}
          {children}
        </ReaderPageRecipe>
      </main>
    </ReaderInteractionProvider>
  )
}

function currentScrollTop(): number {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
}
