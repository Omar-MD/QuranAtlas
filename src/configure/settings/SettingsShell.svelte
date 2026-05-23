<script lang="ts">
  import ThemeNightControls from './ThemeNightControls.svelte'

  type CloseOptions = { restoreFocus?: boolean }

  interface Props {
    title: string
    close: (options?: CloseOptions) => void
    children?: import('svelte').Snippet
  }

  const { title, close, children }: Props = $props()

  function goAssets(): void {
    close({ restoreFocus: false })
    try { sessionStorage.setItem('qa-assets-can-go-back', '1') } catch { /* ignore */ }
    window.location.hash = '#/assets'
  }
</script>

<button type="button" class="qa-settings-backdrop" aria-label="Close settings" onclick={() => close()}></button>
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="qa-settings-title"
  class="qa-settings-shell"
  tabindex="-1"
>
  <header class="qa-settings-shell-head">
    <button type="button" class="qa-settings-shell-done" onclick={() => close()}>Done</button>
    <h2 id="qa-settings-title" class="qa-settings-shell-title">{title}</h2>
    <button type="button" class="qa-settings-shell-close" aria-label="Close settings" onclick={() => close()}>
      <svg viewBox="0 0 24 24" aria-hidden="true" class="qa-settings-shell-close-icon">
        <path d="M6 6 18 18" />
        <path d="M18 6 6 18" />
      </svg>
    </button>
  </header>

  <div class="qa-settings-shell-body">
    <div class="qa-settings-shell-body-inner">
      {@render children?.()}
    </div>
  </div>

  <footer class="qa-settings-shell-foot">
    <div class="qa-settings-shell-foot-inner">
      <ThemeNightControls />
      <button type="button" class="qa-settings-manage-assets" onclick={goAssets}>Manage Assets</button>
    </div>
  </footer>
</div>
