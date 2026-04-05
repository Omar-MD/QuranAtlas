// TODO: replace with real init() call once settings/index.js is implemented

/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Pages/Settings',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

function createToggle(label, isOn) {
  const row = document.createElement('div')
  row.style.cssText = 'padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;'

  const inner = document.createElement('div')
  inner.style.cssText = 'display:flex;justify-content:space-between;align-items:center;'

  const text = document.createElement('span')
  text.style.cssText = 'font-size:0.875rem;color:var(--qa-text-primary);'
  text.textContent = label

  const track = document.createElement('div')
  track.style.cssText = `width:40px;height:24px;background:${isOn ? 'var(--qa-accent)' : 'var(--qa-border)'};border-radius:12px;position:relative;cursor:pointer;`

  const thumb = document.createElement('div')
  thumb.style.cssText = `width:20px;height:20px;background:white;border-radius:50%;position:absolute;top:2px;${isOn ? 'right:2px' : 'left:2px'};`

  track.appendChild(thumb)
  inner.appendChild(text)
  inner.appendChild(track)
  row.appendChild(inner)

  return row
}

function createInfoRow(label, value) {
  const row = document.createElement('div')
  row.style.cssText = 'padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;'

  const inner = document.createElement('div')
  inner.style.cssText = 'display:flex;justify-content:space-between;'

  const labelEl = document.createElement('span')
  labelEl.style.cssText = 'font-size:0.875rem;color:var(--qa-text-primary);'
  labelEl.textContent = label

  const valueEl = document.createElement('span')
  valueEl.style.cssText = 'font-size:0.875rem;color:var(--qa-text-secondary);'
  valueEl.textContent = value

  inner.appendChild(labelEl)
  inner.appendChild(valueEl)
  row.appendChild(inner)

  return row
}

function createSection(title) {
  const heading = document.createElement('h3')
  heading.style.cssText = 'font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;'
  heading.textContent = title
  return heading
}

function renderSettings() {
  const mainContent = document.getElementById('main-content')
  if (!mainContent) { return document.createElement('div') }

  while (mainContent.firstChild) {
    mainContent.removeChild(mainContent.firstChild)
  }

  const container = document.createElement('div')
  container.style.cssText = 'min-height:100dvh;padding:1rem;'

  const pageTitle = document.createElement('h2')
  pageTitle.style.cssText = 'font-size:1.25rem;color:var(--qa-text-primary);margin:0 0 1.5rem;'
  pageTitle.textContent = 'Settings'
  container.appendChild(pageTitle)

  // Appearance section
  const appearance = document.createElement('div')
  appearance.style.cssText = 'margin-bottom:1.5rem;'
  appearance.appendChild(createSection('Appearance'))

  // Theme swatches
  const themeRow = document.createElement('div')
  themeRow.style.cssText = 'padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;'

  const themeLabel = document.createElement('div')
  themeLabel.style.cssText = 'font-size:0.875rem;color:var(--qa-text-primary);margin-bottom:0.5rem;'
  themeLabel.textContent = 'Theme'

  const swatches = document.createElement('div')
  swatches.style.cssText = 'display:flex;gap:0.5rem;'

  const themes = [
    { name: 'light', color: '#ffffff', active: true },
    { name: 'sepia', color: '#f5e6d3', active: false },
    { name: 'dark', color: '#0f0f13', active: false },
  ]

  themes.forEach(t => {
    const swatch = document.createElement('div')
    swatch.style.cssText = `width:32px;height:32px;border-radius:50%;background:${t.color};border:2px solid ${t.active ? 'var(--qa-accent)' : 'transparent'};cursor:pointer;`
    swatch.setAttribute('aria-label', `${t.name} theme`)
    swatches.appendChild(swatch)
  })

  themeRow.appendChild(themeLabel)
  themeRow.appendChild(swatches)
  appearance.appendChild(themeRow)
  appearance.appendChild(createToggle('Show Translation', true))
  container.appendChild(appearance)

  // Reading section
  const reading = document.createElement('div')
  reading.style.cssText = 'margin-bottom:1.5rem;'
  reading.appendChild(createSection('Reading'))
  reading.appendChild(createToggle('Show Mark Indicators', true))
  reading.appendChild(createToggle('Auto-save Position', true))
  container.appendChild(reading)

  // Data section
  const data = document.createElement('div')
  data.style.cssText = 'margin-bottom:1.5rem;'
  data.appendChild(createSection('Data'))
  data.appendChild(createInfoRow('Dataset Version', '1.0.0'))
  data.appendChild(createInfoRow('Marks Count', '4'))

  // Clear data button
  const clearRow = document.createElement('div')
  clearRow.style.cssText = 'padding:0.75rem;margin-top:1rem;'

  const clearBtn = document.createElement('button')
  clearBtn.style.cssText = 'width:100%;padding:0.75rem;border:1px solid #ef4444;color:#ef4444;background:transparent;border-radius:8px;font-size:0.875rem;cursor:pointer;'
  clearBtn.textContent = 'Clear All Data'
  clearBtn.setAttribute('aria-label', 'Clear all data and reset to defaults')

  clearRow.appendChild(clearBtn)
  data.appendChild(clearRow)
  container.appendChild(data)

  // About section
  const about = document.createElement('div')
  about.appendChild(createSection('About'))
  about.appendChild(createInfoRow('App Version', '1.0.0'))
  container.appendChild(about)

  mainContent.appendChild(container)

  return document.getElementById('app-shell')
}

/** Default settings page */
export const Default = {
  render: () => renderSettings(),
}
