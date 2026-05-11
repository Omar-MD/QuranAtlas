<script lang="ts">
  import { onMount } from 'svelte'
  import { settings } from '../../configure/state.svelte'
  import { Events } from '../../core/constants'
  import { on } from '../../core/events'
  import { navigate } from '../../core/router'
  import { MushafPackUnavailableError, resolveMushafPage } from '../../data/mushaf-pages'
  import { reader } from '../state.svelte'
  import MushafControls from './MushafControls.svelte'
  import MushafPage from './MushafPage.svelte'
  import { verseHrefForMushafPage } from './mode-switch'
  import { pageHref, parseMushafPageParam } from './navigation'
  import type { MushafResolvedPage } from './types'

  type Props = { page?: string }
  const { page = '1' }: Props = $props()

  let routePage = $state(1)
  let resolved = $state<MushafResolvedPage | null>(null)
  let loading = $state(true)
  let error = $state<string | null>(null)
  let installPrompt = $state<{ riwayah: string } | null>(null)
  let requestId = 0
  let mounted = false

  function isActiveRequest(id: number): boolean {
    return mounted && id === requestId
  }

  async function load(): Promise<void> {
    const id = ++requestId
    reader.readerMode = 'mushaf'
    reader.currentMushafPage = routePage
    reader.currentSurahNum = null
    reader.currentVerseKey = null
    reader.currentSurah = null
    loading = true
    error = null
    installPrompt = null

    try {
      const next = await resolveMushafPage({ riwayah: settings.riwayah, page: routePage })
      if (!isActiveRequest(id)) return
      const currentHash = window.location.hash
      if (next.page !== routePage || (currentHash.startsWith('#/m/') && currentHash !== pageHref(next.page))) {
        navigate(pageHref(next.page), { replace: true })
        return
      }
      resolved = next
      routePage = next.page
      reader.currentMushafPage = next.page
    } catch (err) {
      if (!isActiveRequest(id)) return
      resolved = null
      if (err instanceof MushafPackUnavailableError) {
        installPrompt = { riwayah: err.riwayah }
      } else {
        error = err instanceof Error ? err.message : String(err)
      }
    } finally {
      if (isActiveRequest(id)) loading = false
    }
  }

  function navigateToPage(next: number): void {
    navigate(pageHref(next))
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

  onMount(() => {
    routePage = pageFromRouteProp()
    mounted = true
    void load()
    const offRiwayah = on(Events.SETTINGS_RIWAYAH_CHANGED, () => { void load() })
    return () => {
      mounted = false
      requestId += 1
      offRiwayah()
      reader.currentMushafPage = null
    }
  })
</script>

<article class="qa-mushaf-reader" data-mushaf-page={resolved?.page ?? routePage}>
  <MushafPage
    {resolved}
    {loading}
    {error}
    {installPrompt}
    onRetry={() => { void load() }}
    onOpenVerse={() => { void openVerse() }}
    onInstallPack={openInstallPrompt}
  />
  {#if resolved}
    <MushafControls
      page={resolved.page}
      pageCount={resolved.pageCount}
      onNavigate={navigateToPage}
    />
  {/if}
</article>
