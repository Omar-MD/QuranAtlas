import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

const showClearDataConfirmationMock = vi.fn(async () => true)

vi.mock('../../../../src/a11y/announcer.js', () => ({
  announce: vi.fn(),
}))

vi.mock('../../../../src/configure/about/pwa-install', () => ({
  getInstallPrompt: vi.fn(() => null),
  promptInstall: vi.fn(async () => 'dismissed'),
}))

vi.mock('../../../../src/configure/clear-data', () => ({
  showClearDataConfirmation: (...args: unknown[]) => showClearDataConfirmationMock(...args),
}))

import About from '../../../../src/configure/about/About.svelte'

describe('About.svelte', () => {
  it('renders reader-first copy without legacy marks or tags stats', async () => {
    render(About)

    expect(await screen.findByRole('heading', { name: 'QuranAtlas' })).toBeInTheDocument()
    expect(screen.getByText(/Qalun riwayat/i)).toBeInTheDocument()
    expect(screen.queryByText(/Qaloon/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Marks')).not.toBeInTheDocument()
    expect(screen.queryByText('Tags')).not.toBeInTheDocument()
  })

  it('keeps the clear-data action wired from About', async () => {
    render(About)

    await fireEvent.click(screen.getByRole('button', { name: /clear all data/i }))

    expect(showClearDataConfirmationMock).toHaveBeenCalledTimes(1)
  })
})
