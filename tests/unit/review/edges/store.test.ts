import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { createEdge, getById, getByVerse, deleteEdge, updateEdge } from '../../../../src/review/edges/store'

beforeEach(async () => {
  const { deleteDB, openDB } = await import('../../../../src/core/db')
  try { await deleteDB() } catch { /* ignore */ }
  await openDB()
})

describe('edges/store', () => {
  it('creates an edge with computed _canonKind and inferred directed flag', async () => {
    const edge = await createEdge('2:255', '20:98', 'Parallel')
    expect(edge.kind).toBe('Parallel')
    expect(edge._canonKind).toBe('parallel')
    expect(edge.directed).toBe(false)
    expect(edge.id.length).toBeGreaterThan(0)
  })

  it('override directed flag via opts', async () => {
    const edge = await createEdge('1:1', '1:2', 'parallel', { directed: true })
    expect(edge.directed).toBe(true)
  })

  it('getByVerse returns edges where verse is from OR to', async () => {
    const e1 = await createEdge('2:255', '20:98', 'parallel')
    const e2 = await createEdge('20:98', '28:7', 'same-story')
    const byA = await getByVerse('2:255')
    expect(byA.map(e => e.id)).toEqual([e1.id])
    const byB = await getByVerse('20:98')
    expect(new Set(byB.map(e => e.id))).toEqual(new Set([e1.id, e2.id]))
  })

  it('updateEdge recomputes _canonKind on kind change', async () => {
    const e = await createEdge('1:1', '1:2', 'parallel')
    await updateEdge(e.id, { kind: 'Explains' })
    const refreshed = await getById(e.id)
    expect(refreshed?._canonKind).toBe('explains')
    expect(refreshed?.directed).toBe(true)
  })

  it('rejects bad verseKey pattern', async () => {
    await expect(createEdge('not-a-key', '1:1', 'parallel')).rejects.toThrow()
  })

  it('delete removes record', async () => {
    const e = await createEdge('1:1', '1:2', 'parallel')
    await deleteEdge(e.id)
    expect(await getById(e.id)).toBeUndefined()
  })
})
