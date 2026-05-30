import type { Meta, StoryObj } from '@storybook/react-vite'

import { SearchPage } from './SearchPage'

const meta = {
  title: 'React Search/Search',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => <SearchPage />,
}
