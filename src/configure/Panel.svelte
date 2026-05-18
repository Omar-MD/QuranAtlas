<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { emit } from '../core/events'
  import { Events } from '../core/constants'
  import { panelBridge, type SettingsMode } from './panel-bridge'
  import SettingsShell from './settings/SettingsShell.svelte'
  import VerseSettings from './settings/VerseSettings.svelte'
  import MushafSettings from './settings/MushafSettings.svelte'

  let open = $state(false)
  let mode = $state<SettingsMode>('verse')
  let opener = $state<HTMLElement | null>(null)
  let restoreOnClose = true

  const title = $derived(mode === 'mushaf' ? 'Mushaf Settings' : 'Verse Settings')
  function inferredMode(): SettingsMode {
    return typeof window !== 'undefined' && window.location.hash.startsWith('#/m/') ? 'mushaf' : 'verse'
  }

  async function openPanel(nextMode: SettingsMode = inferredMode()): Promise<void> {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    restoreOnClose = true
    mode = nextMode
    open = true
    emit(Events.SHEET_OPENED, { name: 'settings' })
    await tick()
    document.querySelector<HTMLElement>('.qa-settings-shell')?.focus()
  }

  function closePanel(options: { restoreFocus?: boolean } = {}): void {
    if (!open) return
    open = false
    emit(Events.SHEET_CLOSED, { name: 'settings' })
    const shouldRestore = options.restoreFocus ?? restoreOnClose
    restoreOnClose = true
    if (shouldRestore) opener?.focus()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!open || event.key !== 'Escape') return
    event.preventDefault()
    closePanel()
  }

  onMount(() => {
    document.addEventListener('keydown', onKeydown)
    panelBridge.register({
      open: (nextMode?: SettingsMode) => { void openPanel(nextMode) },
      close: () => closePanel(),
      isOpen: () => open,
    })
    return () => {
      document.removeEventListener('keydown', onKeydown)
      panelBridge.unregister()
    }
  })
</script>

{#if open}
  <SettingsShell {title} close={closePanel}>
    {#if mode === 'mushaf'}
      <MushafSettings />
    {:else}
      <VerseSettings />
    {/if}
  </SettingsShell>
{/if}
