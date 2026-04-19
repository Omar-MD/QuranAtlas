type UndoToastExports = {
  showUndoToast: (opts: {
    verseKey: string
    record: unknown
    onUndo: (rec: unknown) => Promise<void>
    onComplete?: () => void
  }) => void
  clearUndoToast: () => void
  clearUndoRecord: () => void
}

let _instance: UndoToastExports | null = null

export function registerUndoToast(instance: UndoToastExports): void {
  _instance = instance
}

export function showUndoToast(opts: Parameters<UndoToastExports['showUndoToast']>[0]): void {
  _instance?.showUndoToast(opts)
}

export function clearUndoToast(): void {
  _instance?.clearUndoToast()
}

export function clearUndoRecord(): void {
  _instance?.clearUndoRecord()
}
