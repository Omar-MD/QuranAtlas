<script lang="ts">
  /**
   * Small toggle shown while a tag session is active.
   * Fast = quickbar stays open. Deep → opens full mark editor.
   */
  import { tagSession } from '../state/tag-session.svelte'

  function goDeep(): void {
    const k = tagSession.verseKey
    if (!k) { return }
    tagSession.quickbarOpen = false
    tagSession.sheetOpen = true
  }
</script>

<div class="qa-tagmode" role="group" aria-label="Tag mode">
  <button
    type="button"
    class="qa-tagmode-btn qa-tagmode-btn--on"
    aria-pressed="true"
  >Fast</button>
  <button
    type="button"
    class="qa-tagmode-btn"
    aria-pressed="false"
    onclick={goDeep}
  >Deep →</button>
</div>

<style>
  .qa-tagmode {
    position: fixed;
    right: calc(12px + env(safe-area-inset-right));
    bottom: calc(80px + env(safe-area-inset-bottom));
    display: inline-flex;
    padding: 4px;
    border-radius: 999px;
    background-color: color-mix(in srgb, var(--qa-ambient-surface) 94%, transparent);
    border: 1px solid var(--qa-ambient-border);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 120;
    font-size: 0.75rem;
  }
  .qa-tagmode-btn {
    padding: 5px 11px;
    border-radius: 999px;
    border: none;
    background: transparent;
    color: var(--qa-ambient-dim);
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  .qa-tagmode-btn--on {
    background-color: var(--qa-ambient-accent);
    color: var(--qa-on-accent);
  }
  .qa-tagmode-btn:not(.qa-tagmode-btn--on):hover {
    color: var(--qa-ambient-parchment);
  }

  @media (min-width: 1180px) {
    .qa-tagmode {
      right: 24px;
      bottom: 24px;
    }
  }
</style>
