import { SURAHS } from './mock-data.js'

/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Components/Nav Panel',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    showSearch: {
      control: 'boolean',
      description: 'Show search input',
    },
  },
  args: {
    showSearch: true,
  },
}

function renderNavPanel(showSearch) {
  return `
    <div style="position:fixed;top:0;left:0;width:85%;max-width:320px;height:100dvh;background:var(--qa-bg-primary);border-right:1px solid var(--qa-border);box-shadow:2px 0 8px rgba(0,0,0,0.1);z-index:200;overflow-y:auto;">
      ${showSearch ? `
        <div style="padding:1rem;border-bottom:1px solid var(--qa-border);">
          <input type="search" placeholder="Search surah or verse" style="width:100%;padding:0.5rem;border:1px solid var(--qa-border);border-radius:4px;background:var(--qa-bg-secondary);color:var(--qa-text-primary);font-size:0.875rem;">
        </div>
      ` : ''}
      <ul style="list-style:none;padding:0;margin:0;">
        ${SURAHS.map(s => `
          <li style="display:flex;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--qa-border);cursor:pointer;" data-surah="${s.n}">
            <span style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:var(--qa-bg-secondary);border-radius:4px;font-size:0.75rem;color:var(--qa-text-secondary);margin-right:0.75rem;">${s.n}</span>
            <div style="flex:1;">
              <div style="font-size:0.875rem;color:var(--qa-text-primary);">${s.name}</div>
              <div style="font-size:0.75rem;color:var(--qa-text-secondary);">${s.count} verses · ${s.type}</div>
            </div>
            <span style="font-family:'Amiri',serif;font-size:1.1rem;color:var(--qa-text-secondary);direction:rtl;">${s.arabic}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `
}

/** Default — nav panel with search */
export const Default = {
  args: { showSearch: true },
  render: (args) => renderNavPanel(args.showSearch),
}

/** Without search */
export const WithoutSearch = {
  args: { showSearch: false },
  render: (args) => renderNavPanel(args.showSearch),
}
