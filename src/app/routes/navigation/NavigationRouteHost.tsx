import type { ReactNode } from 'react'

import { REACT_ROUTES } from '../../router/routes'
import { BookmarksProvider } from '../../../continuity/bookmarks/use-bookmarks'
import { ChromeFrame } from '../../../components/navigation/ChromeFrame'
import { useNavDrawerController } from '../../../components/navigation/nav-drawer-controller'

export function NavigationRouteHost({
  children,
  currentRoute = null,
  statusMessage,
}: {
  children: ReactNode
  currentRoute?: 'bookmarks' | 'downloads' | 'settings' | 'about' | null
  statusMessage: string
}) {
  const drawer = useNavDrawerController()
  return (
    <BookmarksProvider>
      <ChromeFrame
        controller={drawer}
        currentRoute={currentRoute}
        onOpenSettings={() => {
          window.location.hash = REACT_ROUTES.settings
        }}
        statusMessage={statusMessage}
      >
        {children}
      </ChromeFrame>
    </BookmarksProvider>
  )
}
