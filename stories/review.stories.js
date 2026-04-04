/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Pages/Review Hub',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    filter: {
      control: { type: 'select' },
      options: ['all', 'favourite', 'study', 'reflection', 'question'],
      description: 'Filter marks by tag',
    },
  },
  args: {
    filter: 'all',
  },
}

const MOCK_REVIEW_DATA = [
  {
    surah: 'Al-Fatiha',
    verses: [
      { key: '1:1', ar: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', en: 'In the name of God, the Gracious, the Merciful', tags: ['favourite'] },
      { key: '1:5', ar: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', en: 'You alone we worship, and You alone we ask for help', tags: ['study'] },
    ],
  },
  {
    surah: 'Ya-Sin',
    verses: [
      { key: '36:1', ar: 'يسٓ', en: 'Ya, Sin', tags: ['study'] },
    ],
  },
]

const TAG_COLORS = {
  favourite: '#f59e0b',
  study: '#3b82f6',
  reflection: '#22c55e',
  question: '#a855f7',
}

function renderReviewHub(filter) {
  const filteredData = MOCK_REVIEW_DATA.map(surah => ({
    ...surah,
    verses: filter === 'all'
      ? surah.verses
      : surah.verses.filter(v => v.tags.includes(filter)),
  })).filter(surah => surah.verses.length > 0)

  return `
    <div style="min-height:100dvh;background:var(--qa-bg-primary);">
      <!-- Header -->
      <div style="padding:1rem;border-bottom:1px solid var(--qa-border);">
        <h2 style="font-size:1.25rem;color:var(--qa-text-primary);margin:0 0 0.75rem;">Review Marks</h2>
        <!-- Filter chips -->
        <div style="display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:0.25rem;">
          ${['all', 'favourite', 'study', 'reflection', 'question'].map(tag => `
            <button style="padding:0.25rem 0.75rem;border:1px solid ${tag === filter ? TAG_COLORS[tag] || 'var(--qa-accent)' : 'var(--qa-border)'};border-radius:999px;font-size:0.75rem;cursor:pointer;background:${tag === filter ? (TAG_COLORS[tag] || 'var(--qa-accent)') + '20' : 'transparent'};color:${tag === filter ? (TAG_COLORS[tag] || 'var(--qa-accent)') : 'var(--qa-text-secondary)'};white-space:nowrap;text-transform:capitalize;">
              ${tag}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Marks list -->
      <div style="padding:1rem;">
        ${filteredData.length === 0 ? `
          <div style="text-align:center;padding:2rem;color:var(--qa-text-secondary);">No marks found for this filter.</div>
        ` : filteredData.map(surah => `
          <div style="margin-bottom:1.5rem;">
            <h3 style="font-size:0.875rem;color:var(--qa-text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;">${surah.surah}</h3>
            ${surah.verses.map(v => `
              <div style="padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;">
                <div style="font-size:0.7rem;color:var(--qa-text-secondary);margin-bottom:0.25rem;">${v.key}</div>
                <div style="font-family:'Amiri',serif;font-size:1.1rem;direction:rtl;text-align:right;color:var(--qa-text-primary);margin-bottom:0.25rem;">${v.ar}</div>
                <div style="font-size:0.8rem;color:var(--qa-text-secondary);margin-bottom:0.5rem;">${v.en}</div>
                <div style="display:flex;gap:0.25rem;">
                  ${v.tags.map(t => `
                    <span style="padding:0.125rem 0.5rem;background:${TAG_COLORS[t]}20;color:${TAG_COLORS[t]};border-radius:999px;font-size:0.7rem;text-transform:capitalize;">${t}</span>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `
}

/** All marks */
export const AllMarks = {
  args: { filter: 'all' },
  render: (args) => renderReviewHub(args.filter),
}

/** Favourite only */
export const FavouriteOnly = {
  args: { filter: 'favourite' },
  render: (args) => renderReviewHub(args.filter),
}

/** Study only */
export const StudyOnly = {
  args: { filter: 'study' },
  render: (args) => renderReviewHub(args.filter),
}
