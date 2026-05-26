import type { Meta, StoryObj } from '@storybook/react-vite'

import { DailyWirdCard } from '../../reader/wird/DailyWirdCard'

const meta = {
  title: 'React Read/Wave 3 Daily Wird',
  component: DailyWirdCard,
} satisfies Meta<typeof DailyWirdCard>

export default meta
type Story = StoryObj<typeof meta>

export const NoPlan: Story = {
  args: {
    counts: [{ n: 1, count: 7 }],
    plan: null,
  },
}
