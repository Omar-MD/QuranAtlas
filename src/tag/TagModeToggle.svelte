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

