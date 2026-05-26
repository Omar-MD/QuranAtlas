import type { Meta, StoryObj } from '@storybook/react-vite'

import { MushafRoute } from '../../app/routes/read/MushafRoute'
import type { ReaderCorpusState } from '../../data/reader-corpus'
import type { MushafResolvedPage, ReactInlineMushafSvg } from '../../packs/mushaf-page-asset'
import { MushafPageViewer } from './MushafPageViewer'
import { ReaderVerseSurface } from './ReaderVerseSurface'

const meta = {
  title: 'React Reader/Wave 3 Reader',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

const readyCorpus: ReaderCorpusState = {
  status: 'ready' as const,
  footnotes: {
    '1': 'Qira’at: All except for Asem read it as: King of the Day of Recompense.',
  },
  riwayah: 'qaloon' as const,
  surah: {
    number: 1,
    nameArabic: 'الفَاتِحة',
    nameEnglish: 'Al-Fatihah',
    verseCount: 7,
  },
  translationVisible: true,
  verses: [
    {
      key: '1:1',
      surah: 1,
      verse: 1,
      arabic: 'اِ۬لْحَمْدُ لِلهِ رَبِّ اِ۬لْعَٰلَمِينَ',
      translation: 'All praise be to Allah, Lord of all realms,',
      translationRole: 'identity' as const,
      translationSourceKey: '1:2',
      footnotes: {},
    },
    {
      key: '1:4',
      surah: 1,
      verse: 4,
      arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُۖ',
      translation: 'Master [1] of the Day of Recompense.',
      translationRole: 'identity' as const,
      translationSourceKey: '1:5',
      footnotes: {
        '1': 'Qira’at: All except for Asem read it as: King of the Day of Recompense.',
      },
    },
    {
      key: '1:7',
      surah: 1,
      verse: 7,
      arabic: 'غَيْرِ اِ۬لْمَغْضُوبِ عَلَيْهِمْ وَلَا اَ۬لضَّآلِّينَۖ',
      translation: 'the path of those You have blessed, not those who have incurred wrath, nor those who have gone astray.',
      translationRole: 'primary' as const,
      translationSourceKey: '1:7',
      footnotes: {},
    },
  ],
}

const surahIndex = [
  { n: 1, name: 'Al-Fatihah', name_ar: 'الفَاتِحة', counts: { hafs: 7, warsh: 7, qaloon: 7 } },
  { n: 2, name: 'Al-Baqarah', name_ar: 'البَقَرَة', counts: { hafs: 286, warsh: 285, qaloon: 285 } },
  { n: 114, name: 'An-Nas', name_ar: 'النَّاس', counts: { hafs: 6, warsh: 6, qaloon: 6 } },
]

const sampleMushafPage: MushafResolvedPage = {
  assetUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg',
  firstVerse: { surah: 1, verse: 1 },
  mushafEditionId: 'qalun-quran-ws-v1',
  page: 1,
  pageCount: 604,
  riwayah: 'qaloon',
  riwayahLabel: 'Qalun',
  viewBox: { x: 0, y: 0, width: 120, height: 180 },
  viewBoxText: '0 0 120 180',
}

const sampleMushafSvg: ReactInlineMushafSvg = {
  markup: '<svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg" class="qa-react-mushaf-svg" aria-hidden="true" focusable="false"><rect width="120" height="180" fill="var(--qa-react-mushaf-ground)"/><path d="M14 16h92v148H14z" fill="none" stroke="var(--qa-react-mushaf-ink)"/><path d="M32 42h56M28 60h64M28 78h64M28 96h64M28 114h64M36 132h48" stroke="var(--qa-react-mushaf-ink)" stroke-width="4" stroke-linecap="round"/></svg>',
  viewBox: { x: 0, y: 0, width: 120, height: 180 },
  viewBoxText: '0 0 120 180',
}

export const VerseReader: Story = {
  render: () => <ReaderVerseSurface corpus={readyCorpus} selectedVerseKey="1:4" surahIndex={surahIndex} />,
}

export const VerseReaderLoading: Story = {
  render: () => <ReaderVerseSurface corpus={{ status: 'loading' }} />,
}

export const VerseReaderUnavailable: Story = {
  render: () => <ReaderVerseSurface corpus={{ status: 'unavailable', reason: 'Qalun text pack is not installed.' }} />,
}

export const MushafMissingPack: Story = {
  render: () => <MushafRoute assetState="missing" page={1} />,
}

export const MushafReady: Story = {
  render: () => (
    <MushafPageViewer
      inlineSvg={sampleMushafSvg}
      resolved={sampleMushafPage}
      viewMode="auto"
    />
  ),
}

export const MushafFitPage: Story = {
  render: () => (
    <MushafPageViewer
      inlineSvg={sampleMushafSvg}
      resolved={sampleMushafPage}
      viewMode="page"
    />
  ),
}

export const MushafFitWidth: Story = {
  render: () => (
    <MushafPageViewer
      inlineSvg={sampleMushafSvg}
      resolved={sampleMushafPage}
      viewMode="width"
    />
  ),
}
