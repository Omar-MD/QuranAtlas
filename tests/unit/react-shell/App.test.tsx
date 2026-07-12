import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('retries edition availability through the owned accessible action', () => {
    const onRetryAvailability = vi.fn()
    render(<OnboardingRoute onRetryAvailability={onRetryAvailability} setup={{ status: 'availability-error', mushafEditionId: 'qalun-furatiyyah-2023-v1' }} />)

    expect(screen.getByRole('status')).toHaveTextContent('Could not check Mushaf edition availability')
    fireEvent.click(screen.getByRole('button', { name: 'Retry edition availability' }))

    expect(onRetryAvailability).toHaveBeenCalledOnce()
  })

  it('retains the selected edition and deep link when setup persistence fails, then retries successfully', async () => {
    let resolveRetry: (() => void) | undefined
    const writeSelection = vi.fn()
      .mockRejectedValueOnce(new Error('IndexedDB transaction rejected'))
      .mockImplementationOnce(() => new Promise<void>((resolve) => { resolveRetry = resolve }))
    const onComplete = vi.fn()
    render(
      <OnboardingRoute
        onComplete={onComplete}
        pendingHash="#/m/42"
        setup={{
          status: 'choose',
          editions: [{ id: 'qalun-furatiyyah-2023-v1', label: 'Qalun Furatiyyah 2023' }],
        }}
        writeSelection={writeSelection}
      />,
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Could not save Mushaf setup')
    expect(onComplete).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Retry Mushaf setup' }))
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    resolveRetry?.()

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('#/m/42'))
    expect(writeSelection).toHaveBeenNthCalledWith(1, 'qalun-furatiyyah-2023-v1')
    expect(writeSelection).toHaveBeenNthCalledWith(2, 'qalun-furatiyyah-2023-v1')
  })
})
