<script lang="ts">
  type Props = {
    page: number
    pageCount: number
    onNavigate: (page: number) => void
  }

  const { page, pageCount, onNavigate }: Props = $props()

  function go(next: number): void {
    onNavigate(Math.min(pageCount, Math.max(1, next)))
  }

  function commitValue(value: string): void {
    const next = Number.parseInt(value, 10)
    if (Number.isInteger(next)) go(next)
  }

  function onInput(e: Event): void {
    const input = e.currentTarget as HTMLInputElement
    commitValue(input.value)
  }

  function onPageKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Enter') return
    commitValue((e.currentTarget as HTMLInputElement).value)
  }
</script>

<div class="qa-mushaf-controls" aria-label="Mushaf page controls">
  <button
    type="button"
    class="qa-mushaf-control-btn"
    aria-label="Previous page"
    disabled={page <= 1}
    onclick={() => go(page - 1)}
  >
    <span aria-hidden="true">‹</span>
  </button>
  <label class="qa-mushaf-page-field">
    <span class="qa-mushaf-page-label">Page</span>
    <input
      class="qa-mushaf-page-input"
      type="number"
      min="1"
      max={pageCount}
      value={page}
      aria-label="Mushaf page number"
      inputmode="numeric"
      onchange={onInput}
      onblur={onInput}
      onkeydown={onPageKeydown}
    />
    <span class="qa-mushaf-page-total">of {pageCount}</span>
  </label>
  <input
    class="qa-mushaf-scrubber"
    type="range"
    min="1"
    max={pageCount}
    value={page}
    aria-label="Mushaf page scrubber"
    onchange={onInput}
  />
  <button
    type="button"
    class="qa-mushaf-control-btn"
    aria-label="Next page"
    disabled={page >= pageCount}
    onclick={() => go(page + 1)}
  >
    <span aria-hidden="true">›</span>
  </button>
</div>
