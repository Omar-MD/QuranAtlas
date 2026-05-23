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
  const nightModes: Array<{ id: NightMode; label: string; icon: string }> = [
    { id: 'off', label: 'Off', icon: '☼' },
    { id: 'on', label: 'On', icon: '☾✦' },
    { id: 'auto', label: 'Auto', icon: 'A↺' },
  ]

</script>

<div class="qa-settings-theme-night" aria-label="Theme and night mode">
  <div class="qa-settings-theme-panel">
    <h3 class="qa-settings-theme-night-title qa-settings-row-label">Theme</h3>
    <div class="qa-settings-theme-grid" role="group" aria-label="Theme">
      {#each themes as theme (theme.id)}
        <button
          type="button"
          class="qa-settings-theme-option"
          class:qa-settings-theme-option--active={settings.theme === theme.id}
          aria-pressed={settings.theme === theme.id}
          onclick={() => { void setTheme(theme.id) }}
        >
          <span class="qa-settings-theme-card">
            <span
              class="qa-settings-theme-swatch"
              class:qa-settings-theme-swatch--light={theme.id === 'light'}
              class:qa-settings-theme-swatch--sepia={theme.id === 'sepia'}
              class:qa-settings-theme-swatch--dark={theme.id === 'dark'}
              class:qa-settings-theme-swatch--auto={theme.id === 'auto'}
              aria-hidden="true"
            >
              {#if theme.id === 'auto'}
                <span class="qa-settings-theme-auto-sun">☼</span>
                <span class="qa-settings-theme-auto-moon">☾</span>
              {/if}
            </span>
            {#if settings.theme === theme.id}
              <span class="qa-settings-theme-check" aria-hidden="true">✓</span>
            {/if}
            <span class="qa-settings-theme-option-label">{theme.label}</span>
          </span>
        </button>
      {/each}
    </div>
  </div>

  <div class="qa-settings-night-panel">
    <h3 class="qa-settings-theme-night-title qa-settings-row-label">Night Mode</h3>
    <div class="qa-settings-night-group" role="group" aria-label="Night mode">
      {#each nightModes as mode (mode.id)}
        <button
          type="button"
          class="qa-settings-night-choice"
          class:qa-settings-night-choice--active={settings.nightMode === mode.id}
          aria-pressed={settings.nightMode === mode.id}
          onclick={() => { void setNightMode(mode.id) }}
        >
          <span class="qa-settings-night-choice-icon" aria-hidden="true">{mode.icon}</span>
          <span class="qa-settings-night-choice-label">{mode.label}</span>
        </button>
      {/each}
    </div>
  </div>
</div>
