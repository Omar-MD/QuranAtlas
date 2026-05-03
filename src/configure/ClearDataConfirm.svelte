<script lang="ts">
  import { onMount } from 'svelte'
  import { registerClearDataConfirm, clearAllData } from './clear-data.ts'
  import { announce } from '../a11y/announcer.js'

  let open = $state(false)
  let confirmText = $state('')
  let resolvePromise: ((val: boolean) => void) | null = null
  let inputEl: HTMLInputElement | null = $state(null)

  const canConfirm = $derived(confirmText.trim() === 'DELETE')

  function showConfirm(): Promise<boolean> {
    confirmText = ''
    open = true
    return new Promise((resolve) => {
      resolvePromise = resolve
      // Focus the input after the DOM updates
      Promise.resolve().then(() => {
        inputEl?.focus()
        announce('Clear data confirmation dialog opened. Type DELETE to confirm clearing all data.')
      })
    })
  }

  function cancel() {
    open = false
    confirmText = ''
    resolvePromise?.(false)
    resolvePromise = null
  }

  async function confirm() {
    if (confirmText.trim() !== 'DELETE') { return }
    open = false
    confirmText = ''
    const cb = resolvePromise
    resolvePromise = null
    const success = await clearAllData()
    cb?.(success)
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { cancel() }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) { cancel() }
  }

  onMount(() => {
    registerClearDataConfirm(showConfirm)
  })
</script>

{#if open}
  <div
    class="qa-modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="presentation"
  >
    <div
      class="qa-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-data-title"
      tabindex="-1"
    >
      <h2 id="clear-data-title">Clear All Data?</h2>
      <p>This will permanently delete all saved reading positions, marks, and settings. This action cannot be undone.</p>
      <p id="clear-warning" class="qa-warning-text">Type DELETE to confirm:</p>
      <input
        bind:this={inputEl}
        bind:value={confirmText}
        type="text"
        class="qa-input qa-input-confirm"
        aria-labelledby="clear-warning"
        placeholder="DELETE"
      />
      <div class="qa-modal-actions">
        <button
          type="button"
          class="qa-mark-btn qa-mark-btn--ghost"
          onclick={cancel}
        >Cancel</button>
        <button
          type="button"
          class="qa-mark-btn qa-mark-btn--danger-primary"
          disabled={!canConfirm}
          aria-describedby="clear-warning"
          onclick={confirm}
        >Clear All Data</button>
      </div>
    </div>
  </div>
{/if}
