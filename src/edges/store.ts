import { getDb } from '../core/db'
import { emit } from '../core/events'
import { Events } from '../core/constants'
import { logger } from '../core/logger'
import { inferDirectedFromKind } from './kinds'
import { broadcastEdgeChange } from '../safety/sync'
import type { EdgeRecord } from '../core/db'

const VERSE_KEY_RE = /^\d+:\d+(-\d+)?$/

function validateVerseKey(key: string): void {
  if (!VERSE_KEY_RE.test(key)) {
    throw new Error(`invalid verseKey (or range): ${key}`)
  }
}

/**
 * Normalize an edge kind to its canonical form.
 * Uses simple lowercase + trim — edge kinds are ASCII, not Arabic tags.
 * Preserves hyphens (e.g. 'same-story' stays 'same-story').
 */
function normalizeKind(kind: string): string {
  return kind.trim().toLowerCase()
}

function uuid(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `e_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export interface CreateEdgeOpts {
  directed?: boolean
  note?: string
}

export async function createEdge(
  from: string,
  to: string,
  kind: string,
  opts: CreateEdgeOpts = {},
): Promise<EdgeRecord> {
  try {
    validateVerseKey(from)
    validateVerseKey(to)
    const _canonKind = normalizeKind(kind)
    const now = Date.now()
    const record: EdgeRecord = {
      id: uuid(),
      from, to, kind, _canonKind,
      directed: opts.directed ?? inferDirectedFromKind(_canonKind),
      note: opts.note ?? '',
      createdAt: now,
      updatedAt: now,
    }
    const db = await getDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('edges', 'readwrite')
      const req = tx.objectStore('edges').put(record)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
    emit(Events.EDGES_SAVED, { edgeId: record.id, from, to, kind: record.kind })
    broadcastEdgeChange([record.id])
    return record
  } catch (error) {
    logger.error('Failed to create edge:', { from, to, error })
    emit(Events.EDGES_SAVE_FAILED, { error: (error as Error).message })
    throw error
  }
}

export async function updateEdge(
  id: string,
  patch: Partial<Pick<EdgeRecord, 'kind' | 'directed' | 'note' | 'from' | 'to'>>,
): Promise<void> {
  const existing = await getById(id)
  if (!existing) throw new Error(`edge not found: ${id}`)
  if (patch.from) validateVerseKey(patch.from)
  if (patch.to) validateVerseKey(patch.to)
  const merged: EdgeRecord = { ...existing, ...patch, updatedAt: Date.now() }
  if (patch.kind !== undefined) {
    merged._canonKind = normalizeKind(patch.kind)
    if (patch.directed === undefined) {
      merged.directed = inferDirectedFromKind(merged._canonKind)
    }
  }
  const db = await getDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('edges', 'readwrite')
    const req = tx.objectStore('edges').put(merged)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  emit(Events.EDGES_SAVED, { edgeId: id, from: merged.from, to: merged.to, kind: merged.kind })
  broadcastEdgeChange([id])
}

export async function deleteEdge(id: string): Promise<void> {
  const db = await getDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('edges', 'readwrite')
    const req = tx.objectStore('edges').delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  emit(Events.EDGES_DELETED, { edgeId: id })
  broadcastEdgeChange([id])
}

export async function getById(id: string): Promise<EdgeRecord | undefined> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('edges', 'readonly')
    const req = tx.objectStore('edges').get(id)
    req.onsuccess = () => resolve(req.result as EdgeRecord | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function getAll(): Promise<EdgeRecord[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('edges', 'readonly')
    const req = tx.objectStore('edges').getAll()
    req.onsuccess = () => resolve(req.result as EdgeRecord[])
    req.onerror = () => reject(req.error)
  })
}

export async function getByVerse(verseKey: string): Promise<EdgeRecord[]> {
  const db = await getDb()
  const out = new Map<string, EdgeRecord>()
  await Promise.all(['by-from', 'by-to'].map(indexName =>
    new Promise<void>((resolve, reject) => {
      const tx = db.transaction('edges', 'readonly')
      const req = tx.objectStore('edges').index(indexName).getAll(verseKey)
      req.onsuccess = () => {
        for (const e of req.result as EdgeRecord[]) { out.set(e.id, e) }
        resolve()
      }
      req.onerror = () => reject(req.error)
    })
  ))
  return [...out.values()]
}

export async function getByKindCanonical(canonKind: string): Promise<EdgeRecord[]> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('edges', 'readonly')
    const req = tx.objectStore('edges').index('by-canon-kind').getAll(canonKind)
    req.onsuccess = () => resolve(req.result as EdgeRecord[])
    req.onerror = () => reject(req.error)
  })
}
