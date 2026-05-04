<script lang="ts">
  import type { GlobalPosition } from '../../configure/state.svelte'
  import type { BrowserNotificationState, WirdPlan, WirdSummary, WirdUnit } from './types'

  export type SetupPayload = {
    targetDays: number | null
    targetEndOn: string | null
    unit: WirdUnit
    startMode: 'current' | 'beginning'
    reminderEnabled: boolean
    reminderTime: string
    browserNotifications: boolean
  }

  type Props = {
    summary: WirdSummary
    currentPosition: GlobalPosition
    onBack: () => void
    onCreate: (payload: SetupPayload) => void
    onContinue: () => void
    onReset: () => void
    onRequestBrowserNotifications: () => void
  }

  const {
    summary,
    currentPosition,
    onBack,
    onCreate,
    onContinue,
    onReset,
    onRequestBrowserNotifications,
  }: Props = $props()

  let targetMode = $state<'preset' | 'custom'>('preset')
  let targetDays = $state<number | null>(null)
  let targetEndOn = $state<string>('')
  let unit = $state<WirdUnit>('juz')
  let startMode = $state<'current' | 'beginning'>('current')
  let reminderEnabled = $state(false)
  let reminderTime = $state('08:00')
  let browserNotifications = $state(false)
  let confirmingReset = $state(false)
  let editing = $state(false)

  const currentRefLabel = $derived(currentPosition ? `${currentPosition.surah}:${currentPosition.verse}` : '1:1')
  const activePlan = $derived(summary.plan)
  const currentNotificationState = $derived<BrowserNotificationState>(
    activePlan?.reminder.browserNotifications ?? 'default',
  )
  const canCreate = $derived(
    (targetMode === 'preset' ? targetDays !== null : targetEndOn.length > 0)
      && (startMode === 'beginning' || currentPosition !== null),
  )

  function loadFromPlan(plan: WirdPlan): void {
    unit = plan.unit
    reminderEnabled = plan.reminder.enabled
    reminderTime = plan.reminder.time
    browserNotifications = plan.reminder.browserNotifications === 'granted'
    targetMode = 'custom'
    targetDays = null
    targetEndOn = plan.targetEndOn
  }

  function startEditing(): void {
    editing = true
    if (activePlan) { loadFromPlan(activePlan) }
  }

  function submitCreate(): void {
    if (!canCreate) { return }
    onCreate({
      targetDays: targetMode === 'preset' ? targetDays : null,
      targetEndOn: targetMode === 'custom' ? targetEndOn : null,
      unit,
      startMode,
      reminderEnabled,
      reminderTime,
      browserNotifications,
    })
  }
</script>

<section class="qa-wird-detail" aria-labelledby="wird-detail-title">
  <div class="qa-wird-detail-head">
    <button type="button" class="qa-wird-back" aria-label="Back" onclick={onBack}>Back</button>
    <h2 id="wird-detail-title" data-testid="wird-detail-title">Daily Wird</h2>
  </div>

  {#if summary.state === 'no-plan' || editing}
    <div class="qa-wird-setup">
      <div class="qa-wird-setup-intro">
        <p class="qa-wird-eyebrow">Plan setup</p>
        <p class="qa-wird-help">Choose a finish target and QuranAtlas will size each daily reading.</p>
      </div>

      <div class="qa-wird-field">
        <div class="qa-wird-field-head">
          <span class="qa-wird-field-label">Completion target</span>
          <span class="qa-wird-field-value">{targetMode === 'custom' ? 'Custom' : targetDays ? `${targetDays} days` : 'Choose'}</span>
        </div>
        <div class="qa-wird-targets" role="group" aria-label="Completion target">
          <button type="button" data-testid="wird-target-7" aria-pressed={targetMode === 'preset' && targetDays === 7} class="qa-wird-option" class:qa-wird-option--on={targetMode === 'preset' && targetDays === 7} onclick={() => { targetMode = 'preset'; targetDays = 7 }}>7 days</button>
          <button type="button" data-testid="wird-target-30" aria-pressed={targetMode === 'preset' && targetDays === 30} class="qa-wird-option" class:qa-wird-option--on={targetMode === 'preset' && targetDays === 30} onclick={() => { targetMode = 'preset'; targetDays = 30 }}>30 days</button>
          <button type="button" data-testid="wird-target-90" aria-pressed={targetMode === 'preset' && targetDays === 90} class="qa-wird-option" class:qa-wird-option--on={targetMode === 'preset' && targetDays === 90} onclick={() => { targetMode = 'preset'; targetDays = 90 }}>90 days</button>
          <button type="button" data-testid="wird-target-custom" aria-pressed={targetMode === 'custom'} class="qa-wird-option" class:qa-wird-option--on={targetMode === 'custom'} onclick={() => { targetMode = 'custom'; targetDays = null }}>Custom date</button>
        </div>

        {#if targetMode === 'custom'}
          <input
            type="date"
            class="qa-wird-input"
            data-testid="wird-finish-date"
            aria-label="Finish date"
            bind:value={targetEndOn}
          />
        {/if}
      </div>

      <div class="qa-wird-field">
        <div class="qa-wird-field-head">
          <span class="qa-wird-field-label">Display unit</span>
          <span class="qa-wird-field-value">{unit}</span>
        </div>
        <div class="qa-wird-units" role="group" aria-label="Display unit">
          {#each ['juz', 'hizb', 'page', 'verse'] as key (key)}
            <button type="button" aria-pressed={unit === key} class="qa-wird-option" class:qa-wird-option--on={unit === key} onclick={() => { unit = key as WirdUnit }}>{key}</button>
          {/each}
        </div>
      </div>

      <div class="qa-wird-field">
        <div class="qa-wird-field-head">
          <span class="qa-wird-field-label">Start point</span>
          <span class="qa-wird-field-value">{startMode === 'current' ? currentRefLabel : '1:1'}</span>
        </div>
        <div class="qa-wird-start" role="group" aria-label="Start point">
          <button type="button" aria-pressed={startMode === 'current'} class="qa-wird-option" class:qa-wird-option--on={startMode === 'current'} onclick={() => { startMode = 'current' }}>Current position <span class="qa-wird-option-ref">{currentRefLabel}</span></button>
          <button type="button" aria-pressed={startMode === 'beginning'} class="qa-wird-option" class:qa-wird-option--on={startMode === 'beginning'} onclick={() => { startMode = 'beginning' }}>Beginning <span class="qa-wird-option-ref">1:1</span></button>
        </div>
      </div>

      <div class="qa-wird-field qa-wird-field--reminder">
        <label class="qa-wird-reminder">
          <input type="checkbox" bind:checked={reminderEnabled} />
          Reminder
        </label>

        {#if reminderEnabled}
          <input type="time" class="qa-wird-input" bind:value={reminderTime} aria-label="Reminder time" />
          {#if currentNotificationState === 'unsupported'}
            <p class="qa-wird-note">In-app reminder only</p>
          {:else if currentNotificationState === 'granted'}
            <p class="qa-wird-note">Browser notifications enabled</p>
          {:else if currentNotificationState === 'denied'}
            <p class="qa-wird-note">Blocked in browser settings</p>
          {:else}
            <button
              type="button"
              class="qa-wird-secondary"
              data-testid="wird-enable-browser-notifications"
              onclick={onRequestBrowserNotifications}
            >
              Enable browser notifications
            </button>
          {/if}
        {/if}
      </div>

      <button type="button" class="qa-wird-primary" data-testid="wird-create" disabled={!canCreate} onclick={submitCreate}>
        {summary.state === 'no-plan' ? 'Create Plan' : 'Save Plan'}
      </button>
    </div>
  {:else}
    <div class="qa-wird-current">
      <p class="qa-wird-range">{summary.todayRangeLabel}</p>
      <p class="qa-wird-remaining">{summary.remainingLabel}</p>
      {#if summary.reminderLabel}
        <p class="qa-wird-reminder-line">{summary.reminderLabel}</p>
      {/if}
      <button type="button" class="qa-wird-primary" data-testid="wird-continue" disabled={summary.state === 'plan-complete'} onclick={onContinue}>
        {summary.state === 'plan-complete' ? 'Plan complete' : 'Continue Wird'}
      </button>
      <button type="button" class="qa-wird-secondary" data-testid="wird-edit" onclick={startEditing}>Edit Plan</button>
      <button type="button" class="qa-wird-danger" data-testid="wird-reset" onclick={() => { confirmingReset = true }}>Reset Plan</button>
      {#if confirmingReset}
        <button type="button" class="qa-wird-danger" data-testid="wird-reset-confirm" onclick={onReset}>Confirm reset</button>
      {/if}
    </div>
  {/if}
</section>
