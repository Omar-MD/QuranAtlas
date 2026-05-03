<script lang="ts">
  /**
   * Desktop /bookmarks page — verse-level list grouped by surah.
   * Mirrors the mobile drawer's Bookmarks sub-tab via the shared BookmarksList.
   * Reachable from the desktop /surahs directory header (★ Bookmarks link).
   */
  import { onMount } from 'svelte'
  import { announce } from '../../a11y/announcer'
  import BookmarksList from './BookmarksList.svelte'
  import { settings } from '../../configure/state.svelte'
  import { getAllForRiwayah } from './store'
  import { on } from '../../core/events'
  import { Events } from '../../core/constants'
  import type { Riwayah } from '../../core/db'

  let count = $state(0)

  async function refreshCount(): Promise<void> {
    const riwayah = (settings.riwayah ?? 'qaloon') as Riwayah
    const all = await getAllForRiwayah(riwayah).catch(() => [])
    count = all.length
  }

  function goBack(): void {
    window.location.hash = '#/surahs'
  }

  onMount(() => {
    void refreshCount()
    announce('Bookmarks')

    const unsubs = [
      on(Events.BOOKMARKS_SAVED, () => { void refreshCount() }),
      on(Events.BOOKMARKS_DELETED, () => { void refreshCount() }),
      on(Events.SYNC_BOOKMARKS_UPDATED, () => { void refreshCount() }),
      on(Events.SETTINGS_RIWAYAH_CHANGED, () => { void refreshCount() }),
    ]
    return () => { for (const u of unsubs) u() }
  })
</script>

<div class="qa-bookmarks-page" data-bookmarks-page="">
  <button
    type="button"
    class="qa-bookmarks-page-back"
    onclick={goBack}
    aria-label="Back to surahs"
  >&#x2190; Surahs</button>

  <header class="qa-bookmarks-page-hdr">
    <h1 class="qa-bookmarks-page-title">Bookmarks</h1>
    <span class="qa-bookmarks-page-count" aria-live="polite">{count} {count === 1 ? 'verse' : 'verses'}</span>
  </header>

  <BookmarksList />
</div>
