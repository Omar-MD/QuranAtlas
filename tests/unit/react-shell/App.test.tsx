import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../../src/app/App'
import { OnboardingRoute } from '../../../src/app/routes/onboarding/OnboardingRoute'
import { closeReactDb, openReactDb } from '../../../src/storage/db'
import { QURAN_ATLAS_DB_NAME } from '../../../src/storage/schema'

async function resetReactDb() {
  closeReactDb()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(QURAN_ATLAS_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}

describe('React App shell', () => {
  afterEach(async () => {
    cleanup()
    await resetReactDb()
  })

  it('renders the production app shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'QuranAtlas' })).toBeInTheDocument()
    expect(screen.queryByText(/Legacy app remains the shipped default/i)).not.toBeInTheDocument()
  })

  it('auto-selects a sole edition, writes setup atomically, and resumes the requested deep link', async () => {
    const onComplete = vi.fn()
    render(
      <OnboardingRoute
        onComplete={onComplete}
        pendingHash="#/m/42"
        setup={{ status: 'choose', editions: [{ id: 'qalun-quran-ws-v1', label: 'Qalun Quran.ws' }] }}
      />,
    )

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('#/m/42'))
    const db = await openReactDb()
    await expect(db.settings.bulkGet(['mushafEditionId', 'mushafEditionSetupVersion'])).resolves.toEqual([
      { key: 'mushafEditionId', value: 'qalun-quran-ws-v1' },
      { key: 'mushafEditionSetupVersion', value: 1 },
    ])
  })

  it('shows recovery instead of reopening selection when a completed edition is unavailable', () => {
    render(<OnboardingRoute setup={{ status: 'missing', mushafEditionId: 'qalun-furatiyyah-2023-v1' }} />)

    expect(screen.getByRole('main', { name: 'Mushaf edition unavailable' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to About' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Mushaf edition' })).not.toBeInTheDocument()
  })
})
