import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { get, openDB, put } from '../../../src/core/db.js'
import { del, getAll, save } from '../../../src/marks/store.js'

const MARK_MUTATION_BUDGET_MS = 200
const POSITION_SAVE_BUDGET_MS = 50
const SETTINGS_READ_BUDGET_MS = 50
const MARKS_REREAD_BUDGET_MS = 300

async function clearStores(storeNames) {
  const db = await openDB()

  await new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite')

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Failed to clear IndexedDB stores'))

    for (const storeName of storeNames) {
      tx.objectStore(storeName).clear()
    }
  })
}

async function measureAsync(work) {
  const start = performance.now()
  const result = await work()
  return {
    elapsed: performance.now() - start,
    result,
  }
}

beforeEach(async () => {
  await openDB()
  await clearStores(['marks', 'positions', 'settings'])
})

describe('IDB operation performance budgets', () => {
  it('mark save completes in under 200ms', async () => {
    const { elapsed } = await measureAsync(() => save('2:255', ['favourite']))

    expect(elapsed).toBeLessThan(MARK_MUTATION_BUDGET_MS)
  })

  it('mark delete completes in under 200ms', async () => {
    await save('2:255', ['favourite'])

    const { elapsed } = await measureAsync(() => del('2:255'))

    expect(elapsed).toBeLessThan(MARK_MUTATION_BUDGET_MS)
  })

  it('position save completes in under 50ms', async () => {
    const { elapsed } = await measureAsync(() => put('positions', {
      id: 's1',
      surah: 1,
      verse: 5,
      savedAt: Date.now(),
    }))

    expect(elapsed).toBeLessThan(POSITION_SAVE_BUDGET_MS)
  })

  it('settings read completes in under 50ms', async () => {
    await put('settings', { key: 'theme', value: 'dark' })

    const { elapsed, result } = await measureAsync(() => get('settings', 'theme'))

    expect(result).toEqual({ key: 'theme', value: 'dark' })
    expect(elapsed).toBeLessThan(SETTINGS_READ_BUDGET_MS)
  })

  it('cross-tab re-read of 30 marks completes in under 300ms', async () => {
    for (let i = 1; i <= 30; i++) {
      await save(`2:${i}`, ['favourite'])
    }

    const { elapsed, result } = await measureAsync(() => getAll())

    expect(result).toHaveLength(30)
    expect(elapsed).toBeLessThan(MARKS_REREAD_BUDGET_MS)
  })
})