import { useCallback, useEffect, useRef, type MouseEvent, type RefObject } from 'react'

/**
 * Focus continuity across row deletions (bookmarks, saved searches): records
 * the deleted row's control index, then — once the re-render triggered by the
 * delete lands — restores focus to the next remaining row's delete control,
 * else the previous one, else the persistent list container.
 */
export function useDeleteFocusRestore(
  listRef: RefObject<HTMLElement | null>,
  reRenderKey: unknown,
): (event: MouseEvent<HTMLButtonElement>) => void {
  const pendingFocusIndexRef = useRef<number | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: reRenderKey is the re-render trigger that consumes the pending focus index
  useEffect(() => {
    const index = pendingFocusIndexRef.current
    if (index == null) return
    pendingFocusIndexRef.current = null
    const deletes = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('.qar-react-nav-row-delete') ?? [])
    const target = deletes[Math.min(index, deletes.length - 1)]
    if (target) target.focus()
    else listRef.current?.focus()
  }, [reRenderKey])

  return useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const buttons = Array.from(listRef.current?.querySelectorAll('.qar-react-nav-row-delete') ?? [])
      pendingFocusIndexRef.current = buttons.indexOf(event.currentTarget)
    },
    [listRef],
  )
}
