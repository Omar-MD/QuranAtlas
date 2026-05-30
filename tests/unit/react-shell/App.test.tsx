import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../../../src/app/App'

describe('React App shell', () => {
  it('renders the production app shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'QuranAtlas' })).toBeInTheDocument()
    expect(screen.queryByText(/Legacy app remains the shipped default/i)).not.toBeInTheDocument()
  })
})
