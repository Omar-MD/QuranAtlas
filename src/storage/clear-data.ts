import { closeReactDb } from './db'
import { closeNativeReaderDb } from './native-reader-store'
import { QURAN_ATLAS_DB_NAME } from './schema'

export async function clearReactApplicationData() {
  const browserWindow = globalThis.document?.defaultView
  if (browserWindow && !browserWindow.navigator.userAgent.includes('jsdom')) {
    clearStorage(browserWindow.localStorage)
    clearStorage(browserWindow.sessionStorage)
  }
  closeReactDb()
  closeNativeReaderDb()

  if ('caches' in window) {
    const names = await window.caches.keys()
    await Promise.all(names.map((name) => window.caches.delete(name)))
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(QURAN_ATLAS_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}

function clearStorage(storage: Storage | undefined) {
  if (typeof storage?.clear === 'function') storage.clear()
}
