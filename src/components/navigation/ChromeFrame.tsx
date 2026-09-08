import { Menu, Settings } from 'lucide-react'
import type { Dispatch, ReactNode } from 'react'

import { REACT_ROUTES } from '../../app/router/routes'
import { useSharedBookmarks } from '../../continuity/bookmarks/use-bookmarks'
import { Button, IconButton } from '../ui'
import { NavDrawer } from './NavDrawer'
import type { NavDrawerAction, NavDrawerState } from './nav-drawer-controller'

export type ChromeDrawerController = {
  dispatch: Dispatch<NavDrawerAction>
  state: NavDrawerState
}

/**
 * Shared application chrome bar (director brief 1.1): Georgia-serif wordmark at
 * the inline start, destination hamburger, settings gear. Logical flex order
 * keeps the wordmark RTL-sensitive.
 */
export function ChromeBar({
  onOpenNavigation,
  onOpenSettings,
}: {
  onOpenNavigation: () => void
  onOpenSettings: () => void
}) {
  return (
    <header className="qar-react-chrome-bar qar:flex qar:items-center qar:justify-between qar:gap-3 qar:border-b qar:border-border qar:bg-surface qar:px-5 qar:py-3">
      <Button
        className="qar-react-chrome-wordmark qar:px-1 qar:text-2xl qar:leading-tight"
        onClick={() => {
          window.location.hash = REACT_ROUTES.home
        }}
        variant="ghost"
      >
        QuranAtlas
      </Button>
      <div className="qar:flex qar:items-center qar:gap-2">
        <IconButton id="chrome-navigation-trigger" label="Open navigation" onClick={onOpenNavigation}>
          <Menu aria-hidden="true" size={24} strokeWidth={1.7} />
        </IconButton>
        <IconButton id="chrome-settings-trigger" label="Open settings" onClick={onOpenSettings}>
          <Settings aria-hidden="true" size={24} strokeWidth={1.6} />
        </IconButton>
      </div>
    </header>
  )
}

/**
 * The single drawer composition: one host owns the controller wiring,
 * bookmark data, route-transition navigation, and the focus-return contract
 * (director brief 6.4). The Sheet navigation-drawer variant provides the
 * mobile modal and desktop rail shell. Route-transition closes suppress the
 * invoker focus restore so focus follows the destination route.
 */
export function ChromeDrawer({
  activeMode = 'read',
  controller,
  initialWirdView = 'card',
  mode = 'verse',
  searchPanel,
  showWird = false,
}: {
  activeMode?: 'read' | 'search'
  controller: ChromeDrawerController
  initialWirdView?: 'card' | 'detail'
  mode?: 'verse' | 'mushaf'
  searchPanel?: ReactNode
  showWird?: boolean
}) {
  const { bookmarks, deleteBookmark } = useSharedBookmarks()
  const { dispatch, state } = controller

  function navigate(hash: string) {
    window.location.hash = hash
    dispatch({ type: 'route-transition' })
  }

  return (
    <NavDrawer
      activeMode={activeMode}
      bookmarks={bookmarks}
      initialWirdView={initialWirdView}
      mode={mode}
      onClose={() => dispatch({ type: 'close' })}
      onDeleteBookmark={deleteBookmark}
      onNavigate={navigate}
      open={state.open}
      returnFocusId={state.returnFocusId ?? undefined}
      searchPanel={searchPanel}
      showWird={showWird}
      suppressFocusRestore={state.routeTransitioning}
    />
  )
}

/**
 * Shared application frame (registry: chrome-frame): the 1.1 chrome bar, one
 * always-present polite status region per page, page content, and the single
 * drawer host. Routes compose their bodies inside; the drawer overlays them.
 */
export function ChromeFrame({
  activeMode = 'read',
  children,
  controller,
  mode = 'verse',
  onOpenSettings,
  searchPanel,
  showWird = false,
  statusMessage,
}: {
  activeMode?: 'read' | 'search'
  children: ReactNode
  controller: ChromeDrawerController
  mode?: 'verse' | 'mushaf'
  onOpenSettings: () => void
  searchPanel?: ReactNode
  showWird?: boolean
  statusMessage?: string
}) {
  return (
    <>
      <ChromeBar
        onOpenNavigation={() => controller.dispatch({ returnFocusId: 'chrome-navigation-trigger', type: 'open' })}
        onOpenSettings={onOpenSettings}
      />
      <div aria-live="polite" className="qar:sr-only" role="status">
        {statusMessage ?? ''}
      </div>
      {children}
      <ChromeDrawer
        activeMode={activeMode}
        controller={controller}
        mode={mode}
        searchPanel={searchPanel}
        showWird={showWird}
      />
    </>
  )
}
