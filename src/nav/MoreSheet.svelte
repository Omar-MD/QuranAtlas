<script lang="ts">
  /**
   * MoreSheet — first-level parent sheet from the dock's ⋯ button.
   * Entries: Settings · Review hub · Surah list · About · Clear data.
   */
  import { onMount } from 'svelte'
  import { openSettingsSheet } from '../settings/panel-bridge'
  import { showClearDataConfirmation } from '../settings/clear-data'
  import { registerMoreSheet } from './more-sheet-bridge'

  let isOpen = $state(false)

  export function open(): void {
    isOpen = true
  }

  export function close(): void {
    isOpen = false
  }

  type Entry = {
    icon: string
    label: string
    meta: string
    danger?: boolean
    onClick: () => void
  }

  const entries: Entry[] = [
    { icon: 'Aa', label: 'Settings',      meta: 'Theme · font · translation',       onClick: () => { close(); openSettingsSheet() } },
    { icon: '\u2726', label: 'Review hub',    meta: 'All your marks',                   onClick: () => { close(); window.location.hash = '#/review' } },
    { icon: '\u2630', label: 'Surah list',    meta: 'Browse all 114 surahs',            onClick: () => { close(); window.location.hash = '#/surahs' } },
    { icon: '\u24D8', label: 'About',         meta: 'Credits · version',                onClick: () => { close(); window.location.hash = '#/about' } },
    { icon: '\u232B', label: 'Clear data',    meta: 'Remove all marks and settings',    danger: true, onClick: () => { close(); showClearDataConfirmation() } },
  ]

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { close() }
  }

  onMount(() => {
    registerMoreSheet(open)
  })
</script>

{#if isOpen}
  <button type="button" class="qa-sheet-backdrop" aria-label="Close" onclick={close}></button>
  <div
    class="qa-sheet qa-sheet--bottom"
    role="dialog"
    aria-modal="true"
    aria-label="More"
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    <div class="qa-sheet-grip" aria-hidden="true"></div>
    <div class="qa-sheet-hdr">
      <div class="qa-sheet-title">More</div>
      <button type="button" class="qa-sheet-close" aria-label="Close" onclick={close}>&#x2715;</button>
    </div>
    <div class="qa-sheet-body">
      {#each entries as entry (entry.label)}
        <button
          type="button"
          class="qa-sheet-row"
          class:qa-sheet-row--danger={entry.danger}
          onclick={entry.onClick}
        >
          <span class="qa-sheet-row-icon">{entry.icon}</span>
          <span class="qa-sheet-row-body">
            <span class="qa-sheet-row-label">{entry.label}</span>
            <span class="qa-sheet-row-meta">{entry.meta}</span>
          </span>
        </button>
      {/each}
    </div>
  </div>
{/if}
