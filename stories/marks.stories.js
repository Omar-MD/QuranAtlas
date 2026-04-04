/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Components/Mark Editor',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    hasExistingMark: {
      control: 'boolean',
      description: 'Show existing tags as selected',
    },
  },
  args: {
    hasExistingMark: false,
  },
}

const TAGS = [
  { label: 'Favourite', color: '#f59e0b', emoji: '⭐' },
  { label: 'Study', color: '#3b82f6', emoji: '📖' },
  { label: 'Reflection', color: '#22c55e', emoji: '💭' },
  { label: 'Question', color: '#a855f7', emoji: '❓' },
]

function renderMarkEditor(hasExistingMark) {
  return `
    <div style="width:375px;max-width:100%;background:var(--qa-bg-primary);border-radius:12px 12px 0 0;box-shadow:0 -4px 20px rgba(0,0,0,0.15);overflow:hidden;">
      <!-- Verse preview -->
      <div style="padding:1rem;border-bottom:1px solid var(--qa-border);background:var(--qa-bg-secondary);">
        <div style="font-size:0.75rem;color:var(--qa-text-secondary);margin-bottom:0.5rem;">Marking verse 1:1</div>
        <div style="font-family:'Amiri',serif;font-size:1.25rem;direction:rtl;text-align:right;color:var(--qa-text-primary);margin-bottom:0.5rem;">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>
        <div style="font-size:0.8rem;color:var(--qa-text-secondary);">In the name of God, the Gracious, the Merciful</div>
      </div>

      <!-- Tag grid -->
      <div style="padding:1rem;">
        <div style="font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">Tags</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
          ${TAGS.map(tag => `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;border:2px solid ${hasExistingMark && tag.label === 'Favourite' ? tag.color : 'var(--qa-border)'};border-radius:8px;cursor:pointer;background:${hasExistingMark && tag.label === 'Favourite' ? tag.color + '15' : 'transparent'};">
              <span style="font-size:1rem;">${tag.emoji}</span>
              <span style="font-size:0.875rem;color:var(--qa-text-primary);">${tag.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Actions -->
      <div style="display:flex;gap:0.5rem;padding:1rem;border-top:1px solid var(--qa-border);">
        ${hasExistingMark ? `
          <button style="flex:1;padding:0.5rem;border:1px solid #ef4444;color:#ef4444;background:transparent;border-radius:6px;font-size:0.875rem;cursor:pointer;">Delete</button>
        ` : ''}
        <button style="flex:1;padding:0.5rem;border:none;color:var(--qa-bg-primary);background:var(--qa-accent);border-radius:6px;font-size:0.875rem;cursor:pointer;">Save</button>
      </div>
    </div>
  `
}

/** New mark — no tags selected */
export const NewMark = {
  args: { hasExistingMark: false },
  render: (args) => renderMarkEditor(args.hasExistingMark),
}

/** Existing mark — Favourite tag selected */
export const ExistingMark = {
  args: { hasExistingMark: true },
  render: (args) => renderMarkEditor(args.hasExistingMark),
}
