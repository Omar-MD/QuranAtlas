<script lang="ts">
  // Surfaces silent persistence failures as a brief, dismissible toast.
  // Audit R-14 / C-7 / CC-10 (2026-04-29) flagged seven failure events
  // that emitted but had no listener — the user never learned that a
  // mark / bookmark / position write or a router navigation had failed.
  // Mirrors the dismissible-toast shape of core/quota-banner.svelte so
  // we don't grow yet another bespoke chrome component.
  //
  // The toast auto-clears after AUTO_DISMISS_MS so a single transient
  // failure doesn't stick. Subsequent failures replace the existing
  // toast (latest takes the surface). Mounted persistently in App.svelte.

  import { on } from './events'
  import { Events } from './constants'
  import { announce } from '../a11y/announcer'

  const AUTO_DISMISS_MS = 6000

  let message = $state<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  function show(text: string): void {
    message = text
    announce(text)
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => { message = null; timer = null }, AUTO_DISMISS_MS)
  }

  function dismiss(): void {
    message = null
    if (timer !== null) { clearTimeout(timer); timer = null }
  }

  $effect(() => {
    const unsubs: Array<() => void> = []
    unsubs.push(on(Events.MARKS_SAVE_FAILED, () => {
      show("Couldn't save tag. Please try again.")
    }))
    unsubs.push(on(Events.BOOKMARKS_SAVE_FAILED, () => {
      show("Couldn't save bookmark. Please try again.")
    }))
    unsubs.push(on(Events.EDGES_SAVE_FAILED, () => {
      show("Couldn't save edge. Please try again.")
    }))
    unsubs.push(on(Events.READER_POSITION_SAVE_FAILED, () => {
      show("Couldn't save reading position.")
    }))
    unsubs.push(on(Events.DB_DELETE_BLOCKED, () => {
      show('Database is busy. Please close other tabs and reload.')
    }))
    unsubs.push(on(Events.APP_INIT_ERROR, () => {
      show('App failed to initialise. Please reload.')
    }))
    unsubs.push(on(Events.ROUTER_ROUTE_ERROR, () => {
      show("Couldn't open that route.")
    }))
    return () => {
      for (const u of unsubs) u()
      if (timer !== null) { clearTimeout(timer); timer = null }
    }
  })
</script>

{#if message}
  <div class="qa-save-failure-toast" role="alert" aria-live="polite">
    <span>{message}</span>
    <button type="button" class="qa-save-failure-toast-dismiss" onclick={dismiss} aria-label="Dismiss">×</button>
  </div>
{/if}

<style>
  .qa-save-failure-toast {
    position: fixed;
    bottom: max(env(safe-area-inset-bottom), 16px);
    left: 50%;
    transform: translateX(-50%);
    max-width: min(560px, calc(100vw - 32px));
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--qa-surface-raised, #2a2a2a);
    color: var(--qa-text-primary, #fff);
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    z-index: 90;
    font-size: 0.875rem;
  }

  .qa-save-failure-toast-dismiss {
    background: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    padding: 0 4px;
  }
</style>
