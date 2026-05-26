import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NavDrawer } from '../../../src-react/components/navigation/NavDrawer'
import { SettingsRoute } from '../../../src-react/app/routes/settings/SettingsRoute'
import { OnboardingRoute } from '../../../src-react/app/routes/onboarding/OnboardingRoute'

describe('React navigation, settings, and onboarding parity', () => {
  it('shows reader mode switch and verse-only source controls in Verse mode', () => {
    render(<NavDrawer open mode="verse" currentLabel="Al-Fatihah" onClose={vi.fn()} onNavigate={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Verse' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Surah' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Juz' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bookmarks' })).toBeInTheDocument()
  })

  it('hides Surah/Juz/Bookmarks source controls in Mushaf mode', () => {
    render(<NavDrawer open mode="mushaf" currentLabel="Page 1" onClose={vi.fn()} onNavigate={vi.fn()} />)
    expect(screen.getByText('Page 1')).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Mushaf view mode' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Auto' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Surah' })).toBeNull()
  })

  it('renders settings and onboarding as compact product flows', () => {
    render(<SettingsRoute />)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Mushaf view mode' })).toBeInTheDocument()
    expect(screen.getByText('Reader assets')).toBeInTheDocument()

    render(<OnboardingRoute />)
    expect(screen.getByRole('heading', { name: /choose riwayah/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /qaloon/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open al-fatihah/i })).toBeNull()
  })
})
