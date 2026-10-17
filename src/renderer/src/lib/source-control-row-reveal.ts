import { useSyncExternalStore } from 'react'
import { REVEAL_FLASH_DURATION_MS } from './reveal-flash-class'

/**
 * `view.revealActiveFile` landing in the Source Control panel.
 *
 * Why a module registry rather than props or store state: the row's section and ancestor
 * directories are component-local state in the panel, and the flash has to reach leaf rows under
 * three separate list components — a prop drill from the panel to every row for a value that is
 * null almost always. Mirrors pr-comment-reveal.ts, which reveals a comment row the same way.
 */
export type SourceControlRowReveal = {
  worktreeId: string
  rowKey: string
  requestId: number
}

let current: SourceControlRowReveal | null = null
let flashTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getCurrent(): SourceControlRowReveal | null {
  return current
}

export function requestSourceControlRowReveal(worktreeId: string, rowKey: string): void {
  current = { worktreeId, rowKey, requestId: Date.now() }
  if (flashTimer) {
    clearTimeout(flashTimer)
  }
  // Why the request outlives the flash only as far as the flash: the lists latch on requestId, so
  // leaving it set would re-scroll a row the user has since scrolled away from on any re-render.
  flashTimer = setTimeout(() => {
    current = null
    flashTimer = null
    emit()
  }, REVEAL_FLASH_DURATION_MS)
  emit()
}

export function useSourceControlRowReveal(
  worktreeId: string | null
): SourceControlRowReveal | null {
  const reveal = useSyncExternalStore(subscribe, getCurrent, getCurrent)
  return reveal && reveal.worktreeId === worktreeId ? reveal : null
}

export function useSourceControlRowRevealFlash(rowKey: string): boolean {
  return useSyncExternalStore(subscribe, getCurrent, getCurrent)?.rowKey === rowKey
}

/** Busts the virtualized list's per-row scroll latch, but only for the row being revealed. */
export function useSourceControlRowRevealRequestId(rowKey: string | null): number | undefined {
  const reveal = useSyncExternalStore(subscribe, getCurrent, getCurrent)
  return reveal && reveal.rowKey === rowKey ? reveal.requestId : undefined
}
