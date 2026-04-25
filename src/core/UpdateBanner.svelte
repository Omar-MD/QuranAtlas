<script lang="ts">
  /**
   * UpdateBanner — surfaces when a new service-worker version is waiting,
   * so the user knows a fresh build was rolled out and can apply it.
   * Mounted persistently in App.svelte. Listens for APP_UPDATE_AVAILABLE
   * (emitted by app-bootstrap when the SW reaches 'installed' state with an
   * existing controller). Tap "Reload" → applyAppUpdate() → SW activates +
   * page reloads.
   */
  import { on } from './events'
  import { Events } from './constants'
  import { applyAppUpdate } from '../app-bootstrap'
  import { announce } from '../a11y/announcer'

  let visible = $state(false)
  let busy = $state(false)

  $effect(() => {
    const unsub = on(Events.APP_UPDATE_AVAILABLE, () => {
      if (visible) { return }
      visible = true
      announce('A new version of QuranAtlas is available. Reload to apply.')
    })
    return () => { unsub() }
  })

  async function handleReload() {
    if (busy) { return }
    busy = true
    await applyAppUpdate()
  }

  function handleDismiss() {
    visible = false
  }
</script>

{#if visible}
  <div
    class="qa-update-banner"
    role="status"
    aria-live="polite"
    data-testid="update-banner"
  >
    <span class="qa-update-banner-text">New version available.</span>
    <button
      type="button"
      class="qa-update-banner-action"
      onclick={handleReload}
      disabled={busy}
      data-testid="update-banner-reload"
    >{busy ? 'Reloading…' : 'Reload'}</button>
    <button
      type="button"
      class="qa-update-banner-dismiss"
      aria-label="Dismiss update notification"
      onclick={handleDismiss}
    >✕</button>
  </div>
{/if}
