import type { Meta, StoryObj } from '@storybook/react-vite'

import { AssetManagementPage } from './AssetManagementPage'

const meta = {
  title: 'React Configure/Wave 3 Assets',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj

export const Assets: Story = {
  render: () => <AssetManagementPage />,
}
