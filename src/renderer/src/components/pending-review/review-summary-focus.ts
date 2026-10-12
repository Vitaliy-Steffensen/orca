import { useEffect, useSyncExternalStore, type RefObject } from 'react'

// Why a request and not a direct focus: a collapsed Review section has no editor to focus yet.
const mountedSummaries = new Map<string, number>()
const focusRequestedWorktrees = new Set<string>()
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function registerReviewSummary(worktreeId: string): () => void {
  mountedSummaries.set(worktreeId, (mountedSummaries.get(worktreeId) ?? 0) + 1)
  return () => {
    const count = (mountedSummaries.get(worktreeId) ?? 1) - 1
    if (count > 0) {
      mountedSummaries.set(worktreeId, count)
    } else {
      mountedSummaries.delete(worktreeId)
    }
  }
}

export function hasReviewSummary(worktreeId: string): boolean {
  return mountedSummaries.has(worktreeId)
}

export function requestReviewSummaryFocus(worktreeId: string): void {
  focusRequestedWorktrees.add(worktreeId)
  notify()
}

export function consumeReviewSummaryFocusRequest(worktreeId: string): boolean {
  const requested = focusRequestedWorktrees.delete(worktreeId)
  if (requested) {
    notify()
  }
  return requested
}

function focusEditableWhenMounted(root: HTMLElement, onFocused: () => void): () => void {
  const tryFocus = (): boolean => {
    const editable = root.querySelector<HTMLElement>('[contenteditable="true"], textarea')
    if (!editable) {
      return false
    }
    editable.focus()
    onFocused()
    return true
  }
  if (tryFocus()) {
    return () => {}
  }
  // Why observe: the TipTap editor mounts its contenteditable after the first render.
  const observer = new MutationObserver(() => {
    if (tryFocus()) {
      observer.disconnect()
    }
  })
  observer.observe(root, { childList: true, subtree: true, attributes: true })
  return () => observer.disconnect()
}

export function useReviewSummaryFocus({
  worktreeId,
  collapsed,
  onExpand,
  composerRef
}: {
  worktreeId: string | null
  collapsed: boolean
  onExpand: () => void
  composerRef: RefObject<HTMLElement | null>
}): void {
  const read = (): boolean => (worktreeId ? focusRequestedWorktrees.has(worktreeId) : false)
  const requested = useSyncExternalStore(subscribe, read, read)
  useEffect(() => (worktreeId ? registerReviewSummary(worktreeId) : undefined), [worktreeId])
  useEffect(() => {
    if (!requested || !worktreeId) {
      return
    }
    if (collapsed) {
      onExpand()
      return
    }
    const root = composerRef.current
    if (!root) {
      return
    }
    return focusEditableWhenMounted(root, () => consumeReviewSummaryFocusRequest(worktreeId))
  }, [collapsed, composerRef, onExpand, requested, worktreeId])
}
