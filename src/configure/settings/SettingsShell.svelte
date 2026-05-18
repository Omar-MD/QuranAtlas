<script lang="ts">
  import ThemeNightControls from './ThemeNightControls.svelte'

  type CloseOptions = { restoreFocus?: boolean }

  interface Props {
    title: string
    subtitle: string
    close: (options?: CloseOptions) => void
    children?: import('svelte').Snippet
  }

  const { title, subtitle, close, children }: Props = $props()

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
    <div>
      <h2 id="qa-settings-title" class="qa-settings-shell-title">{title}</h2>
      <p class="qa-settings-shell-subtitle">{subtitle}</p>
    </div>
    <button type="button" class="qa-settings-shell-close" aria-label="Close settings" onclick={() => close()}>x</button>
  </header>

  <div class="qa-settings-shell-body">
    {@render children?.()}
  </div>

  <footer class="qa-settings-shell-foot">
    <ThemeNightControls />
    <button type="button" class="qa-settings-manage-assets" onclick={goAssets}>Manage Assets</button>
  </footer>
</div>
