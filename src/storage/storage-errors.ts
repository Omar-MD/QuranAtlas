export class ReactStorageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'ReactStorageError'
  }
}

export function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
}

export function storageOpenError(error: unknown): ReactStorageError {
  return new ReactStorageError('React storage could not open the existing QuranAtlas database.', error)
}
