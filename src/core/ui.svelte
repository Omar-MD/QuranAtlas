<script lang="ts">
  import { onMount } from 'svelte'
  import { emit } from './events'
  import { UI, Events } from './constants'
  import { undoToastBridge, type UndoToastOpts } from './ui-bridge'

  let visible = $state(false)
  let verseKey = $state('')
  let record: unknown = null
  let onUndoFn: ((rec: unknown) => Promise<void>) | null = null
  let onCompleteFn: (() => void) | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function clear() {
    if (timer) { clearTimeout(timer); timer = null }
    visible = false
    record = null
    onUndoFn = null
    onCompleteFn = null
  }

  function open(opts: UndoToastOpts) {
    clear()
    verseKey = opts.verseKey
    record = opts.record
    onUndoFn = opts.onUndo
    onCompleteFn = opts.onComplete ?? null
    visible = true
    timer = setTimeout(() => {
      clear()
      opts.onComplete?.()
    }, UI.UNDO_TIMEOUT_MS)
  }

  function close() { clear() }
  function clearRecord() { record = null }

  async function handleUndo() {
    if (record && onUndoFn) {
      await onUndoFn(record)
      emit(Events.MARKS_UNDO, { verseKey })
    }
    const cb = onCompleteFn
    clear()
    cb?.()
  }

  onMount(() => {
    undoToastBridge.register({ open, close, isOpen: () => visible, clearRecord })
    return () => { undoToastBridge.unregister() }
  })
</script>

{#if visible}
  <div class="qa-undo-toast" role="status" aria-live="polite">
    <span>Mark {verseKey} deleted.</span>
    <button onclick={handleUndo}>Undo</button>
  </div>
{/if}
