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
      announce('Storage is running low. Visit Settings to free up space.')
    })
    const unsub2 = on(Events.STORAGE_QUOTA_WARNING, async () => {
      if (visible) return
      try {
        const suppressed = await get('settings', SUPPRESS_KEY)
        if (suppressed?.value) return
      } catch { /* still show */ }
      dismissible = true
      visible = true
      announce('Storage is running low. Visit Settings to free up space.')
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
    <a href="#/settings" class="qa-quota-banner-link">Free up space in Settings.</a>
    {#if dismissible}
      <button class="qa-quota-banner-dismiss" onclick={handleDismiss}>Don't show again</button>
    {/if}
  </div>
{/if}

<style>
  .qa-quota-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: var(--qa-z-sheet);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: calc(env(safe-area-inset-top) + 10px) 14px 10px;
    background: var(--qa-bg-error);
    border-bottom: 1px solid var(--qa-border-error);
    color: var(--qa-text-error);
    font-size: var(--qa-text-size-meta);
    line-height: 1.4;
    box-shadow: var(--qa-shadow-sm);
  }
  .qa-quota-banner-link {
    color: var(--qa-text-error);
    text-decoration: underline;
    font-weight: 600;
  }
  .qa-quota-banner-link:hover,
  .qa-quota-banner-link:focus-visible {
    color: var(--qa-text-error);
    text-decoration-thickness: 2px;
  }
  .qa-quota-banner-dismiss {
    margin-left: auto;
    padding: 4px 10px;
    border: 1px solid var(--qa-border-error);
    border-radius: var(--qa-radius-sm);
    background: transparent;
    color: var(--qa-text-error);
    font: inherit;
    font-size: var(--qa-text-size-meta);
    font-weight: 500;
    cursor: pointer;
  }
  .qa-quota-banner-dismiss:hover,
  .qa-quota-banner-dismiss:focus-visible {
    background: color-mix(in srgb, var(--qa-text-error) 8%, transparent);
  }
</style>
