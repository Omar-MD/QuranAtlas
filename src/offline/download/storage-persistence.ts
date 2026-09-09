export async function ensureStoragePersistence(): Promise<boolean> {
  try {
    const storage = navigator.storage
    if (!storage) return false
    if (storage.persisted && (await storage.persisted())) return true
    if (storage.persist) return await storage.persist()
    return false
  } catch {
    return false
  }
}

export async function readStoragePersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}
