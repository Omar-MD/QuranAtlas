import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/a11y/announcer.js', () => ({
  announce: vi.fn(),
}))

const SUPPRESS_KEY = 'quota-warning-suppressed'

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

async function waitFor(predicate, { timeoutMs = 1000, intervalMs = 10 } = {}) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (predicate()) { return }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error('waitFor timed out')
}

describe('core/quota-banner.js', () => {
  let clear
  let emit
  let del
  let get
  let openDB
  let put
  let quotaBanner

  beforeEach(async () => {
    vi.resetModules()
    ;({ clear, emit } = await import('../../../src/core/events.js'))
    ;({ del, get, openDB, put } = await import('../../../src/core/db.js'))
    quotaBanner = await import('../../../src/core/quota-banner.js')
    clear()
    await openDB()
    try {
      await del('settings', SUPPRESS_KEY)
    } catch {
      // ignore missing records
    }

    document.body.innerHTML = '<div id="app-shell"></div>'
  })

  it('shows a dismissible warning banner and persists suppression when dismissed', async () => {
    quotaBanner.init()

    emit('storage:quota-warning')
    await waitFor(() => document.querySelector('.qa-quota-banner') !== null)

    const banner = document.querySelector('.qa-quota-banner')
    const dismissBtn = document.querySelector('.qa-quota-banner-dismiss')

    expect(banner).not.toBeNull()
    expect(dismissBtn).not.toBeNull()

    dismissBtn.click()
    await waitFor(() => document.querySelector('.qa-quota-banner') === null)

    expect(document.querySelector('.qa-quota-banner')).toBeNull()
    expect(await get('settings', SUPPRESS_KEY)).toEqual({ key: SUPPRESS_KEY, value: true })
  })

  it('does not show the warning banner when the user previously suppressed it', async () => {
    await put('settings', { key: SUPPRESS_KEY, value: true })

    quotaBanner.init()

    emit('storage:quota-warning')
    await flushMicrotasks()

    expect(document.querySelector('.qa-quota-banner')).toBeNull()
  })

  it('does not duplicate the warning banner when one is already visible', async () => {
    quotaBanner.init()

    emit('storage:quota-warning')
    await flushMicrotasks()
    emit('storage:quota-warning')
    await flushMicrotasks()

    expect(document.querySelectorAll('.qa-quota-banner')).toHaveLength(1)
  })

  it('replaces a dismissible warning with a non-dismissible quota exceeded banner', async () => {
    quotaBanner.init()

    emit('storage:quota-warning')
    await flushMicrotasks()
    emit('db:quota-exceeded')

    const banner = document.querySelector('.qa-quota-banner')
    expect(banner).not.toBeNull()
    expect(document.querySelector('.qa-quota-banner-dismiss')).toBeNull()
  })
})