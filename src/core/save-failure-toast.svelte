<script lang="ts">

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
