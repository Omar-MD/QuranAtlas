import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../../../src-react/app/App'

describe('React App shell', () => {
  it('renders the isolated preview shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'QuranAtlas' })).toBeInTheDocument()
    expect(screen.getByText(/Svelte app remains the shipped default/i)).toBeInTheDocument()
  })
})
