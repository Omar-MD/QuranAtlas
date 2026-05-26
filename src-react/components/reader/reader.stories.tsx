import type { Meta, StoryObj } from '@storybook/react-vite'

import { MushafRoute } from '../../app/routes/read/MushafRoute'
import { ReaderRoute } from '../../app/routes/read/ReaderRoute'

const meta = {
  title: 'React Reader/Wave 3 Reader',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

export const VerseReader: Story = {
  render: () => <ReaderRoute surah={1} />,
}

export const MushafMissingPack: Story = {
  render: () => <MushafRoute assetState="missing" page={1} />,
}
