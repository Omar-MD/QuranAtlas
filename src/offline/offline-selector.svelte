<script lang="ts">
  /**
   * Per-feature offline opt-in selector (N21).
   *
   * Rendered as a single collapsible inside Settings → Storage. Default
   * collapsed: shows a one-line summary of cached / quota usage. Tap the
   * header to expand the inline category list + Apply control. Expansion
   * animates via CSS grid-template-rows so the panel doesn't measure height
   * in JS — outer panel chrome (preview, theme footer) stays put.
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
    startCategoryDownload,
  } from '../data/offline.ts'
  import type { Category } from '../core/sw/route-defs'

  type Row = {
    cat: Category
    label: string
    short: string
    sub: string
    gatedAt: string | null
  }

  const ROWS: Row[] = [
    { cat: 'text',   label: 'Text · Qurʾān corpus', short: 'Text',   sub: 'All riwayat + Saheeh translation',      gatedAt: null   },
    { cat: 'audio',  label: 'Audio · per reciter',  short: 'Audio',  sub: 'Recitation MP3s + word-timing JSON',    gatedAt: 'v2.0' },
    { cat: 'pages',  label: 'Pages · per riwāyah',  short: 'Pages',  sub: 'KFGQPC Mushaf page-image cuts',         gatedAt: 'v2.1' },
    { cat: 'search', label: 'Search index',         short: 'Search', sub: 'Full-text Arabic + translation search', gatedAt: 'v1.1' },
  ]

  let open = $state(false)
  let bytesByCat = $state<Record<Category, number>>({ text: 0, audio: 0, pages: 0, search: 0 })
  let availableByCat = $state<Record<Category, boolean>>({ text: false, audio: false, pages: false, search: false })
  let pending = $state<OfflineCategoriesState>(
    structuredClone($state.snapshot(settings.offlineCategories ?? DEFAULT_OFFLINE_CATEGORIES))
  )
  let storageBudget = $state<{ usage: number; quota: number; available: number } | null>(null)
  let busy  = $state(false)
  let saved = $state(false)
  let errorMsg = $state<string | null>(null)

  const fmt = (bytes: number): string => {
    if (bytes <= 0) return '—'
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    return `${(mb / 1024).toFixed(1)} GB`
  }

  function isCategoryChecked(cat: Category): boolean {
    if (cat === 'text') {
      const t = pending.text
      return t.hafs && t.warsh && t.qaloon
    }
    if (cat === 'search') return pending.search
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
    saved = false
  }

  function isCategoryCheckedIn(state: OfflineCategoriesState | undefined, cat: Category): boolean {
    if (!state) return false
    if (cat === 'text') return state.text.hafs && state.text.warsh && state.text.qaloon
    if (cat === 'search') return state.search
    const map = cat === 'audio' ? state.audio : state.pages
    return Object.values(map).some(Boolean)
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

  const cachedNames = $derived(
    ROWS
      .filter(r => isCategoryCheckedIn(settings.offlineCategories, r.cat))
      .map(r => r.short)
  )

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
    saved = false
    busy = true
    try {
      await setOfflineCategories(pending)
      const toDownload: Category[] = []
      for (const r of ROWS) {
        if (isCategoryChecked(r.cat) && availableByCat[r.cat]) toDownload.push(r.cat)
      }
      for (const cat of toDownload) {
        await startCategoryDownload(cat)
      }
      await refreshBudget()
      saved = true
      setTimeout(() => { saved = false }, 1500)
    } catch (error) {
      errorMsg = (error as Error).message ?? 'Failed to update offline categories'
    } finally {
      busy = false
    }
  }

  function toggleOpen() { open = !open }
</script>

<section
  class="qa-settings-sect qa-storage"
  class:qa-storage--open={open}
  data-testid="storage-section"
  aria-labelledby="qa-storage-hdr"
>
  <button
    type="button"
    class="qa-storage-summary"
    onclick={toggleOpen}
    aria-expanded={open}
    aria-controls="qa-storage-body"
    data-testid="storage-toggle"
  >
    <span id="qa-storage-hdr" class="qa-settings-sect-name">Storage</span>
    <span class="qa-storage-summary-meta">
      {#if cachedNames.length === 0}
        <span class="qa-storage-summary-hint">Cache content for offline use</span>
      {:else}
        <span class="qa-storage-summary-count">{cachedNames.join(' · ')} cached</span>
      {/if}
    </span>
    <span class="qa-storage-summary-chev" aria-hidden="true">›</span>
  </button>

  <div class="qa-storage-collapsible" data-open={open}>
    <div
      id="qa-storage-body"
      class="qa-storage-body"
      role="region"
      aria-label="Offline content selector"
    >
      <ul class="qa-storage-rows" role="list">
        {#each ROWS as row (row.cat)}
          {@const gated = !availableByCat[row.cat]}
          <li class="qa-storage-row" class:qa-storage-row--gated={gated} data-testid="storage-row-{row.cat}">
            <div class="qa-storage-row-main">
              <span class="qa-storage-row-label">{row.label}</span>
              <span class="qa-storage-row-sub">{row.sub}</span>
            </div>
            {#if gated}
              <span class="qa-storage-row-gated" data-testid="storage-row-gated-{row.cat}">{row.gatedAt}</span>
            {:else}
              <label class="qa-storage-checkrow" data-testid="storage-checkrow-{row.cat}">
                <span class="qa-storage-row-size">{fmt(bytesByCat[row.cat])}</span>
                <input
                  type="checkbox"
                  checked={isCategoryChecked(row.cat)}
                  onchange={(e) => setCategoryChecked(row.cat, (e.currentTarget as HTMLInputElement).checked)}
                  data-testid="storage-check-{row.cat}"
                />
              </label>
            {/if}
          </li>
        {/each}
      </ul>

      <div class="qa-storage-footer">
        <button
          type="button"
          class="qa-storage-apply"
          class:qa-storage-apply--saved={saved}
          disabled={!hasDiff || quotaShortfall > 0 || busy}
          onclick={handleApply}
          data-testid="storage-apply"
        >{busy ? 'Saving…' : saved ? 'Saved ✓' : 'Apply'}</button>
        {#if quotaShortfall > 0}
          <p class="qa-storage-err" data-testid="storage-quota-err">
            Need {fmt(quotaShortfall)} more free space.
          </p>
        {/if}
        {#if errorMsg}
          <p class="qa-storage-err" data-testid="storage-err">{errorMsg}</p>
        {/if}
      </div>
    </div>
  </div>
</section>

<style>
  /* Storage section — single collapsible, themed against the on-sheet
     tokens the rest of the Settings panel uses. Expansion animates via
     grid-template-rows so layout doesn't bounce as content height changes. */

  .qa-storage {
    gap: 0;
  }

  .qa-storage-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    width: 100%;
    padding: 0.45rem 0;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    color: inherit;
    font: inherit;
    min-height: 36px;
  }

  .qa-storage-summary:hover .qa-storage-summary-chev,
  .qa-storage-summary:focus-visible .qa-storage-summary-chev {
    color: var(--qa-accent);
  }

  .qa-storage-summary-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: flex-end;
    overflow: hidden;
  }

  .qa-storage-summary-hint,
  .qa-storage-summary-count {
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    color: var(--qa-text-on-sheet-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .qa-storage-summary-count {
    color: var(--qa-accent);
    font-weight: 600;
  }

  .qa-storage-summary-chev {
    font-size: 1rem;
    color: var(--qa-text-on-sheet-dim);
    transition: transform 0.18s ease, color var(--qa-transition-base);
    flex-shrink: 0;
  }

  .qa-storage--open .qa-storage-summary-chev {
    transform: rotate(90deg);
    color: var(--qa-accent);
  }

  /* Grid-row animation — collapsible expands/contracts smoothly without
     reading scrollHeight. The inner wrapper carries overflow:hidden so
     content clips during the transition. */
  .qa-storage-collapsible {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.22s ease;
  }

  .qa-storage-collapsible[data-open='true'] {
    grid-template-rows: 1fr;
  }

  .qa-storage-body {
    overflow: hidden;
    min-height: 0;
  }

  .qa-storage-collapsible[data-open='true'] .qa-storage-body {
    padding-top: 0.45rem;
    padding-bottom: 0.15rem;
  }

  /* Inline rows — name + size + checkbox on one line per category */

  .qa-storage-rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid color-mix(in srgb, var(--qa-accent) 22%, transparent);
    border-radius: var(--qa-radius-sm);
    overflow: hidden;
    background: color-mix(in srgb, var(--qa-accent) 4%, transparent);
  }

  .qa-storage-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0.7rem;
  }

  .qa-storage-row + .qa-storage-row {
    border-top: 1px solid color-mix(in srgb, var(--qa-accent) 14%, transparent);
  }

  .qa-storage-row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
  }

  .qa-storage-row-label {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--qa-text-on-sheet);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .qa-storage-row-sub {
    font-size: 0.66rem;
    color: var(--qa-text-on-sheet-muted);
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .qa-storage-row--gated .qa-storage-row-label,
  .qa-storage-row--gated .qa-storage-row-sub {
    color: var(--qa-text-on-sheet-dim);
  }

  .qa-storage-row-size {
    color: var(--qa-text-on-sheet-dim);
    font-variant-numeric: tabular-nums;
    font-size: 0.7rem;
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  .qa-storage-row-gated {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--qa-text-on-sheet-dim);
    font-style: italic;
    flex-shrink: 0;
  }

  .qa-storage-checkrow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  .qa-storage-checkrow input {
    accent-color: var(--qa-accent);
    width: 15px;
    height: 15px;
    cursor: pointer;
    flex-shrink: 0;
  }

  /* Footer — apply CTA + error messages */

  .qa-storage-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.55rem;
    padding-top: 0.55rem;
  }

  .qa-storage-err {
    flex-basis: 100%;
    margin: 0;
    color: var(--qa-text-danger);
    font-size: 0.7rem;
  }

  .qa-storage-apply {
    border: 1px solid color-mix(in srgb, var(--qa-accent) 45%, transparent);
    border-radius: var(--qa-radius-pill);
    padding: 0.3rem 0.95rem;
    background: transparent;
    color: var(--qa-accent);
    cursor: pointer;
    font: inherit;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    flex-shrink: 0;
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

  .qa-storage-apply--saved {
    background: var(--qa-accent);
    color: var(--qa-text-on-accent);
    border-color: var(--qa-accent);
    opacity: 1;
  }
</style>
