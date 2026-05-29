import { closeReactDb } from './db'
import { QURAN_ATLAS_DB_NAME } from './schema'

export async function clearReactApplicationData() {
  if (typeof window.localStorage?.clear === 'function') window.localStorage.clear()
  if (typeof window.sessionStorage?.clear === 'function') window.sessionStorage.clear()
  closeReactDb()

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
