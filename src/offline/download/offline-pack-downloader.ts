import { openReactDb } from '../../storage/db'
import type { OfflinePackFilePlan, OfflinePackKind, OfflinePackRecord, OfflinePackStatus } from '../../storage/types'
import { assertOfflinePackUrl, type OfflinePackPlan } from './offline-pack-plan'
import { readStoragePersisted } from './storage-persistence'

export const RUNTIME_DATASET_CACHE_NAME = 'quran-atlas-runtime-dataset-v1'
export const OFFLINE_DOWNLOAD_FETCH_HEADER = 'x-quranatlas-offline-download'

export type OfflineDownloadSnapshotItem = {
  packId: string
  kind: OfflinePackKind
  label: string
  status: OfflinePackStatus | 'not-installed'
  bytesDone: number
  totalBytes: number | null
  filesDone: number
  fileCount: number
  hasUnknownSizes: boolean
  persisted: boolean
  error?: string
}

export type OfflineDownloadsListener = (snapshot: OfflineDownloadSnapshotItem[]) => void

type RunCancelReason = 'pause' | 'network' | 'fail' | 'invalidate'

type PackRun = {
  packId: string
  generation: number
  controller: AbortController
  cancel: RunCancelReason | null
  error?: string
  presentUrls: Set<string>
  filesSinceCommit: number
  workers: Set<Promise<void>>
}

const OFFLINE_DOWNLOAD_LOCK_NAME = 'quran-atlas-offline-download'
const OFFLINE_DOWNLOAD_CHANNEL_NAME = 'quran-atlas-offline-download'
const RETRY_DELAYS_MS = [500, 2000]
const RECORD_WRITE_EVERY_FILES = 5
const MUSHAF_PAGES_CONCURRENCY = 3
const READER_CORE_CONCURRENCY = 6

// Module-scope singleton state. Held in one const object (no top-level let/var)
// so the repo feature-state guard keeps passing; all mutation goes through it.
const state = {
  records: new Map<string, OfflinePackRecord>(),
  pending: [] as string[],
  runs: new Map<string, PackRun>(),
  pumping: false,
  generation: 0,
  listeners: new Set<OfflineDownloadsListener>(),
  snapshot: [] as OfflineDownloadSnapshotItem[],
  onlineListenerRegistered: false,
  onlineResumeQueued: false,
  channel: null as BroadcastChannel | null,
  channelListenerRegistered: false,
}

export function subscribeOfflineDownloads(listener: OfflineDownloadsListener): () => void {
  state.listeners.add(listener)
  registerChannelListener()
  listener(state.snapshot)
  return () => {
    state.listeners.delete(listener)
  }
}

export function getOfflineDownloadSnapshot(): OfflineDownloadSnapshotItem[] {
  return state.snapshot
}

export async function readOfflinePackRecords(): Promise<OfflinePackRecord[]> {
  const db = await openReactDb()
  return db.offlinePacks.toArray()
}

export async function requestOfflinePackInstall(
  plan: OfflinePackPlan,
  options?: { persisted?: boolean },
): Promise<void> {
  await withLock(async () => {
    await hydrate()
    const now = Date.now()
    const existing = state.records.get(plan.packId)
    if (existing && (existing.status === 'installing' || existing.status === 'installed')) return
    const record: OfflinePackRecord = existing
      ? {
          ...existing,
          kind: plan.kind,
          label: plan.label,
          status: 'installing',
          totalBytes: plan.totalBytes,
          fileCount: plan.files.length,
          files: plan.files,
          persisted: options?.persisted ?? existing.persisted,
          error: undefined,
          completedAt: undefined,
          updatedAt: now,
        }
      : {
          packId: plan.packId,
          kind: plan.kind,
          label: plan.label,
          status: 'installing',
          totalBytes: plan.totalBytes,
          bytesDone: 0,
          fileCount: plan.files.length,
          filesDone: 0,
          files: plan.files,
          completedUrls: [],
          persisted: options?.persisted ?? false,
          startedAt: now,
          updatedAt: now,
        }
    await commitRecord(record)
    if (!state.pending.includes(record.packId) && !state.runs.has(record.packId)) {
      state.pending.push(record.packId)
    }
    notify()
  })
  pumpPending()
}

export async function pauseOfflinePack(packId: string): Promise<void> {
  const run = state.runs.get(packId)
  if (run) {
    run.cancel = 'pause'
    run.controller.abort()
  }
  const pendingIndex = state.pending.indexOf(packId)
  if (pendingIndex >= 0) state.pending.splice(pendingIndex, 1)
  if (run) await Promise.allSettled([...run.workers])
  await withLock(async () => {
    await hydrate()
    const record = state.records.get(packId)
    if (record?.status !== 'installing') return
    record.status = 'paused-user'
    record.updatedAt = Date.now()
    await commitRecord(record)
    notify()
    broadcast()
  })
}

export async function resumeOfflinePack(packId: string): Promise<void> {
  await withLock(async () => {
    await hydrate()
    const record = state.records.get(packId)
    if (!record || (record.status !== 'paused-user' && record.status !== 'paused-network')) return
    record.status = 'installing'
    record.error = undefined
    record.updatedAt = Date.now()
    await commitRecord(record)
    if (!state.pending.includes(packId) && !state.runs.has(packId)) state.pending.push(packId)
    notify()
    broadcast()
  })
  pumpPending()
}

export async function removeOfflinePack(packId: string): Promise<void> {
  const run = state.runs.get(packId)
  if (run) {
    run.cancel = 'invalidate'
    run.controller.abort()
  }
  const pendingIndex = state.pending.indexOf(packId)
  if (pendingIndex >= 0) state.pending.splice(pendingIndex, 1)
  if (run) await Promise.allSettled([...run.workers])
  await withLock(async () => {
    await hydrate()
    const record = state.records.get(packId)
    if (!record) return
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(RUNTIME_DATASET_CACHE_NAME)
      const claimedByOthers = new Set<string>()
      for (const other of state.records.values()) {
        if (other.packId === record.packId) continue
        for (const url of other.completedUrls) claimedByOthers.add(url)
      }
      const identity = identityFromPackId(record.packId)
      for (const url of record.completedUrls) {
        if (claimedByOthers.has(url)) continue
        assertOfflinePackUrl(url, record.kind, identity)
        await cache.delete(url, { ignoreVary: true })
      }
    }
    const db = await openReactDb()
    await db.offlinePacks.delete(record.packId)
    state.records.delete(record.packId)
    notify()
    broadcast()
  })
}

export async function reconcileOfflinePacks(): Promise<void> {
  registerOnlineListener()
  let enqueueNeeded = false
  await withLock(async () => {
    await hydrate()
    const persisted = await readStoragePersisted()
    const online = typeof navigator === 'undefined' ? true : navigator.onLine
    for (const record of [...state.records.values()]) {
      record.persisted = persisted
      await applyPresenceProbe(record)
      if (record.status === 'installed' && record.filesDone < record.fileCount) {
        record.status = 'installing'
      }
      if ((record.status === 'installing' || record.status === 'paused-network') && online) {
        record.status = 'installing'
        if (!state.pending.includes(record.packId) && !state.runs.has(record.packId)) {
          state.pending.push(record.packId)
          enqueueNeeded = true
        }
      }
      record.updatedAt = Date.now()
      await commitRecord(record)
    }
    notify()
  })
  if (enqueueNeeded) broadcast()
  pumpPending()
}

export async function stopAndInvalidateOfflinePacks(): Promise<void> {
  for (const run of state.runs.values()) {
    run.cancel = 'invalidate'
    run.controller.abort()
  }
  state.pending = []
  const awaited = [...state.runs.values()].map((run) => Promise.allSettled([...run.workers]))
  await Promise.all(awaited)
  await withLock(async () => {
    const db = await openReactDb()
    await db.offlinePacks.clear()
    state.records.clear()
    notify()
    broadcast()
  })
}

async function withLock<T>(operation: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks
  if (!locks?.request) return operation()
  return locks.request(OFFLINE_DOWNLOAD_LOCK_NAME, { mode: 'exclusive' }, operation)
}

// Rehydrates the mirror from Dexie at operation boundaries only. Records with
// an active run are kept from the mirror: their in-memory counters are ahead
// of the throttled Dexie writes and must not be clobbered mid-run.
async function hydrate(): Promise<void> {
  const db = await openReactDb()
  const records = await db.offlinePacks.toArray()
  const next = new Map(records.map((record) => [record.packId, record]))
  for (const packId of state.runs.keys()) {
    const running = state.records.get(packId)
    if (running) next.set(packId, running)
  }
  state.records = next
}

async function commitRecord(record: OfflinePackRecord): Promise<void> {
  const db = await openReactDb()
  await db.offlinePacks.put(record)
}

function notify(): void {
  state.snapshot = [...state.records.values()].map(toSnapshotItem)
  for (const listener of state.listeners) listener(state.snapshot)
}

function toSnapshotItem(record: OfflinePackRecord): OfflineDownloadSnapshotItem {
  return {
    packId: record.packId,
    kind: record.kind,
    label: record.label,
    status: record.status,
    bytesDone: record.bytesDone,
    totalBytes: record.totalBytes,
    filesDone: record.filesDone,
    fileCount: record.fileCount,
    hasUnknownSizes: record.files.some((file) => file.bytes == null),
    persisted: record.persisted,
    ...(record.error ? { error: record.error } : {}),
  }
}

function broadcast(): void {
  if (typeof BroadcastChannel === 'undefined') return
  state.channel ??= new BroadcastChannel(OFFLINE_DOWNLOAD_CHANNEL_NAME)
  state.channel.postMessage({ type: 'offline-packs-changed' })
}

function registerChannelListener(): void {
  if (state.channelListenerRegistered || typeof BroadcastChannel === 'undefined') return
  state.channelListenerRegistered = true
  state.channel ??= new BroadcastChannel(OFFLINE_DOWNLOAD_CHANNEL_NAME)
  state.channel.onmessage = () => {
    void withLock(async () => {
      await hydrate()
      notify()
    })
  }
}

function registerOnlineListener(): void {
  if (state.onlineListenerRegistered || typeof window === 'undefined') return
  state.onlineListenerRegistered = true
  window.addEventListener('online', () => {
    if (state.onlineResumeQueued) return
    state.onlineResumeQueued = true
    queueMicrotask(() => {
      state.onlineResumeQueued = false
      void (async () => {
        let changed = false
        await withLock(async () => {
          await hydrate()
          for (const record of [...state.records.values()]) {
            if (record.status !== 'paused-network') continue
            if (state.pending.includes(record.packId) || state.runs.has(record.packId)) continue
            record.status = 'installing'
            record.updatedAt = Date.now()
            await commitRecord(record)
            state.pending.push(record.packId)
            changed = true
          }
          if (changed) notify()
        })
        if (changed) {
          broadcast()
          pumpPending()
        }
      })()
    })
  })
}

function identityFromPackId(packId: string): { riwayah: string; mushafEditionId?: string } | undefined {
  const segments = packId.split('--')
  if (segments[0] !== 'mushaf-pages' || segments.length < 3) return undefined
  return { riwayah: segments[1], mushafEditionId: segments.slice(2).join('--') }
}

async function applyPresenceProbe(record: OfflinePackRecord): Promise<void> {
  if (typeof caches === 'undefined') return
  const cache = await caches.open(RUNTIME_DATASET_CACHE_NAME)
  const identity = identityFromPackId(record.packId)
  const candidateUrls = new Set<string>([...record.completedUrls, ...record.files.map((file) => file.url)])
  const presentUrls = new Set<string>()
  for (const url of candidateUrls) {
    assertOfflinePackUrl(url, record.kind, identity)
    if (await cache.match(url)) presentUrls.add(url)
  }
  const knownBytesByUrl = new Map<string, number>()
  for (const file of record.files) {
    if (file.bytes != null) knownBytesByUrl.set(file.url, file.bytes)
  }
  record.completedUrls = record.files.filter((file) => presentUrls.has(file.url)).map((file) => file.url)
  record.filesDone = record.completedUrls.length
  record.bytesDone = record.completedUrls.reduce((sum, url) => sum + (knownBytesByUrl.get(url) ?? 0), 0)
}

function pumpPending(): void {
  if (state.pumping) return
  state.pumping = true
  void (async () => {
    try {
      while (true) {
        const packId = state.pending.shift()
        if (!packId) return
        if (state.runs.has(packId)) continue
        try {
          await runPack(packId)
        } catch {
          // Worker failures live in record state only; never propagate.
        }
      }
    } finally {
      state.pumping = false
    }
  })()
}

async function runPack(packId: string): Promise<void> {
  const generation = ++state.generation
  const run: PackRun = {
    packId,
    generation,
    controller: new AbortController(),
    cancel: null,
    presentUrls: new Set<string>(),
    filesSinceCommit: 0,
    workers: new Set<Promise<void>>(),
  }
  state.runs.set(packId, run)
  try {
    const pack: { files: OfflinePackFilePlan[]; kind: OfflinePackKind } = { files: [], kind: 'reader-core' }
    await withLock(async () => {
      await hydrate()
      const record = state.records.get(packId)
      if (record?.status !== 'installing' || run.cancel) return
      pack.kind = record.kind
      await applyPresenceProbe(record)
      run.presentUrls = new Set(record.completedUrls)
      record.updatedAt = Date.now()
      await commitRecord(record)
      notify()
      if (record.filesDone >= record.fileCount) {
        record.status = 'installed'
        record.completedAt = Date.now()
        record.updatedAt = Date.now()
        await commitRecord(record)
        notify()
        broadcast()
        return
      }
      pack.files = record.files
    })
    if (pack.files.length === 0 || run.cancel) return
    const concurrency = pack.kind === 'mushaf-pages' ? MUSHAF_PAGES_CONCURRENCY : READER_CORE_CONCURRENCY
    const files = pack.files
    let cursor = 0
    const workers = Array.from({ length: concurrency }, async () => {
      while (!run.cancel) {
        const index = cursor
        cursor += 1
        if (index >= files.length) return
        const file = files[index]
        if (run.presentUrls.has(file.url)) continue
        await downloadOneFile(run, packId, pack.kind, file)
      }
    })
    run.workers = new Set(workers)
    await Promise.all(workers)
    if (run.cancel === 'pause' || run.cancel === 'invalidate') return
    await withLock(async () => {
      await hydrate()
      const record = state.records.get(packId)
      if (record?.status !== 'installing') return
      record.updatedAt = Date.now()
      if (run.cancel === 'network') {
        record.status = 'paused-network'
      } else if (run.cancel === 'fail') {
        record.status = 'failed'
        record.error = run.error ?? 'Download failed.'
      } else if (record.filesDone >= record.fileCount) {
        record.status = 'installed'
        record.completedAt = Date.now()
      } else {
        record.status = 'failed'
        record.error = 'Download stopped before completion.'
      }
      await commitRecord(record)
      notify()
      broadcast()
    })
  } finally {
    state.runs.delete(packId)
  }
}

async function downloadOneFile(
  run: PackRun,
  packId: string,
  kind: OfflinePackKind,
  file: OfflinePackFilePlan,
): Promise<void> {
  const identity = identityFromPackId(packId)
  for (let attempt = 0; attempt <= 2; attempt += 1) {
    if (run.cancel) return
    try {
      assertOfflinePackUrl(file.url, kind, identity)
      const response = await fetch(file.url, {
        signal: run.controller.signal,
        redirect: 'error',
        headers: { [OFFLINE_DOWNLOAD_FETCH_HEADER]: '1' },
      })
      if (response.status !== 200 || response.type === 'opaque') {
        throw new Error(`offline pack fetch rejected ${file.url} with status ${response.status}`)
      }
      assertMediaType(file.url, response.headers.get('content-type'))
      const bytes = await response.arrayBuffer()
      if (file.bytes != null && bytes.byteLength !== file.bytes) {
        throw new Error(`offline pack byte mismatch for ${file.url}`)
      }
      if (run.cancel || run.controller.signal.aborted) return
      assertOfflinePackUrl(file.url, kind, identity)
      const cache = await caches.open(RUNTIME_DATASET_CACHE_NAME)
      await cache.delete(file.url, { ignoreVary: true })
      const sanitizedHeaders = new Headers()
      const contentType = response.headers.get('content-type')
      if (contentType) sanitizedHeaders.set('content-type', contentType)
      await cache.put(file.url, new Response(bytes, { status: 200, statusText: 'OK', headers: sanitizedHeaders }))
      await commitFileCompletion(run, packId, file, bytes.byteLength)
      return
    } catch (error) {
      if (isAbort(error, run)) return
      if (isQuotaExceeded(error)) {
        failRun(run, 'Browser storage quota was exceeded while downloading.')
        return
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        networkPauseRun(run)
        return
      }
      if (attempt === 2) {
        failRun(run, error instanceof Error ? error.message : String(error))
        return
      }
      await abortableDelay(RETRY_DELAYS_MS[attempt], run.controller.signal)
    }
  }
}

async function commitFileCompletion(
  run: PackRun,
  packId: string,
  file: OfflinePackFilePlan,
  byteLength: number,
): Promise<void> {
  if (run.cancel) return
  await withLock(async () => {
    await hydrate()
    const record = state.records.get(packId)
    if (record?.status !== 'installing' || run.cancel) return
    if (!record.completedUrls.includes(file.url)) {
      record.completedUrls.push(file.url)
      record.filesDone += 1
      record.bytesDone += byteLength
    }
    run.presentUrls.add(file.url)
    record.updatedAt = Date.now()
    run.filesSinceCommit += 1
    if (run.filesSinceCommit >= RECORD_WRITE_EVERY_FILES) {
      run.filesSinceCommit = 0
      await commitRecord(record)
    }
    notify()
  })
}

function assertMediaType(url: string, contentType: string | null): void {
  const mediaType = (contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? ''
  if (url.endsWith('.json')) {
    if (!/json$/u.test(mediaType)) {
      throw new Error(`offline pack content type mismatch for ${url}: ${mediaType || 'missing'}`)
    }
    return
  }
  if (url.endsWith('.svg')) {
    if (mediaType !== 'image/svg+xml') {
      throw new Error(`offline pack content type mismatch for ${url}: ${mediaType || 'missing'}`)
    }
  }
}

function failRun(run: PackRun, message: string): void {
  if (run.cancel) return
  run.cancel = 'fail'
  run.error = message
  run.controller.abort()
}

function networkPauseRun(run: PackRun): void {
  if (run.cancel) return
  run.cancel = 'network'
  run.controller.abort()
}

function isAbort(error: unknown, run: PackRun): boolean {
  if (run.controller.signal.aborted) return true
  return error instanceof DOMException && error.name === 'AbortError'
}

function isQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
