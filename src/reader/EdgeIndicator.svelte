<script lang="ts">
  /**
   * EdgeIndicator — the pair of left/right fixed indicators that briefly flash
   * when a verse number is tapped. They are attached to document.body (fixed
   * positioning) so they are rendered once as global overlays, not per-verse.
   *
   * The component wires the tap listener via a Svelte action on the reader
   * container element, delegating click events from verse number elements.
   */
  import { onMount } from 'svelte'
  import { emit } from '../core/events'
  import { Events } from '../core/constants'

  // Props interface kept empty — EdgeIndicator manages its own document-level listener.
  // The container prop is reserved for future use (e.g. scoped event delegation)
  // but currently unused since the tap listener is document-level.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Props {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _props: Props = $props()

  let edgeL: HTMLElement | null = null
  let edgeR: HTMLElement | null = null
  let edgeFadeTimer: ReturnType<typeof setTimeout> | null = null

  function showEdges(verseEl: HTMLElement) {
    if (!edgeL || !edgeR) { return }
    const rect = verseEl.getBoundingClientRect()
    const centerY = rect.top + rect.height / 2
    edgeL.style.top = `${centerY}px`
    edgeR.style.top = `${centerY}px`
    edgeL.classList.add('qa-edge-indicator--visible')
    edgeR.classList.add('qa-edge-indicator--visible')

    if (edgeFadeTimer) { clearTimeout(edgeFadeTimer) }
    edgeFadeTimer = setTimeout(() => {
      edgeL?.classList.remove('qa-edge-indicator--visible')
      edgeR?.classList.remove('qa-edge-indicator--visible')
      edgeFadeTimer = null
    }, 1600)

    emit(Events.AMBIENT_SURFACE, { reason: 'verse-tap' })
  }

  function handleTap(e: Event) {
    const target = e.target as HTMLElement
    const numEl = target.closest('.qa-verse-number')
    if (!numEl) { return }
    const verseEl = numEl.closest('.qa-verse') as HTMLElement | null
    if (!verseEl) { return }
    showEdges(verseEl)
  }

  onMount(() => {
    // Create the two fixed edge indicator elements
    edgeL = document.createElement('span')
    edgeL.className = 'qa-edge-indicator qa-edge-indicator--left'
    edgeL.setAttribute('aria-hidden', 'true')
    document.body.appendChild(edgeL)

    edgeR = document.createElement('span')
    edgeR.className = 'qa-edge-indicator qa-edge-indicator--right'
    edgeR.setAttribute('aria-hidden', 'true')
    document.body.appendChild(edgeR)

    // Delegate tap events via document (works even as container changes)
    document.addEventListener('click', handleTap, { passive: true })

    return () => {
      if (edgeFadeTimer) { clearTimeout(edgeFadeTimer) }
      document.removeEventListener('click', handleTap)
      edgeL?.parentNode?.removeChild(edgeL)
      edgeR?.parentNode?.removeChild(edgeR)
      edgeL = null
      edgeR = null
    }
  })
</script>

<!-- No visible output — this component manages two fixed DOM nodes on body -->
