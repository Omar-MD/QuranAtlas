import type { Meta, StoryObj } from '@storybook/react-vite'

import { MetadataLane } from './MetadataLane'

const meta = {
  title: 'React Reader/Metadata',
  component: MetadataLane,
} satisfies Meta<typeof MetadataLane>

export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {
  args: {
    metadata: {
      verseKey: '1:1',
      themes: [{ id: 'mercy', label: 'Mercy' }],
      passageSummary: 'Opening invocation',
    },
  },
}
