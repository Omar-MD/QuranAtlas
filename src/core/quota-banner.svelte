<script lang="ts">
  import { on } from './events'
  import { Events } from './constants'
  import { get, put } from './db'
  import { announce } from '../a11y/announcer'

  const SUPPRESS_KEY = 'quota-warning-suppressed'
  let visible = $state(false)
  let dismissible = $state(true)

  $effect(() => {
    const unsub1 = on(Events.DB_QUOTA_EXCEEDED, () => {
      // Non-dismissible — always show (replace any existing warning banner)
      dismissible = false
      visible = true
      announce('Storage is running low. Open Asset Management to free up space.')
    })
    const unsub2 = on(Events.STORAGE_QUOTA_WARNING, async () => {
      if (visible) return
      try {
        const suppressed = await get('settings', SUPPRESS_KEY)
        if (suppressed?.value) return
      } catch { /* still show */ }
      dismissible = true
      visible = true
      announce('Storage is running low. Open Asset Management to free up space.')
    })
    return () => { unsub1(); unsub2() }
  })

  async function handleDismiss() {
    await put('settings', { key: SUPPRESS_KEY, value: true })
    visible = false
  }
</script>

{#if visible}
  <div class="qa-quota-banner" role="alert" aria-live="assertive">
    <span>Storage is running low. </span>
    <a href="#/assets" class="qa-quota-banner-link">Free up space in Asset Management.</a>
    {#if dismissible}
      <button class="qa-quota-banner-dismiss" onclick={handleDismiss}>Don't show again</button>
    {/if}
  </div>
{/if}
