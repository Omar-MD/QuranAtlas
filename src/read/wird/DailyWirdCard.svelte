<script lang="ts">
  import type { WirdSummary } from './types'

  type Props = {
    summary: WirdSummary
    onOpen: () => void
  }

  const { summary, onOpen }: Props = $props()

  const nextLabel = $derived(summary.nextRef ? `${summary.nextRef.surah}:${summary.nextRef.verse}` : '')
  const rangeLabel = $derived.by(() => {
    if (summary.state === 'no-plan') { return 'Create a plan to build a consistent rhythm.' }
    if (!nextLabel) { return summary.remainingLabel }
    return summary.todayRangeLabel.startsWith(nextLabel) ? summary.todayRangeLabel : `${nextLabel} ${summary.todayRangeLabel}`
  })
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
  class:qa-wird-card--complete={summary.state === 'today-complete' || summary.state === 'plan-complete'}
  class:qa-wird-card--setup={summary.state === 'no-plan'}
  data-testid="wird-card"
  onclick={onOpen}
>
  <span class="qa-wird-card-main">
    <span class="qa-wird-card-status-badge" aria-hidden="true">
      <svg data-icon="wird-book" viewBox="0 0 24 24" fill="none">
        <path d="M5.8 5.8h4.6c1.4 0 2.6 1.1 2.6 2.6v9.8c0-1.2-1.1-2.1-2.6-2.1H5.8V5.8Z" />
        <path d="M18.2 5.8h-4.6c-1.4 0-2.6 1.1-2.6 2.6v9.8c0-1.2 1.1-2.1 2.6-2.1h4.6V5.8Z" />
      </svg>
    </span>
    <span class="qa-wird-card-copy">
      <span class="qa-wird-card-head">
        <span class="qa-wird-card-kicker">{title}</span>
      </span>

      <span class="qa-wird-card-line">
        <span class="qa-wird-card-range">{rangeLabel}</span>
      </span>

      {#if nextLabel}
        <span class="qa-wird-card-meta">{summary.remainingLabel}</span>
      {/if}
    </span>

    <span class="qa-wird-card-end">
      {#if summary.state !== 'no-plan'}
        <span
          class="qa-wird-card-meter"
          role="progressbar"
          aria-label="Daily wird progress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={summary.todayPercent}
          style={`--qa-wird-card-progress: ${summary.todayPercent * 3.6}deg`}
        >
          <span class="qa-wird-card-pct">{summary.todayPercent}%</span>
        </span>
      {/if}
      <span class="qa-wird-card-chev" aria-hidden="true">&#x203A;</span>
    </span>
  </span>

  {#if summary.reminderLabel}
    <span class="qa-wird-card-reminder-row">
      <span class="qa-wird-card-reminder-icon" aria-hidden="true">○</span>
      <span class="qa-wird-card-reminder">{summary.reminderLabel}</span>
    </span>
  {/if}
</button>
