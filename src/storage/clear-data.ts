import { stopAndInvalidateOfflinePacks } from '../offline/download/offline-pack-downloader'
import { closeReactDb } from './db'
import { closeNativeReaderDb } from './native-reader-store'
import { QURAN_ATLAS_DB_NAME } from './schema'

export type ClearReactApplicationDataResult = 'cleared' | 'blocked'

export async function clearReactApplicationData(): Promise<ClearReactApplicationDataResult> {
  await stopAndInvalidateOfflinePacks()
  const browserWindow = globalThis.document?.defaultView
  if (browserWindow && !browserWindow.navigator.userAgent.includes('jsdom')) {
    clearStorage(browserWindow.localStorage)
    clearStorage(browserWindow.sessionStorage)
  }
  closeReactDb()
  closeNativeReaderDb()

  if (browserWindow && 'caches' in browserWindow) {
    const names = await browserWindow.caches.keys()
    await Promise.all(names.map((name) => browserWindow.caches.delete(name)))
  }

  await unregisterServiceWorkers(browserWindow)

  return new Promise<ClearReactApplicationDataResult>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(QURAN_ATLAS_DB_NAME)
    request.onsuccess = () => resolve('cleared')
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve('blocked')
  })
}

async function unregisterServiceWorkers(browserWindow: Window | null): Promise<void> {
  try {
    if (!browserWindow || !('serviceWorker' in browserWindow.navigator)) return
    const serviceWorker = browserWindow.navigator.serviceWorker
    if (typeof serviceWorker?.getRegistrations !== 'function') return

    const registrations = await serviceWorker.getRegistrations()
    await Promise.all(
      registrations.map(async (registration) => {
        try {
          await registration.unregister()
        } catch {
          // Service-worker cleanup is best effort and must not block data clearing.
        }
      }),
    )
  } catch {
    // Unsupported or unavailable registration APIs must not block data clearing.
  }
}

function clearStorage(storage: Storage | undefined) {
  if (typeof storage?.clear === 'function') storage.clear()
}
