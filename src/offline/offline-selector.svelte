<script lang="ts">
  /**
   * Per-feature offline opt-in selector (N21).
   *
   * Mounts in Settings → Storage. Categories rendered as accordion rows
   * (native <details>) with byte estimates from the verified manifest.
   * Apply button gates on a pre-flight quota check (audit Q4 — refuse
   * before starting a download that won't fit).
   */

  import { onMount } from 'svelte'
  import { settings } from '../settings/state.svelte.ts'
  import {
    DEFAULT_OFFLINE_CATEGORIES,
    type OfflineCategoriesState,
  } from '../settings/state.svelte.ts'
  import { setOfflineCategories } from '../settings/offline-categories.ts'
  import {
    getCategoryManifest,
    getStorageBudget,
    isCategoryAvailable,
    startCategoryDownload,
  } from '../data/offline.ts'
  import type { Category } from '../core/sw/route-defs'

  type Row = {
    cat: Category
    label: string
    sub: string
    gatedAt: string | null   // version label or null when un-gated
  }

  const ROWS: Row[] = [
    { cat: 'text',   label: 'Text · Qurʾān corpus',  sub: 'All riwayat + Saheeh translation',                gatedAt: null },
    { cat: 'audio',  label: 'Audio · per reciter',             sub: 'Recitation MP3s + word-timing JSON',              gatedAt: 'v2.0' },
    { cat: 'pages',  label: 'Pages · per riwāyah',             sub: 'KFGQPC Mushaf page-image cuts',                   gatedAt: 'v2.1' },
    { cat: 'search', label: 'Search index',                    sub: 'Full-text Arabic + translation search',           gatedAt: 'v1.1' },
  ]

  let bytesByCat = $state<Record<Category, number>>({ text: 0, audio: 0, pages: 0, search: 0 })
  let availableByCat = $state<Record<Category, boolean>>({ text: false, audio: false, pages: false, search: false })
  let pending = $state<OfflineCategoriesState>(structuredClone($state.snapshot(settings.offlineCategories ?? DEFAULT_OFFLINE_CATEGORIES)))
  let storageBudget = $state<{ usage: number; quota: number; available: number } | null>(null)
  let busy = $state(false)
  let errorMsg = $state<string | null>(null)

  const fmt = (bytes: number): string => {
    if (bytes <= 0) return '—'
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`
    return `${mb.toFixed(1)} MB`
  }

  function isCategoryChecked(cat: Category): boolean {
    if (cat === 'text') {
      const t = pending.text
      return t.hafs && t.warsh && t.qaloon
    }
    if (cat === 'search') return pending.search
    // audio + pages: any item checked. v1 selector only writes the `_all`
    // sentinel until consumer features ship and add per-item rows.
    const map = cat === 'audio' ? pending.audio : pending.pages
    return Object.values(map).some(Boolean)
  }

  function setCategoryChecked(cat: Category, checked: boolean): void {
    const next = structuredClone($state.snapshot(pending))
    if (cat === 'text') {
      next.text = { hafs: checked, warsh: checked, qaloon: checked }
    } else if (cat === 'search') {
      next.search = checked
    } else if (cat === 'audio') {
      next.audio = checked ? { _all: true } : {}
    } else if (cat === 'pages') {
      next.pages = checked ? { _all: true } : {}
    }
    pending = next
  }

  const totalNewBytes = $derived(
    ROWS.reduce((sum, r) => {
      const wasChecked = isCategoryCheckedIn(settings.offlineCategories, r.cat)
      const nowChecked = isCategoryChecked(r.cat)
      return nowChecked && !wasChecked ? sum + bytesByCat[r.cat] : sum
    }, 0)
  )

  const hasDiff = $derived(
    ROWS.some(r => isCategoryCheckedIn(settings.offlineCategories, r.cat) !== isCategoryChecked(r.cat))
  )

  const quotaShortfall = $derived(
    storageBudget && totalNewBytes > storageBudget.available
      ? totalNewBytes - storageBudget.available
      : 0
  )

  function isCategoryCheckedIn(state: OfflineCategoriesState | undefined, cat: Category): boolean {
    if (!state) return false
    if (cat === 'text') return state.text.hafs && state.text.warsh && state.text.qaloon
    if (cat === 'search') return state.search
    const map = cat === 'audio' ? state.audio : state.pages
    return Object.values(map).some(Boolean)
  }

  async function refreshBytes(): Promise<void> {
    for (const cat of ['text', 'audio', 'pages', 'search'] as Category[]) {
      try {
        const { totalBytes } = await getCategoryManifest(cat)
        bytesByCat[cat] = totalBytes
        availableByCat[cat] = totalBytes > 0
      } catch {
        bytesByCat[cat] = 0
        availableByCat[cat] = false
      }
    }
  }

  async function refreshBudget(): Promise<void> {
    storageBudget = await getStorageBudget()
  }

  onMount(() => {
    refreshBytes()
    refreshBudget()
  })

  async function handleApply(): Promise<void> {
    if (!hasDiff || busy) return
    if (quotaShortfall > 0) return
    errorMsg = null
    busy = true
    try {
      await setOfflineCategories(pending)
      const newlyChecked = ROWS.filter(r =>
        !isCategoryCheckedIn(settings.offlineCategories, r.cat) === false
        && isCategoryChecked(r.cat)
        && availableByCat[r.cat]
      )
      // Re-derive: new categories that flipped to true since last apply.
      // settings.offlineCategories is now the new state (just persisted),
      // so compute against the original pre-apply snapshot via diff helper.
      // Simplification: download every category that pending says is on
      // and that has manifest entries — handleCacheDataset is idempotent
      // (SHA-256 verify on cached entry skips re-downloads).
      const toDownload: Category[] = []
      for (const r of ROWS) {
        if (isCategoryChecked(r.cat) && availableByCat[r.cat]) toDownload.push(r.cat)
      }
      void newlyChecked   // silence lint
      for (const cat of toDownload) {
        await startCategoryDownload(cat)
      }
      await refreshBudget()
    } catch (error) {
      errorMsg = (error as Error).message ?? 'Failed to update offline categories'
    } finally {
      busy = false
    }
  }
</script>

<section
  class="qa-settings-sect qa-storage"
  data-testid="storage-section"
  aria-labelledby="qa-storage-hdr"
>
  <div class="qa-settings-sect-hdr">
    <span id="qa-storage-hdr" class="qa-settings-sect-name">Storage</span>
  </div>

  <div class="qa-storage-rows">
    {#each ROWS as row (row.cat)}
      {@const gated = !availableByCat[row.cat]}
      <details
        class="qa-storage-row"
        class:qa-storage-row--gated={gated}
        data-testid="storage-row-{row.cat}"
      >
        <summary class="qa-storage-row-hdr">
          <span class="qa-storage-row-label">{row.label}</span>
          <span class="qa-storage-row-size">
            {#if gated}{row.gatedAt ?? '—'} · gated{:else}{fmt(bytesByCat[row.cat])}{/if}
          </span>
        </summary>
        <div class="qa-storage-row-body">
          <p class="qa-storage-row-sub">{row.sub}</p>
          {#if !gated}
            <label class="qa-storage-checkrow">
              <input
                type="checkbox"
                checked={isCategoryChecked(row.cat)}
                onchange={(e) => setCategoryChecked(row.cat, (e.currentTarget as HTMLInputElement).checked)}
                data-testid="storage-check-{row.cat}"
              />
              <span class="qa-storage-checkrow-label">Cache for offline use ({fmt(bytesByCat[row.cat])})</span>
            </label>
          {:else}
            <p class="qa-storage-row-gated">Ships in {row.gatedAt}.</p>
          {/if}
        </div>
      </details>
    {/each}
  </div>

  <div class="qa-storage-footer">
    <div class="qa-storage-budget" data-testid="storage-budget">
      {#if storageBudget}
        Used {fmt(storageBudget.usage)} / {fmt(storageBudget.quota)} quota
      {:else}
        &nbsp;
      {/if}
    </div>
    {#if quotaShortfall > 0}
      <p class="qa-storage-quota-err" data-testid="storage-quota-err">
        Need {fmt(quotaShortfall)} more free space.
      </p>
    {/if}
    {#if errorMsg}
      <p class="qa-storage-err" data-testid="storage-err">{errorMsg}</p>
    {/if}
    <button
      type="button"
      class="qa-storage-apply"
      disabled={!hasDiff || quotaShortfall > 0 || busy}
      onclick={handleApply}
      data-testid="storage-apply"
    >{busy ? 'Caching…' : 'Apply'}</button>
  </div>
</section>

<style>
  /* Storage section — themed against the same on-sheet tokens the rest of
     the Settings panel uses so it inherits the parchment/sepia/dark
     surfaces in lockstep with theme swaps. */

  .qa-storage-rows {
    display: flex;
    flex-direction: column;
    border: 1px solid color-mix(in srgb, var(--qa-accent) 22%, transparent);
    border-radius: var(--qa-radius-sm);
    overflow: hidden;
    background: color-mix(in srgb, var(--qa-accent) 4%, transparent);
  }

  .qa-storage-row + .qa-storage-row {
    border-top: 1px solid color-mix(in srgb, var(--qa-accent) 14%, transparent);
  }

  .qa-storage-row-hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.7rem;
    padding: 0.55rem 0.75rem;
    cursor: pointer;
    list-style: none;
    user-select: none;
    transition: background-color var(--qa-transition-base);
  }

  .qa-storage-row[open] .qa-storage-row-hdr {
    background: color-mix(in srgb, var(--qa-accent) 7%, transparent);
  }

  .qa-storage-row-hdr:hover,
  .qa-storage-row-hdr:focus-visible {
    background: color-mix(in srgb, var(--qa-accent) 9%, transparent);
  }

  .qa-storage-row-hdr::-webkit-details-marker { display: none; }

  .qa-storage-row-label {
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--qa-text-on-sheet);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .qa-storage-row-size {
    color: var(--qa-text-on-sheet-dim);
    font-variant-numeric: tabular-nums;
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  .qa-storage-row-body {
    padding: 0.2rem 0.75rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .qa-storage-row-sub {
    margin: 0;
    font-size: 0.75rem;
    color: var(--qa-text-on-sheet-muted);
    line-height: 1.45;
  }

  .qa-storage-row-gated {
    margin: 0;
    font-size: 0.75rem;
    color: var(--qa-text-on-sheet-dim);
    font-style: italic;
  }

  .qa-storage-row--gated .qa-storage-row-label,
  .qa-storage-row--gated .qa-storage-row-size {
    color: var(--qa-text-on-sheet-dim);
  }

  .qa-storage-row--gated .qa-storage-row-hdr {
    cursor: default;
  }

  .qa-storage-checkrow {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    cursor: pointer;
    font-size: 0.78rem;
    color: var(--qa-text-on-sheet);
  }

  .qa-storage-checkrow input {
    accent-color: var(--qa-accent);
    width: 16px;
    height: 16px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .qa-storage-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    padding-top: 0.2rem;
  }

  .qa-storage-budget {
    flex: 1;
    min-width: 8rem;
    color: var(--qa-text-on-sheet-muted);
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
  }

  .qa-storage-quota-err,
  .qa-storage-err {
    flex-basis: 100%;
    margin: 0;
    color: var(--qa-text-danger);
    font-size: 0.75rem;
  }

  .qa-storage-apply {
    border: 1px solid color-mix(in srgb, var(--qa-accent) 45%, transparent);
    border-radius: var(--qa-radius-pill);
    padding: 0.32rem 0.95rem;
    background: transparent;
    color: var(--qa-accent);
    cursor: pointer;
    font: inherit;
    font-size: 0.74rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    transition:
      background-color var(--qa-transition-base),
      border-color var(--qa-transition-base),
      color var(--qa-transition-base);
  }

  .qa-storage-apply:hover:not(:disabled),
  .qa-storage-apply:focus-visible:not(:disabled) {
    background: var(--qa-accent);
    color: var(--qa-text-on-accent);
    border-color: var(--qa-accent);
  }

  .qa-storage-apply:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
