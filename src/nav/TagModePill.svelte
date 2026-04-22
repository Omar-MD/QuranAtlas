<script lang="ts">
  /**
   * Top-right "● Tag mode" pill — visible while a tag session is active
   * on reader route. Desktop only (mobile surfaces the state via header).
   * Tap ends session.
   */

  import { tagSession } from '../state/tag-session.svelte'

  const visible = $derived.by(() => {
    return !!tagSession.verseKey && (tagSession.quickbarOpen || tagSession.sheetOpen)
  })

  function exit(): void {
    tagSession.end()
  }
</script>

{#if visible}
  <button
    type="button"
    class="qa-tag-pill"
    onclick={exit}
    aria-label="Exit tag mode"
  >
    <span class="qa-tag-dot" aria-hidden="true"></span>
    Tag mode
  </button>
{/if}

<style>
  .qa-tag-pill {
    position: fixed;
    top: 18px;
    right: 20px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px 7px 12px;
    border-radius: 999px;
    border: 1px solid var(--qa-ambient-border);
    background: var(--qa-ambient-surface);
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    z-index: 140;
  }
  .qa-tag-pill:hover { border-color: var(--qa-ambient-accent); }
  .qa-tag-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #15803d;
    box-shadow: 0 0 0 2px color-mix(in srgb, #15803d 28%, transparent);
  }
  :global(html[data-theme="dark"]) .qa-tag-dot {
    background: #86efac;
    box-shadow: 0 0 0 2px color-mix(in srgb, #86efac 30%, transparent);
  }

  @media (max-width: 1179px) {
    .qa-tag-pill { display: none; }
  }
</style>
