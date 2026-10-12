import { useSyncExternalStore } from 'react'

// Why outside the panel: the toggle is a global shortcut that has to work while the panel is unmounted.
let uncommittedOnlyWorktrees: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

function setUncommittedOnly(worktreeId: string, on: boolean): void {
  if (uncommittedOnlyWorktrees.has(worktreeId) === on) {
    return
  }
  const next = new Set(uncommittedOnlyWorktrees)
  if (on) {
    next.add(worktreeId)
  } else {
    next.delete(worktreeId)
  }
  uncommittedOnlyWorktrees = next
  for (const listener of listeners) {
    listener()
  }
}

export function isUncommittedOnly(worktreeId: string): boolean {
  return uncommittedOnlyWorktrees.has(worktreeId)
}

export function toggleUncommittedOnly(worktreeId: string): void {
  setUncommittedOnly(worktreeId, !isUncommittedOnly(worktreeId))
}

export function clearUncommittedOnly(worktreeId: string): void {
  setUncommittedOnly(worktreeId, false)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useUncommittedOnly(worktreeId: string | null): boolean {
  const read = (): boolean => (worktreeId ? isUncommittedOnly(worktreeId) : false)
  return useSyncExternalStore(subscribe, read, read)
}
