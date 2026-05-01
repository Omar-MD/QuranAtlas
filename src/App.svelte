<script lang="ts">
  import { onMount, mount, unmount, type Component } from 'svelte'
  import { initBootstrap } from './app-bootstrap'
  import { onRouteChange } from './core/router'
  import { trackRecentSurah } from './settings/state-recent-surahs.svelte'
  import { reader } from './reader/state.svelte'
  import { refreshForSurah } from './marks/indicator'

  // Eager — visible at first paint or carrying boot-time runtime hooks.
  import QuotaBanner from './core/quota-banner.svelte'
  import SaveFailureToast from './core/save-failure-toast.svelte'
  import UpdateBanner from './core/UpdateBanner.svelte'
  import ClearDataConfirm from './settings/ClearDataConfirm.svelte'
  import AmbientDock from './reader/AmbientDock.svelte'
  import MarginHeader from './reader/MarginHeader.svelte'
  import AudioMiniBar from './audio/AudioMiniBar.svelte'
  import AudioFullOverlay from './audio/AudioFullOverlay.svelte'

  // Lazy-mounted overlays (audit N25, 2026-05-01). First api.<method>()
  // call from the matching bridge fires `setMounter`, which flips the
  // *Mounted flag below; the $effect block then dynamically imports the
  // owning component. Subsequent opens reuse the loaded chunk + the
  // factory's pending-call queue replays the first call after register.
  import { undoToastBridge } from './core/ui-bridge'
  import { panelBridge } from './settings/panel-bridge'
  import { commandSheetBridge } from './nav/command-sheet-bridge'
  import { navDrawerBridge } from './nav/nav-drawer-bridge'
  import { tagSheetBridge } from './tag/sheet-bridge'

  let cleanups: Array<() => void> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentInstance: Record<string, any> | null = null

  // Lazy-mount machinery — one $state flag + one component slot per overlay.
  // The flag is flipped by the bridge's mounter; the $effect kicks the
  // dynamic import; the resolved default lands on the *Comp slot which the
  // {#if} block in the template renders.
  let undoToastMounted = $state(false)
  let panelMounted = $state(false)
  let commandSheetMounted = $state(false)
  let navDrawerMounted = $state(false)
  let tagSheetMounted = $state(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let UndoToastComp = $state<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PanelComp = $state<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let CommandSheetComp = $state<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let NavDrawerComp = $state<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let TagSheetComp = $state<any>(null)

  $effect(() => {
    if (undoToastMounted && !UndoToastComp) {
      void import('./core/ui.svelte').then(m => { UndoToastComp = m.default })
    }
  })
  $effect(() => {
    if (panelMounted && !PanelComp) {
      void import('./settings/Panel.svelte').then(m => { PanelComp = m.default })
    }
  })
  $effect(() => {
    if (commandSheetMounted && !CommandSheetComp) {
      void import('./nav/CommandSheet.svelte').then(m => { CommandSheetComp = m.default })
    }
  })
  $effect(() => {
    if (navDrawerMounted && !NavDrawerComp) {
      void import('./nav/NavDrawer.svelte').then(m => { NavDrawerComp = m.default })
    }
  })
  $effect(() => {
    if (tagSheetMounted && !TagSheetComp) {
      void import('./tag/TagSheet.svelte').then(m => { TagSheetComp = m.default })
    }
  })

  // React to reader surah changes: refresh the indicator cache and track
  // recent surahs. Replaces the vanilla READER_SURAH_LOADED event.
  $effect(() => {
    const surah = reader.currentSurahNum
    if (!surah) { return }
    void refreshForSurah(surah)
    void trackRecentSurah(surah)
  })

  // Sole-writer + race-safe trackRecentSurah lives in
  // state/recent-surahs.svelte.ts (audit R-27 / N11). App.svelte just
  // calls into it on every READER_SURAH_CHANGE.

  onMount(() => {
    let mounted = true

    // Wire lazy-mount triggers BEFORE initBootstrap so any boot-time
    // bridge call (e.g. #/settings route on first launch → openSettingsSheet)
    // can trigger the import path through the bridge's pending-call queue.
    undoToastBridge.setMounter(() => { undoToastMounted = true })
    panelBridge.setMounter(() => { panelMounted = true })
    commandSheetBridge.setMounter(() => { commandSheetMounted = true })
    navDrawerBridge.setMounter(() => { navDrawerMounted = true })
    tagSheetBridge.setMounter(() => { tagSheetMounted = true })

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
<QuotaBanner />
<SaveFailureToast />
<UpdateBanner />
<ClearDataConfirm />
<AudioMiniBar />
<AudioFullOverlay />

<!-- Lazy-mounted overlays — first bridge.api.<method>() flips the mount
     flag, which kicks the dynamic import, which renders the component
     here. Pending-call queue inside the factory replays the first call.
     Svelte 5 runes mode renders dynamic components by default; the
     PascalCase tag binds to the $state-tracked slot. -->
{#if UndoToastComp}<UndoToastComp />{/if}
{#if PanelComp}<PanelComp />{/if}
{#if CommandSheetComp}<CommandSheetComp />{/if}
{#if NavDrawerComp}<NavDrawerComp />{/if}
{#if TagSheetComp}<TagSheetComp />{/if}

<div class="qa-night-shift" aria-hidden="true"></div>
