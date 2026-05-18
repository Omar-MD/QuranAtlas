<script lang="ts">
  import { settings, type NightMode } from '../state.svelte'
  import { setTheme } from '../theme'
  import { setNightMode } from '../night-mode'

  const themes = [
    { id: 'light', label: 'Light' },
    { id: 'sepia', label: 'Sepia' },
    { id: 'dark', label: 'Dark' },
    { id: 'auto', label: 'Auto' },
  ] as const
  const nightModes: Array<{ id: NightMode; label: string }> = [
    { id: 'off', label: 'Off' },
    { id: 'on', label: 'On' },
    { id: 'auto', label: 'Auto' },
  ]
</script>

<div class="qa-settings-theme-night" aria-label="Theme and night mode">
  <div class="qa-settings-control-group" role="group" aria-label="Theme">
    {#each themes as theme (theme.id)}
      <button
        type="button"
        class="qa-settings-choice"
        class:qa-settings-choice--active={settings.theme === theme.id}
        aria-pressed={settings.theme === theme.id}
        onclick={() => { void setTheme(theme.id) }}
      >
        {theme.label}
      </button>
    {/each}
  </div>
  <div class="qa-settings-control-group" role="group" aria-label="Night mode">
    {#each nightModes as mode (mode.id)}
      <button
        type="button"
        class="qa-settings-choice"
        class:qa-settings-choice--active={settings.nightMode === mode.id}
        aria-pressed={settings.nightMode === mode.id}
        onclick={() => { void setNightMode(mode.id) }}
      >
        {mode.label}
      </button>
    {/each}
  </div>
</div>
