import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { AboutRoute } from '../../../src/app/routes/settings/AboutRoute'

describe('React About route', () => {
  beforeEach(() => {
    window.location.hash = '#/about'
  })

  it('keeps reader chrome navigation available from About', () => {
    render(<AboutRoute />)

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

    const drawer = screen.getByRole('dialog', { name: 'Navigation' })
    expect(within(drawer).getByRole('tab', { name: 'Search' })).toBeInTheDocument()

    fireEvent.click(within(drawer).getByRole('tab', { name: 'Search' }))
    expect(window.location.hash).toBe('#/search')
  })

  it('renders the About content contract without unsupported product claims', () => {
    render(<AboutRoute />)

    const main = screen.getByRole('main', { name: 'About' })
    expect(within(main).getByRole('heading', { name: 'QuranAtlas' })).toBeInTheDocument()
    expect(within(main).getByText('Read, reflect, remember.')).toBeInTheDocument()
    expect(within(main).getByText(/وَلَقَدۡ يَسَّرۡنَا/)).toBeInTheDocument()
    expect(within(main).getByText(/English translation: Bridges/)).toBeInTheDocument()
    expect(within(main).getByTestId('about-version')).toHaveTextContent(/^v.+ · .+/)
    expect(within(main).queryByText(/verified reader, navigation, settings, search, bookmarks, and Daily Wird workflows/i)).not.toBeInTheDocument()
  })

  it('requires exact DELETE confirmation before clearing data', () => {
    render(<AboutRoute />)

    fireEvent.click(screen.getByRole('button', { name: /clear all data/i }))

    const dialog = screen.getByRole('dialog', { name: /clear all data/i })
    const confirm = within(dialog).getByRole('button', { name: 'Clear All Data' })
    expect(confirm).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText(/type DELETE to confirm/i), { target: { value: 'delete' } })
    expect(confirm).toBeDisabled()

    fireEvent.change(within(dialog).getByLabelText(/type DELETE to confirm/i), { target: { value: 'DELETE' } })
    expect(confirm).toBeEnabled()
  })
})
