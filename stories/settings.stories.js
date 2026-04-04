/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Pages/Settings',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

function renderSettings() {
  return `
    <div style="min-height:100dvh;background:var(--qa-bg-primary);padding:1rem;">
      <h2 style="font-size:1.25rem;color:var(--qa-text-primary);margin:0 0 1.5rem;">Settings</h2>

      <!-- Appearance -->
      <div style="margin-bottom:1.5rem;">
        <h3 style="font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">Appearance</h3>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="font-size:0.875rem;color:var(--qa-text-primary);margin-bottom:0.5rem;">Theme</div>
          <div style="display:flex;gap:0.5rem;">
            <div style="width:32px;height:32px;border-radius:50%;background:#ffffff;border:2px solid var(--qa-accent);"></div>
            <div style="width:32px;height:32px;border-radius:50%;background:#f5e6d3;border:2px solid transparent;"></div>
            <div style="width:32px;height:32px;border-radius:50%;background:#0f0f13;border:2px solid transparent;"></div>
          </div>
        </div>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">Show Translation</span>
            <div style="width:40px;height:24px;background:var(--qa-accent);border-radius:12px;position:relative;">
              <div style="width:20px;height:20px;background:white;border-radius:50%;position:absolute;top:2px;right:2px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reading -->
      <div style="margin-bottom:1.5rem;">
        <h3 style="font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">Reading</h3>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">Show Mark Indicators</span>
            <div style="width:40px;height:24px;background:var(--qa-accent);border-radius:12px;position:relative;">
              <div style="width:20px;height:20px;background:white;border-radius:50%;position:absolute;top:2px;right:2px;"></div>
            </div>
          </div>
        </div>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">Auto-save Position</span>
            <div style="width:40px;height:24px;background:var(--qa-accent);border-radius:12px;position:relative;">
              <div style="width:20px;height:20px;background:white;border-radius:50%;position:absolute;top:2px;right:2px;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data -->
      <div style="margin-bottom:1.5rem;">
        <h3 style="font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">Data</h3>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">Dataset Version</span>
            <span style="font-size:0.875rem;color:var(--qa-text-secondary);">1.0.0</span>
          </div>
        </div>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">Marks Count</span>
            <span style="font-size:0.875rem;color:var(--qa-text-secondary);">4</span>
          </div>
        </div>
      </div>

      <!-- About -->
      <div>
        <h3 style="font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">About</h3>

        <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:0.875rem;color:var(--qa-text-primary);">App Version</span>
            <span style="font-size:0.875rem;color:var(--qa-text-secondary);">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  `
}

/** Default settings page */
export const Default = {
  render: () => renderSettings(),
}
