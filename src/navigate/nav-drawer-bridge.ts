/**
 * Imperative bridge for the NavDrawer Svelte component. Migrated to
 * createOverlayBridge 2026-05-01 (audit N22). MarginHeader / route
 * redirects / AmbientDock open the drawer via these wrappers — no
 * circular import on the .svelte module.
 */

import { createOverlayBridge, type BaseOverlayAPI } from '../core/persistent-overlay'

export type DrawerTab = 'read'
export type ReadSubTab = 'surah' | 'juz' | 'bookmarks'

export interface NavDrawerAPI extends BaseOverlayAPI {
  open(tab?: DrawerTab, subTab?: ReadSubTab): void
  close(): void
  toggle(tab?: DrawerTab): void
  isOpen(): boolean
}

export const navDrawerBridge = createOverlayBridge<NavDrawerAPI>({ name: 'nav-drawer' })

export const openNavDrawer = (tab?: DrawerTab, subTab?: ReadSubTab): void =>
  navDrawerBridge.api.open(tab, subTab)
export const closeNavDrawer = (): void => navDrawerBridge.api.close()
export const toggleNavDrawer = (tab?: DrawerTab): void => navDrawerBridge.api.toggle(tab)
