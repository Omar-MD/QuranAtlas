// TODO: replace with real init() call once marks/editor.js is implemented
import { getDefaults } from './tags.js'

/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Components/Mark Editor',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    appShell: false,
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

function renderMarkEditor(hasExistingMark) {
  const tags = getDefaults()

  const modal = document.createElement('div')
  modal.className = 'qa-mark-editor'
  modal.style.cssText = 'width:375px;max-width:100%;background:var(--qa-bg-primary);border-radius:12px 12px 0 0;box-shadow:0 -4px 20px rgba(0,0,0,0.15);overflow:hidden;'

  // Verse preview
  const preview = document.createElement('div')
  preview.style.cssText = 'padding:1rem;border-bottom:1px solid var(--qa-border);background:var(--qa-bg-secondary);'

  const label = document.createElement('div')
  label.style.cssText = 'font-size:0.75rem;color:var(--qa-text-secondary);margin-bottom:0.5rem;'
  label.textContent = 'Marking verse 1:1'

  const arabicPreview = document.createElement('div')
  arabicPreview.className = 'qa-verse-arabic'
  arabicPreview.style.cssText = 'font-size:1.25rem;margin-bottom:0.5rem;'
  arabicPreview.textContent = '\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064E\u0647\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0640\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650'

  const enPreview = document.createElement('div')
  enPreview.style.cssText = 'font-size:0.8rem;color:var(--qa-text-secondary);'
  enPreview.textContent = 'In the name of God, the Gracious, the Merciful'

  preview.appendChild(label)
  preview.appendChild(arabicPreview)
  preview.appendChild(enPreview)

  // Tag grid
  const tagSection = document.createElement('div')
  tagSection.style.cssText = 'padding:1rem;'

  const tagLabel = document.createElement('div')
  tagLabel.style.cssText = 'font-size:0.75rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;'
  tagLabel.textContent = 'Tags'

  const tagGrid = document.createElement('div')
  tagGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;'

  tags.forEach(tag => {
    const isSelected = hasExistingMark && tag.label === 'favourite'
    const chip = document.createElement('div')
    chip.style.cssText = `display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.75rem;border:2px solid ${isSelected ? tag.color : 'var(--qa-border)'};border-radius:8px;cursor:pointer;background:${isSelected ? tag.color + '15' : 'transparent'};`

    const dot = document.createElement('span')
    dot.style.cssText = `width:12px;height:12px;border-radius:50%;background:${tag.color};`

    const name = document.createElement('span')
    name.style.cssText = 'font-size:0.875rem;color:var(--qa-text-primary);text-transform:capitalize;'
    name.textContent = tag.label

    chip.appendChild(dot)
    chip.appendChild(name)
    tagGrid.appendChild(chip)
  })

  tagSection.appendChild(tagLabel)
  tagSection.appendChild(tagGrid)

  // Actions
  const actions = document.createElement('div')
  actions.style.cssText = 'display:flex;gap:0.5rem;padding:1rem;border-top:1px solid var(--qa-border);'

  if (hasExistingMark) {
    const deleteBtn = document.createElement('button')
    deleteBtn.style.cssText = 'flex:1;padding:0.5rem;border:1px solid #ef4444;color:#ef4444;background:transparent;border-radius:6px;font-size:0.875rem;cursor:pointer;'
    deleteBtn.textContent = 'Delete'
    actions.appendChild(deleteBtn)
  }

  const saveBtn = document.createElement('button')
  saveBtn.style.cssText = 'flex:1;padding:0.5rem;border:none;color:var(--qa-bg-primary);background:var(--qa-accent);border-radius:6px;font-size:0.875rem;cursor:pointer;'
  saveBtn.textContent = 'Save'
  actions.appendChild(saveBtn)

  modal.appendChild(preview)
  modal.appendChild(tagSection)
  modal.appendChild(actions)

  return modal
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
