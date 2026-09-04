import { useCallback, useEffect, useRef, useState, type JSX, type RefObject } from 'react'

import {
  applyMushafBoundaryResistance,
  decideMushafSettle,
  mushafDirectionForDelta,
  mushafRecentVelocity,
  resolveMushafGestureAxis,
  type MushafGestureAxis,
  type MushafGesturePoint,
  type MushafPageDirection,
} from './mushaf-gesture'

export type MushafGesturePhase = 'idle' | 'tracking' | 'horizontal' | 'settling'

type ActivePointer = {
  axis: MushafGestureAxis
  captured: boolean
  deltaX: number
  pointerId: number
  requestedDirections: Set<MushafPageDirection>
  samples: MushafGesturePoint[]
  stage: HTMLElement
  startScrollTop: number
  startX: number
  startY: number
  width: number
}

type MushafPageGestureOptions = {
  canNavigate: (direction: MushafPageDirection) => boolean
  disabled: boolean
  onCommit: (direction: MushafPageDirection) => void
  onRequestDestination: (direction: MushafPageDirection) => void
  onTap: (clientX: number, stage: HTMLElement) => void
  stageRef: RefObject<HTMLElement | null>
}

type MushafStageHandlers = Pick<JSX.IntrinsicElements['div'],
  'onLostPointerCapture' | 'onPointerCancel' | 'onPointerDown' | 'onPointerMove' | 'onPointerUp'>

const CLICK_SUPPRESSION_MS = 600
const SETTLE_FALLBACK_MS = 280
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function useMushafPageGesture(options: MushafPageGestureOptions): {
  cancel: () => void
  dragX: number
  finishSettle: () => void
  phase: MushafGesturePhase
  shouldSuppressClick: () => boolean
  stageHandlers: MushafStageHandlers
} {
  const optionsRef = useRef(options)
  optionsRef.current = options

  const activePointerRef = useRef<ActivePointer | null>(null)
  const pendingCommitRef = useRef<MushafPageDirection | null>(null)
  const phaseRef = useRef<MushafGesturePhase>('idle')
  const settleFrameRef = useRef<number | null>(null)
  const settleTimerRef = useRef<number | null>(null)
  const suppressClickUntilRef = useRef(0)
  const [dragX, setDragX] = useState(0)
  const [phase, setPhase] = useState<MushafGesturePhase>('idle')

  const updatePhase = useCallback((nextPhase: MushafGesturePhase) => {
    phaseRef.current = nextPhase
    setPhase(nextPhase)
  }, [])

  const clearSettleCompletion = useCallback(() => {
    if (settleFrameRef.current !== null) {
      window.cancelAnimationFrame(settleFrameRef.current)
      settleFrameRef.current = null
    }
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
  }, [])

  const releasePointer = useCallback((pointer: ActivePointer | null) => {
    if (!pointer?.captured) return
    try {
      pointer.stage.releasePointerCapture?.(pointer.pointerId)
    } catch {
      // Pointer capture can already be gone after a native cancellation.
    }
  }, [])

  const cancel = useCallback(() => {
    const pointer = activePointerRef.current
    activePointerRef.current = null
    pendingCommitRef.current = null
    clearSettleCompletion()
    releasePointer(pointer)
    setDragX(0)
    updatePhase('idle')
  }, [clearSettleCompletion, releasePointer, updatePhase])

  const finishSettle = useCallback(() => {
    if (phaseRef.current !== 'settling') return
    const direction = pendingCommitRef.current
    pendingCommitRef.current = null
    clearSettleCompletion()
    setDragX(0)
    updatePhase('idle')
    if (direction) optionsRef.current.onCommit(direction)
  }, [clearSettleCompletion, updatePhase])

  const suppressCompatibilityClick = useCallback(() => {
    suppressClickUntilRef.current = Date.now() + CLICK_SUPPRESSION_MS
  }, [])

  const settle = useCallback((direction: MushafPageDirection | null, width: number) => {
    pendingCommitRef.current = direction
    updatePhase('settling')
    clearSettleCompletion()

    if (window.matchMedia?.(REDUCED_MOTION_QUERY).matches) {
      setDragX(0)
      settleFrameRef.current = window.requestAnimationFrame(finishSettle)
      return
    }

    setDragX(direction === 'next' ? width : direction === 'previous' ? -width : 0)
    settleTimerRef.current = window.setTimeout(finishSettle, SETTLE_FALLBACK_MS)
  }, [clearSettleCompletion, finishSettle, updatePhase])

  const shouldSuppressClick = useCallback(() => Date.now() < suppressClickUntilRef.current, [])

  const stageHandlers: MushafStageHandlers = {
    onLostPointerCapture(event) {
      if (activePointerRef.current?.pointerId === event.pointerId) cancel()
    },
    onPointerCancel(event) {
      if (activePointerRef.current?.pointerId === event.pointerId) cancel()
    },
    onPointerDown(event) {
      if (optionsRef.current.disabled || phaseRef.current !== 'idle') return
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
      if (isInteractiveTarget(event.target)) return

      const stage = optionsRef.current.stageRef.current ?? event.currentTarget
      activePointerRef.current = {
        axis: 'pending',
        captured: false,
        deltaX: 0,
        pointerId: event.pointerId,
        requestedDirections: new Set(),
        samples: [{ at: event.timeStamp, x: event.clientX }],
        stage,
        startScrollTop: stage.scrollTop,
        startX: event.clientX,
        startY: event.clientY,
        width: Math.max(1, stage.getBoundingClientRect().width),
      }
      updatePhase('tracking')
    },
    onPointerMove(event) {
      const pointer = activePointerRef.current
      if (!pointer || pointer.pointerId !== event.pointerId) return

      const deltaX = event.clientX - pointer.startX
      const deltaY = event.clientY - pointer.startY
      pointer.samples.push({ at: event.timeStamp, x: event.clientX })

      if (pointer.axis === 'pending') {
        pointer.axis = resolveMushafGestureAxis(deltaX, deltaY)
        if (pointer.axis === 'pending') return
        if (pointer.axis === 'vertical') {
          suppressCompatibilityClick()
          activePointerRef.current = null
          updatePhase('idle')
          return
        }

        pointer.captured = true
        pointer.stage.setPointerCapture?.(pointer.pointerId)
        suppressCompatibilityClick()
        updatePhase('horizontal')
      }

      event.preventDefault()
      pointer.deltaX = deltaX
      const direction = mushafDirectionForDelta(deltaX)
      const destinationReady = optionsRef.current.canNavigate(direction)
      if (!destinationReady && !pointer.requestedDirections.has(direction)) {
        pointer.requestedDirections.add(direction)
        optionsRef.current.onRequestDestination(direction)
      }
      setDragX(destinationReady ? deltaX : applyMushafBoundaryResistance(deltaX))
    },
    onPointerUp(event) {
      const pointer = activePointerRef.current
      if (!pointer || pointer.pointerId !== event.pointerId) return
      activePointerRef.current = null

      if (pointer.axis !== 'horizontal') {
        if (pointer.stage.scrollTop !== pointer.startScrollTop) {
          suppressCompatibilityClick()
        } else if (pointer.axis === 'pending') {
          suppressCompatibilityClick()
          optionsRef.current.onTap(event.clientX, pointer.stage)
        }
        updatePhase('idle')
        return
      }

      event.preventDefault()
      pointer.samples.push({ at: event.timeStamp, x: event.clientX })
      pointer.deltaX = event.clientX - pointer.startX
      releasePointer(pointer)
      const direction = mushafDirectionForDelta(pointer.deltaX)
      const decision = decideMushafSettle({
        deltaX: pointer.deltaX,
        destinationReady: optionsRef.current.canNavigate(direction),
        velocityX: mushafRecentVelocity(pointer.samples),
        width: pointer.width,
      })
      settle(decision.outcome === 'commit' ? decision.direction : null, pointer.width)
    },
  }

  useEffect(() => {
    if (options.disabled) cancel()
  }, [cancel, options.disabled])

  useEffect(() => {
    window.addEventListener('resize', cancel)
    window.addEventListener('orientationchange', cancel)
    return () => {
      window.removeEventListener('resize', cancel)
      window.removeEventListener('orientationchange', cancel)
    }
  }, [cancel])

  useEffect(() => cancel, [cancel])

  return { cancel, dragX, finishSettle, phase, shouldSuppressClick, stageHandlers }
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('a, button, input, select, textarea, summary, label, [contenteditable="true"], [role="button"], [role="link"], [role="menuitem"], [role="option"], [role="tab"]') !== null
}
