<script lang="ts">
  import { onMount } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import { riwayahInstallIntent, settings, type Riwayah } from '../../configure/state.svelte'
  import { setRiwayah } from '../../configure/riwayah'
  import { Events } from '../../core/constants'
  import { on } from '../../core/events'
  import { navigate } from '../../core/router'
  import { MushafPackUnavailableError, resolveMushafPage } from '../../data/mushaf-pages'
  import { startRiwayahPackageInstall } from '../../data/offline-client'
  import { isRiwayahUsable } from '../../data/riwayah-packages'
  import { reader } from '../state.svelte'
  import MushafControls from './MushafControls.svelte'
  import MushafPage from './MushafPage.svelte'
  import { verseHrefForMushafPage } from './mode-switch'
  import {
    actionForMushafKey,
    actionForMushafSwipe,
    pageForMushafAction,
    pageHref,
    parseMushafPageParam,
    type MushafPhysicalAction,
  } from './navigation'
  import {
    choosePageChipPlacement,
    fitViewBoxIntoRect,
    fitViewBoxToWidth,
    resolveMushafLayoutMode,
    type ChipPlacement,
    type SvgViewBox,
  } from './sizing'
  import { loadInlineMushafSvg } from './svg-page'
  import { setMushafViewMode } from './view-mode'
  import type { InlineMushafSvg, MushafResolvedPage } from './types'

  type Props = { page?: string }
  const { page = '1' }: Props = $props()

  const inlineSvgCache: Array<[string, InlineMushafSvg]> = []
  const inlineSvgRequests = new SvelteMap<string, Promise<InlineMushafSvg>>()
  const INLINE_SVG_CACHE_LIMIT = 8

  let routePage = $state(1)
  let resolved = $state<MushafResolvedPage | null>(null)
  let inlineSvg = $state<InlineMushafSvg | null>(null)
  let loading = $state(true)
  let svgLoading = $state(false)
  let error = $state<string | null>(null)
  let installPrompt = $state<{ riwayah: string } | null>(null)
  let verseModeAvailable = $state(true)
  let requestId = 0
  let mounted = false
  let svgAbort: AbortController | null = null
  let prefetchAbort: AbortController | null = null
  let jumpOpen = $state(false)
  let layoutStyle = $state('')
  let chipPlacement = $state<ChipPlacement>('bottom-center')
  let pointerStart: {
    id: number
    x: number
    y: number
    time: number
    active: boolean
  } | null = null

  function isActiveRequest(id: number): boolean {
    return mounted && id === requestId
  }

  function rememberInlineSvg(assetUrl: string, svg: InlineMushafSvg): InlineMushafSvg {
    const existing = inlineSvgCache.findIndex(([cachedUrl]) => cachedUrl === assetUrl)
    if (existing >= 0) inlineSvgCache.splice(existing, 1)
    inlineSvgCache.push([assetUrl, svg])
    while (inlineSvgCache.length > INLINE_SVG_CACHE_LIMIT) {
      inlineSvgCache.shift()
    }
    return svg
  }

  async function loadCachedInlineSvg(assetUrl: string, signal?: AbortSignal): Promise<InlineMushafSvg> {
    const cached = inlineSvgCache.find(([cachedUrl]) => cachedUrl === assetUrl)?.[1]
    if (cached) return cached
    const existing = inlineSvgRequests.get(assetUrl)
    if (existing) return existing
    const request = loadInlineMushafSvg(assetUrl, signal)
      .then((svg) => rememberInlineSvg(assetUrl, svg))
      .finally(() => {
        inlineSvgRequests.delete(assetUrl)
      })
    inlineSvgRequests.set(assetUrl, request)
    return request
  }

  function assetUrlForPage(current: MushafResolvedPage, pageNumber: number): string {
    const pageAsset = String(pageNumber).padStart(3, '0')
    return current.assetUrl.replace(/pages\/\d{3}\.svg$/, `pages/${pageAsset}.svg`)
  }

  function prefetchAdjacentPages(current: MushafResolvedPage): void {
    prefetchAbort?.abort()
    const controller = new AbortController()
    prefetchAbort = controller
    const candidates = [current.page + 1, current.page - 1]
      .filter((candidate) => candidate >= 1 && candidate <= current.pageCount)
      .map((candidate) => assetUrlForPage(current, candidate))
      .filter((assetUrl) => !inlineSvgCache.some(([cachedUrl]) => cachedUrl === assetUrl))

    void Promise.allSettled(candidates.map((assetUrl) => loadCachedInlineSvg(assetUrl, controller.signal)))
      .finally(() => {
        if (prefetchAbort === controller) prefetchAbort = null
      })
  }

  async function load(): Promise<void> {
    const id = ++requestId
    svgAbort?.abort()
    prefetchAbort?.abort()
    svgAbort = null
    prefetchAbort = null
    reader.readerMode = 'mushaf'
    reader.currentMushafPage = routePage
    reader.currentSurahNum = null
    reader.currentVerseKey = null
    reader.currentSurah = null
    loading = true
    svgLoading = false
    inlineSvg = null
    error = null
    installPrompt = null
    verseModeAvailable = true
    let hasResolvedMetadata = false

    try {
      const next = await resolveMushafPage({ riwayah: settings.riwayah, page: routePage })
      if (!isActiveRequest(id)) return
      const currentHash = window.location.hash
      if (next.page !== routePage || (currentHash.startsWith('#/m/') && currentHash !== pageHref(next.page))) {
        navigate(pageHref(next.page), { replace: true })
        return
      }
      resolved = next
      hasResolvedMetadata = true
      routePage = next.page
      reader.currentMushafPage = next.page
      loading = false
      svgLoading = true

      const controller = new AbortController()
      svgAbort = controller
      const svgRequest = loadCachedInlineSvg(next.assetUrl, controller.signal)
      prefetchAdjacentPages(next)
      const svg = await svgRequest
      if (!isActiveRequest(id)) return
      if (svg.viewBoxText !== next.viewBoxText) {
        throw new Error('Mushaf page SVG viewBox does not match the page manifest')
      }
      inlineSvg = svg
      measureLayout()
      resetMainScroll()
    } catch (err) {
      if (!isActiveRequest(id)) return
      if (!hasResolvedMetadata) resolved = null
      inlineSvg = null
      if (err instanceof MushafPackUnavailableError) {
        installPrompt = { riwayah: err.riwayah }
        verseModeAvailable = await isRiwayahUsable(err.riwayah).catch(() => false)
      } else if (err instanceof Error && err.name === 'AbortError') {
        return
      } else {
        error = err instanceof Error ? err.message : String(err)
      }
    } finally {
      if (isActiveRequest(id)) {
        loading = false
        svgLoading = false
        if (svgAbort?.signal.aborted) svgAbort = null
      }
    }
  }

  function navigateToPage(next: number): void {
    navigate(pageHref(next))
  }

  function currentViewBox(): SvgViewBox | null {
    return inlineSvg?.viewBox ?? resolved?.viewBox ?? null
  }

  function measureLayout(): void {
    const viewBox = currentViewBox()
    if (!viewBox || typeof document === 'undefined') return
    const mainRect = document.getElementById('main-content')?.getBoundingClientRect()
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    const rect = mainRect && mainRect.width > 0 && mainRect.height > 0
      ? mainRect
      : ({ top: 0, bottom: viewportHeight, width: viewportWidth, height: viewportHeight } as DOMRect)
    const header = document.querySelector('.qa-mh')?.getBoundingClientRect()
    const headerOverlap = header && header.bottom > rect.top && header.top < rect.bottom && window.innerWidth < 1180
      ? Math.max(0, Math.min(header.bottom, rect.bottom) - rect.top)
      : 0
    const margin = 0
    const fullAvailable = {
      width: Math.max(0, rect.width - margin * 2),
      height: Math.max(0, rect.height - headerOverlap - margin * 2),
    }
    const resolvedLayoutMode = resolveMushafLayoutMode(settings.mushafViewMode, {
      width: viewportWidth,
      height: viewportHeight,
    })
    const controlsClearance = resolvedLayoutMode === 'fit-page' ? 56 : 0
    const available = {
      width: fullAvailable.width,
      height: Math.max(0, fullAvailable.height - controlsClearance),
    }
    const fit = resolvedLayoutMode === 'fit-width'
      ? fitViewBoxToWidth(viewBox, available.width)
      : fitViewBoxIntoRect(viewBox, available)
    layoutStyle = [
      `--qa-mushaf-page-width:${fit.width}px`,
      `--qa-mushaf-page-height:${fit.height}px`,
      `--qa-mushaf-page-x:${margin + fit.x}px`,
      `--qa-mushaf-page-y:${headerOverlap + margin + fit.y}px`,
      `--qa-mushaf-reader-height:${Math.max(rect.height, headerOverlap + margin * 2 + fit.height + controlsClearance)}px`,
      `--qa-mushaf-viewbox-ratio:${viewBox.width / viewBox.height}`,
    ].join(';')
    chipPlacement = choosePageChipPlacement({
      available,
      pageFit: fit,
      chip: { width: 112, height: 40 },
      margin,
    })
  }

  async function updateViewMode(mode: typeof settings.mushafViewMode): Promise<void> {
    if (await setMushafViewMode(mode)) {
      measureLayout()
    }
  }

  function resetMainScroll(): void {
    const main = document.getElementById('main-content')
    if (main) {
      main.scrollTop = 0
      main.scrollLeft = 0
    }
  }

  function navigateByAction(action: MushafPhysicalAction): void {
    const current = resolved?.page ?? routePage
    const count = resolved?.pageCount ?? current
    const next = pageForMushafAction(current, count, action)
    if (next !== current) navigateToPage(next)
  }

  function handleKeyboard(event: KeyboardEvent): void {
    if (jumpOpen) return
    const target = event.target
    if (target instanceof HTMLElement && (target.closest('input, textarea, select') || target.isContentEditable)) return
    const action = actionForMushafKey(event.key)
    if (!action) return
    event.preventDefault()
    if (action === 'first') {
      navigateToPage(1)
    } else if (action === 'last') {
      navigateToPage(resolved?.pageCount ?? routePage)
    } else {
      navigateByAction(action)
    }
  }

  function isInteractiveGestureTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    return Boolean(target.closest('input, button, textarea, select, a'))
  }

  function handlePointerDown(event: PointerEvent): void {
    if (jumpOpen || event.button !== 0 || !event.isPrimary || isInteractiveGestureTarget(event.target)) return
    pointerStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      active: true,
    }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function finishPointer(event: PointerEvent): void {
    if (!pointerStart?.active || pointerStart.id !== event.pointerId) return
    const start = pointerStart
    pointerStart = null
    const target = event.currentTarget as HTMLElement
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
    if (jumpOpen) return
    const deltaX = event.clientX - start.x
    const deltaY = event.clientY - start.y
    const elapsed = Math.max(1, performance.now() - start.time)
    const velocity = Math.abs(deltaX) / elapsed
    const horizontalEnough = Math.abs(deltaX) >= 48 || velocity >= 0.35
    const verticalGuard = Math.abs(deltaY) <= Math.abs(deltaX) * 0.75
    if (!horizontalEnough || !verticalGuard) return
    const action = actionForMushafSwipe(deltaX)
    if (action) navigateByAction(action)
  }

  function cancelPointer(event: PointerEvent): void {
    if (!pointerStart || pointerStart.id !== event.pointerId) return
    pointerStart = null
    const target = event.currentTarget as HTMLElement
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
  }

  async function openVerse(): Promise<void> {
    const pageToOpen = resolved?.page ?? routePage
    try {
      navigate(await verseHrefForMushafPage(pageToOpen))
    } catch {
      const fallback = settings.currentPosition
      navigate(fallback ? `#/s/${fallback.surah}/${fallback.verse}` : '#/s/1')
    }
  }

  function openInstallPrompt(): void {
    navigate('#/settings')
  }

  async function installMissingPack(): Promise<void> {
    const riwayah = installPrompt?.riwayah as Riwayah | undefined
    if (!riwayah) return
    const ok = await startRiwayahPackageInstall(riwayah)
    if (ok) void load()
  }

  async function stayCurrentUsable(): Promise<void> {
    const preferred = riwayahInstallIntent.previousUsable
    if (await isRiwayahUsable(preferred).catch(() => false)) {
      if (await setRiwayah(preferred)) return
    }
    if (await isRiwayahUsable('qaloon').catch(() => false)) {
      await setRiwayah('qaloon')
    }
  }

  function pageFromRouteProp(): number {
    return parseMushafPageParam(page) ?? 1
  }

  $effect(() => {
    const nextRoutePage = pageFromRouteProp()
    if (nextRoutePage !== routePage) {
      routePage = nextRoutePage
      if (mounted) void load()
    }
  })

  $effect(() => {
    if (resolved || inlineSvg) measureLayout()
  })

  onMount(() => {
    routePage = pageFromRouteProp()
    mounted = true
    void load()
    const offRiwayah = on(Events.SETTINGS_RIWAYAH_CHANGED, () => { void load() })
    document.addEventListener('keydown', handleKeyboard)
    const onResize = () => measureLayout()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    return () => {
      mounted = false
      requestId += 1
      svgAbort?.abort()
      prefetchAbort?.abort()
      svgAbort = null
      prefetchAbort = null
      offRiwayah()
      document.removeEventListener('keydown', handleKeyboard)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
      reader.currentMushafPage = null
    }
  })
</script>

<article
  class="qa-mushaf-reader"
  data-mushaf-page={resolved?.page ?? routePage}
  style={layoutStyle}
  onpointerdown={handlePointerDown}
  onpointerup={finishPointer}
  onpointercancel={cancelPointer}
>
  <MushafPage
    {resolved}
    {inlineSvg}
    {loading}
    {svgLoading}
    {error}
    {installPrompt}
    onRetry={() => { void load() }}
    onOpenVerse={() => { void openVerse() }}
    onInstallPack={() => { void installMissingPack() }}
    onOpenSettings={openInstallPrompt}
    onStayCurrentUsable={() => { void stayCurrentUsable() }}
    {verseModeAvailable}
  />
  {#if resolved}
    <MushafControls
      page={resolved.page}
      pageCount={resolved.pageCount}
      placement={chipPlacement}
      viewMode={settings.mushafViewMode}
      onAction={navigateByAction}
      onNavigate={navigateToPage}
      onViewModeChange={(mode) => { void updateViewMode(mode) }}
      onJumpOpenChange={(open) => { jumpOpen = open }}
    />
  {/if}
</article>
