<script lang="ts">
  import { onMount, mount, unmount, type Component } from 'svelte'
  import { initBootstrap } from './app-bootstrap'
  import { onRouteChange } from './core/router'
  import { get, put } from './core/db'
  import { reader } from './state/reader.svelte'
  import { refreshForSurah } from './marks/indicator'
  import UndoToast from './core/ui.svelte'
  import QuotaBanner from './core/quota-banner.svelte'
  import Panel from './settings/Panel.svelte'
  import ClearDataConfirm from './settings/ClearDataConfirm.svelte'
  import AmbientDock from './nav/AmbientDock.svelte'
  import MarginHeader from './nav/MarginHeader.svelte'
  import CommandSheet from './nav/CommandSheet.svelte'
  import MoreSheet from './nav/MoreSheet.svelte'
  import TagAmbientDock from './tag/AmbientDock.svelte'
  import TagSheet from './tag/TagSheet.svelte'
  import TagModePill from './nav/TagModePill.svelte'
  import { tagSession } from './state/tag-session.svelte'

  let cleanups: Array<() => void> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentInstance: Record<string, any> | null = null

  // React to reader surah changes: refresh the indicator cache and track
  // recent surahs. Replaces the vanilla READER_SURAH_LOADED event.
  $effect(() => {
    const surah = reader.currentSurahNum
    if (!surah) { return }
    void refreshForSurah(surah)
    void trackRecentSurah(surah)
  })

  async function trackRecentSurah(surah: number): Promise<void> {
    try {
      const rec = await get('settings', 'recentSurahs')
      const prev = Array.isArray(rec?.value) ? (rec.value as number[]) : []
      const next = [surah, ...prev.filter((n) => n !== surah)].slice(0, 5)
      await put('settings', { key: 'recentSurahs', value: next })
    } catch { /* ignore */ }
  }

  onMount(() => {
    let mounted = true

    // Register the route-change handler BEFORE initBootstrap so that Svelte
    // component routes dispatched during bootstrap (e.g. the initial #/about
    // hash) are captured even if the dynamic import resolves before bootstrap
    // fully completes.
    onRouteChange((RouteModule, params, hooks) => {
      if (!mounted) { return }

      // Unmount any previously mounted Svelte route component.
      if (currentInstance) {
        unmount(currentInstance)
        currentInstance = null
      }

      if (!RouteModule) { return }

      // The reader (and other vanilla-JS routes) write to #main-content with
      // innerHTML = '' which destroys Svelte's internal anchor comment nodes.
      // To avoid stale-anchor issues, mount the component directly with
      // Svelte's imperative mount() API targeting a fresh #main-content.
      const mainContent = document.getElementById('main-content')
      if (!mainContent) { return }

      // Remove any vanilla-JS DOM left by the previous route (reader, etc.)
      while (mainContent.firstChild) { mainContent.removeChild(mainContent.firstChild) }

      // Merge route params with hooks so Svelte components receive both as props
      const props = { ...(params as Record<string, string>), ...(hooks as Record<string, unknown>) }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentInstance = mount(RouteModule as Component<any>, {
        target: mainContent,
        props,
      })
    })

    initBootstrap().then((result) => {
      if (mounted) {
        cleanups = result ?? []
      }
    })

    return () => {
      mounted = false
      if (currentInstance) { unmount(currentInstance); currentInstance = null }
      cleanups.forEach(c => c())
    }
  })
</script>

<a href="#main-content" class="qa-skip-link">Skip to content</a>
<div id="app-shell">
  <!-- svelte-ignore a11y_no_redundant_roles -->
  <header id="top-bar" role="banner"></header>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_redundant_roles -->
  <main id="main-content" role="main" tabindex="0"></main>
  <!-- svelte-ignore a11y_no_redundant_roles -->
  <footer id="bottom-nav" role="contentinfo"><AmbientDock /></footer>
</div>
<MarginHeader />
<UndoToast />
<QuotaBanner />
<Panel />
<ClearDataConfirm />
<CommandSheet />
<MoreSheet />
<TagAmbientDock />
<TagModePill />
<TagSheet
  isOpen={tagSession.sheetOpen && !!tagSession.verseKey}
  verseKey={tagSession.verseKey ?? ''}
  onclose={() => tagSession.end()}
/>
