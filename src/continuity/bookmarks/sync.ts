import type { Riwayah } from '../../storage/types'

export const SYNC_CHANNEL_NAME = 'quran-atlas:sync'
export const BOOKMARKS_TOPIC = 'bookmarks'
const LOCAL_BOOKMARKS_CHANGED_EVENT = 'quranatlas-react-bookmarks-changed'

export type BookmarkSyncPayload = {
  riwayah: Riwayah
  verseKeys: string[]
}

export type BookmarkSyncMessage = {
  payload: BookmarkSyncPayload
  topic: typeof BOOKMARKS_TOPIC
}

const BOOKMARK_KEY_RE = /^(?:\d+:\d+|m:\d+)$/

function isRiwayah(value: unknown): value is Riwayah {
  return value === 'qaloon'
}

function normalizeVerseKeys(value: unknown): string[] | null {
  const verseKeys = Array.isArray(value) ? value : typeof value === 'string' ? [value] : null
  if (!verseKeys) return null
  const normalized = verseKeys.filter((verseKey): verseKey is string => typeof verseKey === 'string' && BOOKMARK_KEY_RE.test(verseKey))
  return normalized.length > 0 ? normalized : null
}

function normalizeMessage(value: unknown): BookmarkSyncPayload | null {
  if (!value || typeof value !== 'object') return null
  const message = value as {
    payload?: { riwayah?: unknown; verseKey?: unknown; verseKeys?: unknown }
    riwayah?: unknown
    topic?: unknown
    type?: unknown
    verseKey?: unknown
    verseKeys?: unknown
  }

  if (message.topic === BOOKMARKS_TOPIC && message.payload) {
    const verseKeys = normalizeVerseKeys(message.payload.verseKeys ?? message.payload.verseKey)
    return isRiwayah(message.payload.riwayah) && verseKeys ? { riwayah: message.payload.riwayah, verseKeys } : null
  }

  if (message.type === 'bookmarks:changed') {
    const verseKeys = normalizeVerseKeys(message.verseKeys ?? message.verseKey)
    return isRiwayah(message.riwayah) && verseKeys ? { riwayah: message.riwayah, verseKeys } : null
  }

  return null
}

export function createBookmarkSyncMessage(verseKeys: string[], riwayah: Riwayah): BookmarkSyncMessage {
  return { payload: { riwayah, verseKeys }, topic: BOOKMARKS_TOPIC }
}

export function broadcastBookmarkChange(verseKeys: string[], riwayah: Riwayah): void {
  const message = createBookmarkSyncMessage(verseKeys, riwayah)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCAL_BOOKMARKS_CHANGED_EVENT, { detail: message }))
  }
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(SYNC_CHANNEL_NAME)
  try {
    channel.postMessage(message)
  } finally {
    channel.close()
  }
}

export function subscribeBookmarkChanges(listener: (payload: BookmarkSyncPayload) => void): () => void {
  const onLocal = (event: Event) => {
    const payload = normalizeMessage((event as CustomEvent<unknown>).detail)
    if (payload) listener(payload)
  }
  window.addEventListener(LOCAL_BOOKMARKS_CHANGED_EVENT, onLocal)

  let channel: BroadcastChannel | null = null
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(SYNC_CHANNEL_NAME)
    channel.onmessage = (event) => {
      const payload = normalizeMessage(event.data)
      if (payload) listener(payload)
    }
  }

  return () => {
    window.removeEventListener(LOCAL_BOOKMARKS_CHANGED_EVENT, onLocal)
    channel?.close()
  }
}
