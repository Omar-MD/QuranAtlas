import type { Meta, StoryObj } from '@storybook/react-vite'

import { SearchPage } from './SearchPage'

const meta = {
  title: 'React Search/Wave 3 Search',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => <SearchPage />,
}
