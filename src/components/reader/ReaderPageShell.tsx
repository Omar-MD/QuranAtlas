import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { ReaderChrome, type ReaderMode } from './ReaderChrome'
import { NavDrawer } from '../navigation/NavDrawer'
import { ReaderWirdStatusIndicator } from './wird/ReaderWirdStatusIndicator'
import { requestReactSettingsOverlay } from '../../app/settings-overlay-events'
import { useBookmarks } from '../../continuity/bookmarks/use-bookmarks'
import type { WirdSummary } from '../../continuity/wird/types'
import { useNavDrawerController } from '../navigation/nav-drawer-controller'
import { ReaderInteractionProvider } from './ReaderInteractionContext'
import type { MushafChromePin } from './useMushafChromeVisibility'

export function ReaderPageShell({
  children,
  chromeVisible,
  interactionSuspended = false,
  label,
  mode,
  onChromePinChange,
  onModeChange,
  onChromeVisibleChange,
  showWirdStatus = true,
  surahLabel,
  wirdSummary,
}: {
  children: ReactNode
  chromeVisible?: boolean
  interactionSuspended?: boolean
  label: string
  mode: ReaderMode
  onChromePinChange?: (source: MushafChromePin, pinned: boolean) => void
  onModeChange?: (mode: ReaderMode) => void
  onChromeVisibleChange?: (visible: boolean) => void
  showWirdStatus?: boolean
  surahLabel?: string
  wirdSummary?: WirdSummary
}) {
  const { dispatch: dispatchDrawer, state: drawerState } = useNavDrawerController()
  const { bookmarks, deleteBookmark } = useBookmarks()
  const [internalChromeVisible, setInternalChromeVisible] = useState(true)
  const [drawerWirdInitialView, setDrawerWirdInitialView] = useState<'card' | 'detail'>('card')
  const visible = chromeVisible ?? internalChromeVisible
  const dailyWirdVisible = showWirdStatus
  const lastScrollTopRef = useRef(0)

  const setChromeVisible = useCallback((nextVisible: boolean) => {
    if (chromeVisible === undefined) {
      setInternalChromeVisible(nextVisible)
    } else {
      onChromeVisibleChange?.(nextVisible)
    }
  }, [chromeVisible, onChromeVisibleChange])

  useEffect(() => {
    if (!drawerState.open) return undefined
    setChromeVisible(true)
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dispatchDrawer({ reason: 'escape', type: 'close' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatchDrawer, drawerState.open, setChromeVisible])

  useEffect(() => {
    onChromePinChange?.('drawer', drawerState.open)
  }, [drawerState.open, onChromePinChange])

  useEffect(() => {
    onChromePinChange?.('interaction', interactionSuspended)
  }, [interactionSuspended, onChromePinChange])

  useEffect(() => {
    if (mode !== 'verse') return undefined
    lastScrollTopRef.current = currentScrollTop()
    setChromeVisible(true)

    function onScroll() {
      const top = currentScrollTop()
      const delta = top - lastScrollTopRef.current
      if (top < 20) {
        setChromeVisible(true)
        lastScrollTopRef.current = top
        return
      }
      if (delta > 36) {
        setChromeVisible(false)
        lastScrollTopRef.current = top
      } else if (delta < -36) {
        setChromeVisible(true)
        lastScrollTopRef.current = top
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [mode, setChromeVisible])

  function navigate(hash: string) {
    window.location.hash = hash
    dispatchDrawer({ type: 'route-transition' })
  }

  return (
    <ReaderInteractionProvider suspended={interactionSuspended || drawerState.open}>
      <main className={`qar-react-reader-shell qar:bg-canvas qar:text-text${mode === 'verse' ? ' qar:min-h-screen' : ''}`} aria-label={mode === 'verse' ? 'Verse reader' : 'Mushaf reader'} data-reader-mode={mode} id="reader-main" tabIndex={-1}>
        <ReaderChrome
          mode={mode}
          onBlurCapture={(event) => {
            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
              onChromePinChange?.('focus', false)
            }
          }}
          onFocusCapture={() => onChromePinChange?.('focus', true)}
          onModeChange={onModeChange}
          onOpenNavigation={() => {
            setChromeVisible(true)
            setDrawerWirdInitialView('card')
            dispatchDrawer({ returnFocusId: 'reader-navigation-trigger', type: 'open' })
          }}
          onOpenSettings={() => {
            setChromeVisible(true)
            requestReactSettingsOverlay(mode, 'reader-settings-trigger')
          }}
          title={surahLabel}
          visible={visible}
          wirdStatus={dailyWirdVisible && wirdSummary ? (
            <ReaderWirdStatusIndicator
              onOpen={() => {
                setChromeVisible(true)
                setDrawerWirdInitialView('detail')
                dispatchDrawer({ returnFocusId: 'reader-wird-status-trigger', type: 'open' })
              }}
              summary={wirdSummary}
            />
          ) : null}
        />
        {drawerState.open && (
          <div className="qar-react-nav-drawer-overlay" onClick={() => dispatchDrawer({ reason: 'outside', type: 'close' })} role="presentation">
            <NavDrawer
              bookmarks={bookmarks}
              currentLabel={label}
              initialWirdView={dailyWirdVisible ? drawerWirdInitialView : 'card'}
              mode={mode}
              onClose={() => dispatchDrawer({ reason: 'button', type: 'close' })}
              onDeleteBookmark={deleteBookmark}
              onNavigate={navigate}
              open
              showWird={dailyWirdVisible}
            />
          </div>
        )}
        {children}
      </main>
    </ReaderInteractionProvider>
  )
}

function currentScrollTop(): number {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
}
