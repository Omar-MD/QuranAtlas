<script lang="ts">
  import type { WirdSummary } from './types'

  type Props = {
    summary: WirdSummary
    onOpen: () => void
  }

  const { summary, onOpen }: Props = $props()

  const nextLabel = $derived(summary.nextRef ? `${summary.nextRef.surah}:${summary.nextRef.verse}` : '')
  const title = $derived.by(() => {
    if (summary.state === 'no-plan') { return 'Start daily wird' }
    if (summary.state === 'today-complete') { return 'Today complete' }
    if (summary.state === 'plan-complete') { return 'Plan complete' }
    if (summary.state === 'behind-target') { return 'Adjusted today' }
    return 'Today'
  })
</script>

<button
  type="button"
  class="qa-wird-card"
  data-testid="wird-card"
  onclick={onOpen}
>
  <span class="qa-wird-card-top">
    <span class="qa-wird-card-title">{title}</span>
    {#if summary.state !== 'no-plan'}
      <span class="qa-wird-card-pct">{summary.todayPercent}%</span>
    {/if}
  </span>

  {#if summary.state !== 'no-plan'}
    <span
      class="qa-wird-card-bar"
      role="progressbar"
      aria-label="Daily wird progress"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={summary.todayPercent}
    >
      <i style={`inline-size: ${summary.todayPercent}%`}></i>
    </span>
  {/if}

  <span class="qa-wird-card-main">
    {#if nextLabel}
      <span class="qa-wird-card-ref">{nextLabel}</span>
    {/if}
    <span class="qa-wird-card-range">{summary.todayRangeLabel}</span>
  </span>

  <span class="qa-wird-card-sub">
    {summary.remainingLabel}
    {#if summary.reminderLabel}
      <span class="qa-wird-card-reminder">{summary.reminderLabel}</span>
    {/if}
  </span>
</button>
